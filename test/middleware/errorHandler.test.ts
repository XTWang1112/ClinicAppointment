import type { Request, Response, NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFoundHandler } from "../../src/middlerware/errorHandler";
import { AppError } from "../../src/middlerware/errors";

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("errorHandler", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = createMockResponse();
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("returns AppError status code and message", () => {
    const error = new AppError(400, "Validation failed");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Validation failed",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 for unknown errors", () => {
    const error = new Error("Unexpected database error");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("notFoundHandler", () => {
  it("returns 404 with route information", () => {
    const req = {
      method: "GET",
      path: "/unknown-route",
    } as Request;

    const res = createMockResponse();
    const next = vi.fn();

    notFoundHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Route GET /unknown-route not found",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
