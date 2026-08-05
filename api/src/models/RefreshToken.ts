import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

/**
 * Only the SHA-256 hash of a refresh token is stored, and every rotation is
 * recorded, so a replayed token can be detected and its whole family killed.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & { _id: unknown };

export const RefreshToken: Model<RefreshTokenDoc> = model<RefreshTokenDoc>(
  "RefreshToken",
  refreshTokenSchema,
);
