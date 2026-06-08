import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { RequestValidationError } from "./errors";

type RequestSource = "body" | "query" | "params";
type ValidationErrorDetails = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

export function validateRequest(schema: z.ZodTypeAny, source: RequestSource = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);

      res.locals[source] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new RequestValidationError(formatZodError(error)));
        return;
      }

      next(error);
    }
  };
}

function formatZodError(error: ZodError): ValidationErrorDetails {
  const flattened = z.flattenError(error);
  const details: ValidationErrorDetails = {};

  if (flattened.formErrors.length > 0) {
    details.formErrors = flattened.formErrors;
  }

  const fieldErrors: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      fieldErrors[field] = messages;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    details.fieldErrors = fieldErrors;
  }

  return details;
}
