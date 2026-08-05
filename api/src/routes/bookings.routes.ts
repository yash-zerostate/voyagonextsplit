import { randomBytes } from "node:crypto";

import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { HttpError } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Booking } from "../models/Booking.js";
import { Destination } from "../models/Destination.js";
import { User } from "../models/User.js";

/** Ordering for the plan gate — a higher plan can book anything a lower one can. */
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };

const createBookingSchema = z.object({
  destinationId: z.string().refine(Types.ObjectId.isValid, "Pick a destination"),
  travellers: z.coerce.number().int().min(1, "At least one traveller").max(9, "Maximum nine"),
  departureDate: z.coerce
    .date()
    .refine((date) => date.getTime() > Date.now(), "Departure must be in the future"),
});

function reference(): string {
  return `VY-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export const bookingsRouter = Router();

// Everything below this line requires a signed-in traveller.
bookingsRouter.use(requireAuth);

bookingsRouter.get("/", async (req, res) => {
  const bookings = await Booking.find({ userId: req.auth!.sub })
    .sort({ departureDate: 1 })
    .populate<{ destinationId: { name: string; country: string; heroEmoji: string; nights: number } }>(
      "destinationId",
      "name country heroEmoji nights",
    )
    .lean();

  res.json({
    bookings: bookings.map((booking) => ({
      id: String(booking._id),
      reference: booking.reference,
      travellers: booking.travellers,
      departureDate: booking.departureDate,
      totalInr: booking.totalInr,
      status: booking.status,
      destination: booking.destinationId
        ? {
            name: booking.destinationId.name,
            country: booking.destinationId.country,
            heroEmoji: booking.destinationId.heroEmoji,
            nights: booking.destinationId.nights,
          }
        : null,
    })),
  });
});

bookingsRouter.post("/", validateBody(createBookingSchema), async (req, res) => {
  const { destinationId, travellers, departureDate } = req.body as z.infer<
    typeof createBookingSchema
  >;

  const destination = await Destination.findById(destinationId);
  if (!destination) throw new HttpError(404, "not_found", "That destination no longer exists.");

  // Plan gate and seat count are enforced here, not in the UI — the frontend
  // only hides the button, this is what actually stops the request.
  const user = await User.findById(req.auth!.sub);
  if (!user) throw new HttpError(401, "unauthenticated", "Sign in to continue.");

  if (PLAN_RANK[user.plan] < PLAN_RANK[destination.minimumPlan]) {
    throw new HttpError(
      403,
      "plan_required",
      `This itinerary is open to ${destination.minimumPlan} members and above.`,
    );
  }

  if (destination.seatsLeft < travellers) {
    throw new HttpError(409, "sold_out", `Only ${destination.seatsLeft} seats left on this trip.`);
  }

  const totalInr = destination.basePriceInr * travellers;

  const booking = await Booking.create({
    userId: user._id,
    destinationId: destination._id,
    reference: reference(),
    travellers,
    departureDate,
    totalInr,
  });

  destination.seatsLeft -= travellers;
  await destination.save();

  res.status(201).json({
    booking: {
      id: String(booking._id),
      reference: booking.reference,
      travellers: booking.travellers,
      departureDate: booking.departureDate,
      totalInr: booking.totalInr,
      status: booking.status,
      destination: {
        name: destination.name,
        country: destination.country,
        heroEmoji: destination.heroEmoji,
        nights: destination.nights,
      },
    },
  });
});

bookingsRouter.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "invalid_id", "Unknown booking.");

  // Ownership is part of the query — a valid id for someone else's booking
  // simply matches nothing.
  const booking = await Booking.findOne({ _id: id, userId: req.auth!.sub });
  if (!booking) throw new HttpError(404, "not_found", "Booking not found.");
  if (booking.status !== "confirmed") {
    throw new HttpError(409, "not_cancellable", "That booking is not active.");
  }

  booking.status = "cancelled";
  await booking.save();

  await Destination.updateOne(
    { _id: booking.destinationId },
    { $inc: { seatsLeft: booking.travellers } },
  );

  res.json({ ok: true });
});
