/** Idempotent seed for the Voyago API. Run with `npm run seed`. */
import mongoose from "mongoose";

import { config } from "../src/config/env.js";
import { hashPassword } from "../src/lib/password.js";
import { Destination } from "../src/models/Destination.js";
import { User } from "../src/models/User.js";

const PASSWORD = "Password123!";

const ACCOUNTS = [
  { name: "Aditi Rao", email: "admin@example.com", tier: "elite", role: "agent", country: "IN" },
  { name: "Rohan Mehta", email: "pro@example.com", tier: "voyager", role: "traveller", country: "IN" },
  { name: "Sara Iyer", email: "free@example.com", tier: "explorer", role: "traveller", country: "SG" },
] as const;

const DESTINATIONS = [
  {
    slug: "kyoto-slow-autumn",
    name: "Kyoto Slow Autumn",
    country: "Japan",
    region: "Asia",
    summary:
      "Nine temples, two tea houses and no early mornings. Built around the maple season, with a local guide for three of the seven days.",
    nights: 7,
    basePriceInr: 186000,
    rating: 4.9,
    heroEmoji: "🍁",
    minimumTier: "explorer",
    seatsLeft: 12,
  },
  {
    slug: "patagonia-crossing",
    name: "Patagonia Crossing",
    country: "Chile",
    region: "South America",
    summary:
      "Torres del Paine end to end, with two refugio nights and a support vehicle carrying the heavy bags.",
    nights: 10,
    basePriceInr: 342000,
    rating: 4.8,
    heroEmoji: "🏔️",
    minimumTier: "voyager",
    seatsLeft: 6,
  },
  {
    slug: "kerala-backwaters",
    name: "Kerala Backwaters",
    country: "India",
    region: "Asia",
    summary:
      "Two nights on a houseboat, three in a plantation homestay, and a cooking day that most guests say was the trip.",
    nights: 5,
    basePriceInr: 64000,
    rating: 4.7,
    heroEmoji: "🛶",
    minimumTier: "explorer",
    seatsLeft: 18,
  },
  {
    slug: "lofoten-winter-light",
    name: "Lofoten Winter Light",
    country: "Norway",
    region: "Europe",
    summary:
      "Aurora-season cabins above the water, a fishing morning, and enough daylight hours to actually see the islands.",
    nights: 6,
    basePriceInr: 268000,
    rating: 4.8,
    heroEmoji: "🌌",
    minimumTier: "voyager",
    seatsLeft: 9,
  },
  {
    slug: "namib-private-camp",
    name: "Namib Private Camp",
    country: "Namibia",
    region: "Africa",
    summary:
      "A six-tent camp with its own dune access and a resident guide. Limited to one group at a time.",
    nights: 8,
    basePriceInr: 512000,
    rating: 5,
    heroEmoji: "🏜️",
    minimumTier: "elite",
    seatsLeft: 4,
  },
  {
    slug: "azores-green-week",
    name: "Azores Green Week",
    country: "Portugal",
    region: "Europe",
    summary:
      "Crater lakes, hot springs and a whale-watching morning, from a single base on São Miguel.",
    nights: 6,
    basePriceInr: 148000,
    rating: 4.6,
    heroEmoji: "🌋",
    minimumTier: "explorer",
    seatsLeft: 15,
  },
];

async function main() {
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb });
  console.log(`Connected to ${config.mongoDb}`);

  const passwordHash = await hashPassword(PASSWORD);

  for (const account of ACCOUNTS) {
    await User.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          name: account.name,
          tier: account.tier,
          role: account.role,
          country: account.country,
        },
        $setOnInsert: { passwordHash, loyaltyPoints: 0 },
      },
      { upsert: true },
    );
    console.log(`  user  ${account.email} (${account.tier})`);
  }

  for (const destination of DESTINATIONS) {
    await Destination.findOneAndUpdate(
      { slug: destination.slug },
      { $set: destination },
      { upsert: true },
    );
    console.log(`  trip  ${destination.slug}`);
  }

  console.log(`\nDone. All seeded accounts use the password: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
