import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies, setPretaCookie } from "../lib/cookies.js";
import { fakeVerify, hashPassword, verifyPassword } from "../lib/password.js";
import { createPretaContextToken } from "../lib/preta-token.js";
import { issueSession, revokeSession, rotateSession } from "../lib/sessions.js";
import { readAuth, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { User, publicUser } from "../models/User.js";

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

/** No strength rules — any password works in this demo. */
const passwordSchema = z.string().min(1, "Enter a password").max(128, "Password is too long");

/**
 * Sign-up collects the whole profile; only email and password are required and
 * every attribute has a dropdown on the frontend, so accounts covering the
 * whole matrix can be created without touching the database.
 */
const registerSchema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: passwordSchema,
  active: z.enum(["yes", "no"]).optional().default("yes"),
  plan: z.enum(["free", "pro", "enterprise"]).optional().default("free"),
  role: z
    .enum(["developer", "security", "marketing", "compliance"])
    .optional()
    .default("developer"),
  riskScore: z.coerce
    .number()
    .int("Pick a whole number")
    .min(1, "Risk score starts at 1")
    .max(9, "Risk score stops at 9")
    .optional()
    .default(1),
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
  const { email, password, active, plan, role, riskScore } = req.body as z.infer<
    typeof registerSchema
  >;
  // Name is optional; fall back to the email's local part.
  const name = (req.body as z.infer<typeof registerSchema>).name || email.split("@")[0]!;

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
    plan,
    role,
    riskScore,
    // A profile attribute carried in the token, not a login gate.
    active: active === "yes",
    passwordHash: await hashPassword(password),
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

/**
 * Editing your own plan and risk score is a demo affordance — a real product
 * takes those from billing and a scoring service. Here it is the quickest way
 * to flip an account's attributes and watch the plan gate change behaviour.
 */
const profileSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  active: z.enum(["yes", "no"]),
  plan: z.enum(["free", "pro", "enterprise"]),
  role: z.enum(["developer", "security", "marketing", "compliance"]),
  riskScore: z.coerce.number().int().min(1).max(9),
});

authRouter.patch("/me", readAuth, requireAuth, validateBody(profileSchema), async (req, res) => {
  const { name, active, plan, role, riskScore } = req.body as z.infer<typeof profileSchema>;
  const user = await User.findByIdAndUpdate(
    req.auth!.sub,
    { $set: { name, plan, role, riskScore, active: active === "yes" } },
    { new: true },
  );
  if (!user) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Sign in to continue." } });
    return;
  }
  // Re-sign the Preta cookie straight away. Without this the visitor keeps their
  // old attributes for up to a full access-token lifetime, which makes flipping
  // plan or role on this page look like it did nothing.
  setPretaCookie(
    res,
    createPretaContextToken({
      plan: String(user.plan),
      role: String(user.role),
      active: user.active !== false,
      risk_score: user.riskScore,
    }),
  );
  res.json({ user: publicUser(user) });
});

authRouter.get("/me", readAuth, requireAuth, async (req, res) => {
  // Read the live row, not the token claims: a plan change must be visible
  // immediately rather than 15 minutes later.
  const user = await User.findById(req.auth!.sub);
  if (!user) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Sign in to continue." } });
    return;
  }
  res.json({ user: publicUser(user) });
});
