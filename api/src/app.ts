import "express-async-errors"; // must precede the route imports

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config/env.js";
import { readAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { authRouter } from "./routes/auth.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { destinationsRouter } from "./routes/destinations.routes.js";

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Fly/nginx) this is what makes req.ip and `secure`
  // cookies correct instead of silently wrong.
  app.set("trust proxy", 1);

  app.use(helmet());

  /**
   * The browser sends cookies to this API from a different origin, so the
   * allow-list must be an exact origin and `credentials` must be true.
   * `*` with credentials is rejected by every browser — never widen this.
   */
  app.use(
    cors({
      origin: [config.webOrigin],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(morgan(config.isProd ? "combined" : "dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "voyago-api", time: new Date().toISOString() });
  });

  // Populate req.auth when a valid token is present; routes decide what to require.
  app.use(readAuth);

  app.use("/auth", authRouter);
  app.use("/destinations", destinationsRouter);
  app.use("/bookings", bookingsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
