import mongoose from "mongoose";

import { config } from "../config/env.js";

export async function connectToDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDb,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });
  console.log(`[db] connected to ${config.mongoDb}`);

  mongoose.connection.on("error", (error) => {
    console.error("[db] connection error:", error.message);
  });
}
