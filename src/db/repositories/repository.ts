import type { Appointment, AppointmentQueryOptions } from "../../models/appointment";

export interface IRepository {
  clinicianExists(id: number): boolean;

  patientExists(id: number): boolean;

  markAppointmentDeleted(id: number): boolean;

  createAppointmentSafely(params: {
    clinicianId: number;
    patientId: number;
    startTime: string;
    endTime: string;
  }): Appointment;

  findAppointmentsByClinician(
    clinicianId: number,
    options?: AppointmentQueryOptions
  ): Appointment[];

  findAppointments(options?: AppointmentQueryOptions): Appointment[];
}
