/** Idempotent seed for the Voyago API. Run with `npm run seed`. */
import mongoose from "mongoose";

import { config } from "../src/config/env.js";
import { hashPassword } from "../src/lib/password.js";
import { Destination } from "../src/models/Destination.js";
import { PLANS, ROLES, User } from "../src/models/User.js";

/**
 * Accounts registered before the profile schema changed are missing the new
 * fields, or carry a role from the old set (traveller/agent). Reading them still
 * works, but any save would fail validation — so bring every straggler onto the
 * current shape.
 */
async function normaliseLegacyUsers(): Promise<void> {
  const users = User.collection;

  const filled = await users.updateMany(
    { $or: [{ active: { $exists: false } }, { riskScore: { $exists: false } }] },
    { $set: { active: true, riskScore: 1 } },
  );
  const roles = await users.updateMany(
    { role: { $nin: ROLES as unknown as string[] } },
    { $set: { role: "developer" } },
  );
  const plans = await users.updateMany(
    { plan: { $nin: PLANS as unknown as string[] } },
    { $set: { plan: "free" } },
  );
  const cleaned = await users.updateMany(
    {},
    { $unset: { tier: "", country: "", loyaltyPoints: "" } },
  );

  const touched = filled.modifiedCount + roles.modifiedCount + plans.modifiedCount;
  if (touched > 0 || cleaned.modifiedCount > 0) {
    console.log(
      `  migrated ${touched} legacy user document(s), cleared stale fields on ${cleaned.modifiedCount}`,
    );
  }
}

const PASSWORD = "Password123!";

/**
 * The same six accounts exist in all three demo apps, chosen to cover the whole
 * attribute matrix — every plan, every role, both active states and a spread of
 * risk scores — so one targeting rule can be tried against any of them.
 */
const ACCOUNTS = [
  { email: "admin@example.com", name: "Aditi Rao", active: true, plan: "enterprise", role: "compliance", riskScore: 2 },
  { email: "pro@example.com", name: "Rohan Mehta", active: true, plan: "pro", role: "developer", riskScore: 5 },
  { email: "free@example.com", name: "Sara Iyer", active: true, plan: "free", role: "marketing", riskScore: 7 },
  { email: "security@example.com", name: "Imran Qureshi", active: true, plan: "pro", role: "security", riskScore: 9 },
  { email: "inactive@example.com", name: "Neha Kapoor", active: false, plan: "pro", role: "developer", riskScore: 4 },
  { email: "dev-free@example.com", name: "Kabir Shah", active: true, plan: "free", role: "developer", riskScore: 1 },
  { email: "yash@gmail.com", name: "yash", active: true, plan: "enterprise", role: "marketing", riskScore: 8 },
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
    minimumPlan: "free",
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
    minimumPlan: "pro",
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
    minimumPlan: "free",
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
    minimumPlan: "pro",
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
    minimumPlan: "enterprise",
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
    minimumPlan: "free",
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
          active: account.active,
          plan: account.plan,
          role: account.role,
          riskScore: account.riskScore,
        },
        $setOnInsert: { passwordHash },
        // Attributes from the previous schema, cleared so old documents do not
        // keep stale fields around.
        $unset: { tier: "", country: "", loyaltyPoints: "" },
      },
      { upsert: true },
    );
    console.log(
      `  user  ${account.email.padEnd(22)} ${account.plan.padEnd(10)} ${account.role.padEnd(10)} risk ${account.riskScore} ${account.active ? "" : "(inactive)"}`,
    );
  }

  for (const destination of DESTINATIONS) {
    await Destination.findOneAndUpdate(
      { slug: destination.slug },
      { $set: destination, $unset: { minimumTier: "" } },
      { upsert: true },
    );
    console.log(`  trip  ${destination.slug}`);
  }

  await normaliseLegacyUsers();

  console.log(`\nDone. All seeded accounts use the password: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
