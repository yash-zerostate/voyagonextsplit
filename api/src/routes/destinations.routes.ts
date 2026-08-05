import { Router } from "express";

import { Destination } from "../models/Destination.js";

export const destinationsRouter = Router();

/**
 * Public catalogue. Supports `?region=` and `?q=` because the frontend filters
 * server-side rather than shipping the whole list to the browser.
 */
destinationsRouter.get("/", async (req, res) => {
  const region = typeof req.query.region === "string" ? req.query.region : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const filter: Record<string, unknown> = {};
  if (region && region !== "all") filter.region = region;
  if (q) {
    // Escape the input before it becomes a regex — an unescaped `(` here is a
    // 500, and `(a+)+$` is a ReDoS.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { country: { $regex: safe, $options: "i" } },
    ];
  }

  const destinations = await Destination.find(filter).sort({ rating: -1 }).limit(50).lean();

  res.json({
    destinations: destinations.map((destination) => ({
      id: String(destination._id),
      slug: destination.slug,
      name: destination.name,
      country: destination.country,
      region: destination.region,
      summary: destination.summary,
      nights: destination.nights,
      basePriceInr: destination.basePriceInr,
      rating: destination.rating,
      heroEmoji: destination.heroEmoji,
      minimumTier: destination.minimumTier,
      seatsLeft: destination.seatsLeft,
    })),
    regions: await Destination.distinct("region"),
  });
});
