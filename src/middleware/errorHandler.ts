import type { Request, Response, NextFunction } from "express";

import { AppError } from "./errors";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (process.env.NODE_ENV !== "test") {
    console.error("Error:", err);
  }

  if (err instanceof AppError) {
    const payload: Record<string, unknown> = {
      error: err.message,
    };

    if (err.details !== undefined) {
      payload.details = err.details;
    }

    res.status(err.statusCode).json(payload);
    return;
  }

  res.status(500).json({
    error: "Internal server error",
  });
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
