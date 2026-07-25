import { describe, expect, it } from "vitest";
import {
  adminAppointmentsQuerySchema,
  appointmentIdParamsSchema,
  appointmentQuerySchema,
  clinicianAppointmentsParamsSchema,
  createAppointmentSchema,
} from "../../src/validation/appointmentSchemas";

describe("appointment schemas", () => {
  describe("createAppointmentSchema", () => {
    it("accepts a valid appointment request", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid start datetime", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 2,
        start: "9765",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["start"],
            message: "Must be a valid datetime",
          })
        );

        expect(result.error.issues).not.toContainEqual(
          expect.objectContaining({
            path: ["end"],
            message: "Start time must be before end time",
          })
        );
      }
    });

    it("rejects invalid end datetime", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T09:00:00+10:00",
        end: "not-a-date",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["end"],
            message: "Must be a valid datetime",
          })
        );
      }
    });

    it("rejects when start is equal to end", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:00:00+10:00",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["end"],
            message: "Start time must be before end time",
          })
        );
      }
    });

    it("rejects when start is after end", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T10:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["end"],
            message: "Start time must be before end time",
          })
        );
      }
    });

    it("rejects when start is in the past", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 2,
        start: "2000-06-10T09:00:00+10:00",
        end: "2000-06-10T09:30:00+10:00",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["start"],
            message: "Start time must not be in the past",
          })
        );
      }
    });

    it("rejects non-integer clinicianId", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1.5,
        patientId: 2,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(result.success).toBe(false);
    });

    it("rejects non-positive patientId", () => {
      const result = createAppointmentSchema.safeParse({
        clinicianId: 1,
        patientId: 0,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("clinicianAppointmentsParamsSchema", () => {
    it("coerces id from string to number", () => {
      const result = clinicianAppointmentsParamsSchema.safeParse({
        id: "1",
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toBe(1);
      }
    });

    it("rejects invalid id", () => {
      const result = clinicianAppointmentsParamsSchema.safeParse({
        id: "abc",
      });

      expect(result.success).toBe(false);
    });

    it("rejects non-positive id", () => {
      const result = clinicianAppointmentsParamsSchema.safeParse({
        id: "0",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("appointmentIdParamsSchema", () => {
    it("coerces id from string to number", () => {
      const result = appointmentIdParamsSchema.safeParse({
        id: "1",
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toBe(1);
      }
    });

    it("rejects invalid id", () => {
      const result = appointmentIdParamsSchema.safeParse({
        id: "abc",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("appointmentQuerySchema", () => {
    it("accepts empty query", () => {
      const result = appointmentQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("accepts only from", () => {
      const result = appointmentQuerySchema.safeParse({
        from: "2099-06-10T09:00:00+10:00",
      });

      expect(result.success).toBe(true);
    });

    it("accepts only to", () => {
      const result = appointmentQuerySchema.safeParse({
        to: "2099-06-10T10:00:00+10:00",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid from", () => {
      const result = appointmentQuerySchema.safeParse({
        from: "abc",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["from"],
            message: "Must be a valid datetime",
          })
        );
      }
    });

    it("rejects when from is after to", () => {
      const result = appointmentQuerySchema.safeParse({
        from: "2099-06-10T11:00:00+10:00",
        to: "2099-06-10T10:00:00+10:00",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["to"],
            message: "From time must be before to time",
          })
        );
      }
    });
  });

  describe("adminAppointmentsQuerySchema", () => {
    it("accepts empty query", () => {
      const result = adminAppointmentsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("coerces limit from string to number", () => {
      const result = adminAppointmentsQuerySchema.safeParse({
        limit: "10",
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it("rejects invalid limit", () => {
      const result = adminAppointmentsQuerySchema.safeParse({
        limit: "abc",
      });

      expect(result.success).toBe(false);
    });

    it("rejects zero limit", () => {
      const result = adminAppointmentsQuerySchema.safeParse({
        limit: "0",
      });

      expect(result.success).toBe(false);
    });

    it("rejects limit greater than 100", () => {
      const result = adminAppointmentsQuerySchema.safeParse({
        limit: "101",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["limit"],
            message: "Limit cannot be greater than 100",
          })
        );
      }
    });

    it("rejects when from is after to", () => {
      const result = adminAppointmentsQuerySchema.safeParse({
        from: "2099-06-10T11:00:00+10:00",
        to: "2099-06-10T10:00:00+10:00",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["to"],
            message: "From time must be before to time",
          })
        );
      }
    });
  });

  it("does not add date range error when from is invalid", () => {
    const result = appointmentQuerySchema.safeParse({
      from: "invalid-date",
      to: "2099-06-10T10:00:00+10:00",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["from"],
          message: "Must be a valid datetime",
        })
      );

      expect(result.error.issues).not.toContainEqual(
        expect.objectContaining({
          path: ["to"],
          message: "From time must be before to time",
        })
      );
    }
  });
});
