import { Schema, model, type InferSchemaType, type Model } from "mongoose";

export const TIERS = ["explorer", "voyager", "elite"] as const;
export const ROLES = ["traveller", "agent"] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // Excluded from every query unless asked for by name.
    passwordHash: { type: String, required: true, select: false },
    tier: { type: String, enum: TIERS, default: "explorer" },
    role: { type: String, enum: ROLES, default: "traveller" },
    country: { type: String, trim: true, maxlength: 2, default: "IN" },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    lastLoginAt: { type: Date, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: unknown };

export const User: Model<UserDoc> = model<UserDoc>("User", userSchema);

export function publicUser(user: UserDoc) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    tier: user.tier,
    role: user.role,
    country: user.country,
    loyaltyPoints: user.loyaltyPoints,
  };
}
