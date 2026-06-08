import { repository } from "../db/repositories";
import type { Appointment, AppointmentQueryOptions } from "../models/appointment";
import type {
  CreateAppointmentRequest,
  AppointmentQuery,
  AdminAppointmentsQuery,
} from "../validation/appointmentSchemas";
import { ClinicianNotFoundError, PatientNotFoundError } from "../middleware/errors";
import { buildAppointmentQueryOptions, toUtcIsoString } from "./appointmentQueryOptions";

export function createAppointment(dto: CreateAppointmentRequest): Appointment {
  const { clinicianId, patientId, start, end } = dto;

  if (!repository.clinicianExists(clinicianId)) {
    throw new ClinicianNotFoundError();
  }

  if (!repository.patientExists(patientId)) {
    throw new PatientNotFoundError();
  }

  return repository.createAppointmentSafely({
    clinicianId,
    patientId,
    startTime: toUtcIsoString(start),
    endTime: toUtcIsoString(end),
  });
}

export function listClinicianAppointments(
  clinicianId: number,
  query: AppointmentQuery
): Appointment[] {
  if (!repository.clinicianExists(clinicianId)) {
    throw new ClinicianNotFoundError();
  }

  return repository.findAppointmentsByClinician(
    clinicianId,
    buildAppointmentQueryOptions(query, { defaultFromNow: true })
  );
}

export function listAllAppointments(query: AdminAppointmentsQuery): Appointment[] {
  const options: AppointmentQueryOptions = buildAppointmentQueryOptions(query, {
    defaultFromNow: true,
    limit: query.limit,
  });

  return repository.findAppointments(options);
}
