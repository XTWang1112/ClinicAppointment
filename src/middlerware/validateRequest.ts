import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { RequestValidationError } from "./errors";

type RequestSource = "body" | "query" | "params";

export function validateRequest(schema: z.ZodTypeAny, source: RequestSource = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);

      res.locals[source] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new RequestValidationError());
        return;
      }

      next(error);
    }
  };
}
