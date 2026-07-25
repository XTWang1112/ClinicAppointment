import { z } from "zod";

const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1, "Datetime is required")
  .refine((value) => isValidIsoDateTime(value), {
    message: "Must be a valid datetime",
  });

const dateRangeQueryShape = {
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
};

function isIsoDateTime(value: string): boolean {
  const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;

  return isoDateTimeRegex.test(value);
}

function isValidIsoDateTime(value: string): boolean {
  return isIsoDateTime(value) && !Number.isNaN(new Date(value).getTime());
}

function withValidDateRange<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).superRefine((data, ctx) => {
    const dateRange = data as {
      from?: string;
      to?: string;
    };

    if (!dateRange.from || !dateRange.to) {
      return;
    }

    if (!isValidIsoDateTime(dateRange.from) || !isValidIsoDateTime(dateRange.to)) {
      return;
    }

    if (new Date(dateRange.from) >= new Date(dateRange.to)) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "From time must be before to time",
      });
    }
  });
}

export const createAppointmentSchema = z
  .object({
    clinicianId: z.number().int().positive(),
    patientId: z.number().int().positive(),
    start: isoDateTimeSchema,
    end: isoDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (!isValidIsoDateTime(data.start) || !isValidIsoDateTime(data.end)) {
      return;
    }

    const startDate = new Date(data.start);
    const endDate = new Date(data.end);
    const now = new Date();

    if (startDate < now) {
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "Start time must not be in the past",
      });

      return;
    }

    if (startDate >= endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Start time must be before end time",
      });
    }
  });

export const clinicianAppointmentsParamsSchema = z.object({
  id: z.coerce
    .number()
    .int("Clinician ID must be an integer")
    .positive("Clinician ID must be positive"),
});

export const appointmentIdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int("Appointment ID must be an integer")
    .positive("Appointment ID must be positive"),
});

export const appointmentQuerySchema = withValidDateRange({
  ...dateRangeQueryShape,
});

export const adminAppointmentsQuerySchema = withValidDateRange({
  ...dateRangeQueryShape,

  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be positive")
    .max(100, "Limit cannot be greater than 100")
    .optional(),
});

export type AdminAppointmentsQuery = z.infer<typeof adminAppointmentsQuerySchema>;
export type AppointmentIdParams = z.infer<typeof appointmentIdParamsSchema>;
export type ClinicianAppointmentsParams = z.infer<typeof clinicianAppointmentsParamsSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
export type CreateAppointmentRequest = z.infer<typeof createAppointmentSchema>;
