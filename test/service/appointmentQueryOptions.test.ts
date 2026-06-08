import { describe, expect, it, vi } from "vitest";
import {
  buildAppointmentQueryOptions,
  toUtcIsoString,
} from "../../src/service/appointmentQueryOptions";

describe("appointmentQueryOptions", () => {
  it("converts an input datetime to UTC ISO format", () => {
    expect(toUtcIsoString("2099-06-10T09:00:00+10:00")).toBe("2099-06-09T23:00:00.000Z");
  });

  it("builds query options from provided from/to values", () => {
    const result = buildAppointmentQueryOptions({
      from: "2099-06-10T09:00:00+10:00",
      to: "2099-06-10T10:00:00+10:00",
    });

    expect(result).toEqual({
      from: "2099-06-09T23:00:00.000Z",
      to: "2099-06-10T00:00:00.000Z",
    });
  });

  it("defaults from to now when requested", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));

    const result = buildAppointmentQueryOptions({}, { defaultFromNow: true, limit: 5 });

    expect(result).toEqual({
      from: "2099-01-01T00:00:00.000Z",
      limit: 5,
    });

    vi.useRealTimers();
  });
});
