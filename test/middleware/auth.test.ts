import type { Request, Response, NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { simulateAuth, requireRole } from "../../src/middleware/auth";
import { ForbiddenError, UnAuthenticatedError } from "../../src/middleware/errors";

function createMockRequest(role?: string): Request {
  return {
    header: vi.fn((name: string) => {
      if (name === "x-user-role") {
        return role;
      }

      return undefined;
    }),
  } as unknown as Request;
}

function createMockResponse(): Response {
  return {
    locals: {},
  } as Response;
}

describe("auth middleware", () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    res = createMockResponse();
    next = vi.fn();
  });

  describe("simulateAuth", () => {
    it("sets user role and calls next when role is valid", () => {
      const req = createMockRequest("admin");

      simulateAuth(req, res, next);

      expect(res.locals.user).toEqual({
        role: "admin",
      });
      expect(next).toHaveBeenCalledOnce();
    });

    it("throws UnAuthenticatedError when role header is missing", () => {
      const req = createMockRequest();

      expect(() => simulateAuth(req, res, next)).toThrow(UnAuthenticatedError);
      expect(next).not.toHaveBeenCalled();
    });

    it("throws UnAuthenticatedError when role is invalid", () => {
      const req = createMockRequest("superadmin");

      expect(() => simulateAuth(req, res, next)).toThrow(UnAuthenticatedError);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    it("calls next when user role is allowed", () => {
      res.locals.user = {
        role: "admin",
      };

      const middleware = requireRole("admin");

      middleware({} as Request, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it("calls next when user role is one of allowed roles", () => {
      res.locals.user = {
        role: "clinician",
      };

      const middleware = requireRole("clinician", "admin");

      middleware({} as Request, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it("throws UnAuthenticatedError when user is missing", () => {
      const middleware = requireRole("admin");

      expect(() => middleware({} as Request, res, next)).toThrow(UnAuthenticatedError);
      expect(next).not.toHaveBeenCalled();
    });

    it("throws ForbiddenError when user role is not allowed", () => {
      res.locals.user = {
        role: "patient",
      };

      const middleware = requireRole("admin");

      expect(() => middleware({} as Request, res, next)).toThrow(ForbiddenError);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
