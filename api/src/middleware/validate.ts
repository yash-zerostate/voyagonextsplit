import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodTypeAny, z } from "zod";

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Parses `req.body` and replaces it with the parsed value, so handlers work
 * with typed, trimmed, defaulted data instead of whatever arrived on the wire.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        error: {
          code: "invalid_input",
          message: "Please fix the highlighted fields.",
          fields: fieldErrors(parsed.error),
        },
      });
      return;
    }
    req.body = parsed.data as z.infer<T>;
    next();
  };
}
