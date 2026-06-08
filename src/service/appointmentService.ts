import { repository } from "../db/repositories";
import type { Appointment, AppointmentQueryOptions } from "../models/appointment";
import type {
  CreateAppointmentRequest,
  AppointmentQuery,
  AdminAppointmentsQuery,
} from "../validation/appointmentSchemas";
import { ClinicianNotFoundError, PatientNotFoundError } from "../middlerware/errors";

export function createAppointment(dto: CreateAppointmentRequest): Appointment {
  const { clinicianId, patientId, start, end } = dto;

  if (!repository.clinicianExists(clinicianId)) {
    throw new ClinicianNotFoundError();
  }

  if (!repository.patientExists(patientId)) {
    throw new PatientNotFoundError();
  }

  const startTimeUtc = new Date(start).toISOString();
  const endTimeUtc = new Date(end).toISOString();

  return repository.createAppointmentSafely({
    clinicianId,
    patientId,
    startTime: startTimeUtc,
    endTime: endTimeUtc,
  });
}

export function listClinicianAppointments(
  clinicianId: number,
  query: AppointmentQuery
): Appointment[] {
  if (!repository.clinicianExists(clinicianId)) {
    throw new ClinicianNotFoundError();
  }

  const from = query.from ? new Date(query.from).toISOString() : new Date().toISOString();
  const to = query.to ? new Date(query.to).toISOString() : undefined;

  return repository.findAppointmentsByClinician(clinicianId, { from, to });
}

export function listAllAppointments(query: AdminAppointmentsQuery): Appointment[] {
  const options: AppointmentQueryOptions = {
    from: query.from ? new Date(query.from).toISOString() : new Date().toISOString(),
  };

  if (query.to) {
    options.to = new Date(query.to).toISOString();
  }

  if (query.limit) {
    options.limit = query.limit;
  }

  return repository.findAppointments(options);
}
