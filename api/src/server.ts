import mongoose from "mongoose";

import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { connectToDatabase } from "./db/connect.js";

async function main() {
  await connectToDatabase();

  const server = createApp().listen(config.port, () => {
    console.log(`[api] voyago-api listening on http://localhost:${config.port}`);
    console.log(`[api] CORS origin: ${config.webOrigin}`);
    console.log(
      `[api] cookies: sameSite=${config.cookie.sameSite} secure=${config.cookie.secure} domain=${
        config.cookie.domain ?? "(host-only)"
      }`,
    );
  });

  // Finish in-flight requests and close the pool instead of dropping both.
  const shutdown = async (signal: string) => {
    console.log(`\n[api] ${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[api] failed to start:", error);
  process.exit(1);
});
