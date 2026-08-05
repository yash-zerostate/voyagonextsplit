import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const bookingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    destinationId: { type: Types.ObjectId, ref: "Destination", required: true },
    reference: { type: String, required: true, unique: true },
    travellers: { type: Number, required: true, min: 1, max: 9 },
    departureDate: { type: Date, required: true },
    totalInr: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
      index: true,
    },
  },
  { timestamps: true },
);

export type BookingDoc = InferSchemaType<typeof bookingSchema> & { _id: unknown };

export const Booking: Model<BookingDoc> = model<BookingDoc>("Booking", bookingSchema);
