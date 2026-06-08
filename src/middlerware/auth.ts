import type { Request, Response, NextFunction } from "express";
import type { AuthUser, UserRole } from "../models/authTypes";
import { UnAuthenticatedError, ForbiddenError } from "./errors";

const validRoles: UserRole[] = ["patient", "clinician", "admin"];

export function simulateAuth(req: Request, res: Response, next: NextFunction): void {
  const role = req.header("x-user-role") as UserRole | undefined;

  if (!role || !validRoles.includes(role)) {
    throw new UnAuthenticatedError();
  }

  res.locals.user = {
    role,
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user as AuthUser | undefined;

    if (!user) {
      throw new UnAuthenticatedError();
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError();
    }

    next();
  };
}
