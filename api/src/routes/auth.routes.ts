import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../lib/cookies.js";
import { fakeVerify, hashPassword, verifyPassword } from "../lib/password.js";
import { issueSession, revokeSession, rotateSession } from "../lib/sessions.js";
import { readAuth, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { User, publicUser } from "../models/User.js";

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[0-9]/, "Password needs a number");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: passwordSchema,
  country: z.string().trim().length(2).toUpperCase().default("IN"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again shortly." } },
});

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, email, password, country } = req.body as z.infer<typeof registerSchema>;

  if (await User.exists({ email })) {
    res.status(409).json({
      error: {
        code: "email_taken",
        message: "That email is already registered.",
        fields: { email: "That email is already registered." },
      },
    });
    return;
  }

  const user = await User.create({
    name,
    email,
    country,
    passwordHash: await hashPassword(password),
    tier: "explorer",
    role: "traveller",
    lastLoginAt: new Date(),
  });

  const tokens = await issueSession(user, { userAgent: req.get("user-agent") ?? "", ip: req.ip });
  setAuthCookies(res, tokens);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    await fakeVerify(); // equalise timing so absent accounts are indistinguishable
    res
      .status(401)
      .json({ error: { code: "invalid_credentials", message: "Email or password is incorrect." } });
    return;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    res.status(423).json({
      error: { code: "account_locked", message: "Too many failed attempts. Try again later." },
    });
    return;
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = (user.failedLoginCount ?? 0) + 1;
    user.failedLoginCount = failed;
    if (failed >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    res
      .status(401)
      .json({ error: { code: "invalid_credentials", message: "Email or password is incorrect." } });
    return;
  }

  user.failedLoginCount = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueSession(user, { userAgent: req.get("user-agent") ?? "", ip: req.ip });
  setAuthCookies(res, tokens);
  res.json({ user: publicUser(user) });
});

authRouter.post("/refresh", authLimiter, async (req, res) => {
  const result = await rotateSession(req.cookies?.[REFRESH_COOKIE], {
    userAgent: req.get("user-agent") ?? "",
    ip: req.ip,
  });

  if (!result.ok) {
    clearAuthCookies(res);
    res.status(401).json({
      error: { code: `refresh_${result.reason}`, message: "Your session has ended. Please sign in." },
    });
    return;
  }

  setAuthCookies(res, result.tokens);
  res.json({ user: publicUser(result.user) });
});

authRouter.post("/logout", async (req, res) => {
  // Revoke first: clearing the cookie without revoking would leave a working
  // token behind for anyone who copied it.
  await revokeSession(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.json({ ok: true });
});

authRouter.get("/me", readAuth, requireAuth, async (req, res) => {
  // Read the live row, not the token claims: a tier upgrade must be visible
  // immediately rather than 15 minutes later.
  const user = await User.findById(req.auth!.sub);
  if (!user) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Sign in to continue." } });
    return;
  }
  res.json({ user: publicUser(user) });
});
