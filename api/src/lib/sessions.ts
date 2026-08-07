import { config } from "../config/env.js";
import { createPretaContextToken } from "./preta-token.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User, type UserDoc } from "../models/User.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  newFamilyId,
  signAccessToken,
  type AccessClaims,
} from "./tokens.js";

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  /** Signed Preta context JWT — goes into a readable cookie the loader reads. */
  pretaToken: string | null;
};
export type RequestContext = { userAgent?: string; ip?: string };

/** The attributes Preta targets on, taken straight off the user row. */
function pretaAttributes(user: UserDoc) {
  return {
    plan: String(user.plan),
    role: String(user.role),
    active: user.active !== false,
    risk_score: user.riskScore,
  };
}

function refreshExpiry(): Date {
  return new Date(Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000);
}

function claimsFor(user: UserDoc, familyId: string): AccessClaims {
  return {
    sub: String(user._id),
    email: user.email,
    name: user.name,
    active: user.active !== false,
    plan: user.plan as AccessClaims["plan"],
    role: user.role as AccessClaims["role"],
    riskScore: user.riskScore,
    sid: familyId,
  };
}

export async function issueSession(user: UserDoc, ctx: RequestContext = {}): Promise<IssuedTokens> {
  const familyId = newFamilyId();
  const refreshToken = generateRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    familyId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshExpiry(),
    userAgent: ctx.userAgent ?? "",
    ip: ctx.ip ?? "",
  });

  return {
    accessToken: signAccessToken(claimsFor(user, familyId)),
    refreshToken,
    pretaToken: createPretaContextToken(pretaAttributes(user)),
  };
}

export type RotateResult =
  | { ok: true; tokens: IssuedTokens; user: UserDoc }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "reused" | "revoked" };

/**
 * One-time-use refresh: the presented token is always consumed. Presenting a
 * consumed token means someone has a copy, so the entire family is revoked.
 */
export async function rotateSession(
  presentedToken: string | undefined,
  ctx: RequestContext = {},
): Promise<RotateResult> {
  if (!presentedToken) return { ok: false, reason: "missing" };

  const record = await RefreshToken.findOne({ tokenHash: hashRefreshToken(presentedToken) });
  if (!record) return { ok: false, reason: "invalid" };

  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { familyId: record.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    return { ok: false, reason: "reused" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await RefreshToken.updateOne({ _id: record._id }, { $set: { revokedAt: new Date() } });
    return { ok: false, reason: "expired" };
  }

  const user = await User.findById(record.userId);
  if (!user) {
    await RefreshToken.updateMany({ familyId: record.familyId }, { $set: { revokedAt: new Date() } });
    return { ok: false, reason: "revoked" };
  }

  const nextToken = generateRefreshToken();
  const nextHash = hashRefreshToken(nextToken);

  await RefreshToken.create({
    userId: user._id,
    familyId: record.familyId,
    tokenHash: nextHash,
    expiresAt: refreshExpiry(),
    userAgent: ctx.userAgent ?? record.userAgent,
    ip: ctx.ip ?? record.ip,
  });

  await RefreshToken.updateOne(
    { _id: record._id },
    { $set: { revokedAt: new Date(), replacedByHash: nextHash } },
  );

  return {
    ok: true,
    user,
    tokens: {
      accessToken: signAccessToken(claimsFor(user, record.familyId)),
      refreshToken: nextToken,
      // Re-signed from the LIVE user row, so an attribute changed since login is
      // picked up on the next refresh rather than waiting for a re-login.
      pretaToken: createPretaContextToken(pretaAttributes(user)),
    },
  };
}

export async function revokeSession(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;
  const record = await RefreshToken.findOne({ tokenHash: hashRefreshToken(presentedToken) });
  if (!record) return;
  await RefreshToken.updateMany(
    { familyId: record.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}
