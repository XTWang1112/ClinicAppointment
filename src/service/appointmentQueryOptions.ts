import type { AppointmentQueryOptions } from "../models/appointment";

type DateRangeQuery = {
  from?: string;
  to?: string;
};

export function toUtcIsoString(value: string): string {
  return new Date(value).toISOString();
}

export function buildAppointmentQueryOptions(
  query: DateRangeQuery,
  options?: {
    defaultFromNow?: boolean;
    limit?: number;
  }
): AppointmentQueryOptions {
  const queryOptions: AppointmentQueryOptions = {};

  if (query.from) {
    queryOptions.from = toUtcIsoString(query.from);
  } else if (options?.defaultFromNow) {
    queryOptions.from = new Date().toISOString();
  }

  if (query.to) {
    queryOptions.to = toUtcIsoString(query.to);
  }

  if (options?.limit !== undefined) {
    queryOptions.limit = options.limit;
  }

  return queryOptions;
}
