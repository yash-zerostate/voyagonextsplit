import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const destinationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    summary: { type: String, required: true, maxlength: 400 },
    nights: { type: Number, required: true, min: 1, max: 30 },
    basePriceInr: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    heroEmoji: { type: String, default: "🏝️" },
    // Some itineraries only open to paid tiers — a real gate the frontend has to
    // respect and the API actually enforces at booking time.
    minimumTier: { type: String, enum: ["explorer", "voyager", "elite"], default: "explorer" },
    seatsLeft: { type: Number, default: 20, min: 0 },
  },
  { timestamps: true },
);

export type DestinationDoc = InferSchemaType<typeof destinationSchema> & { _id: unknown };

export const Destination: Model<DestinationDoc> = model<DestinationDoc>(
  "Destination",
  destinationSchema,
);
