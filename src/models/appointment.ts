export interface Appointment {
  id: number;
  clinicianId: number;
  patientId: number;
  startTime: string;
  endTime: string;
}

export interface AppointmentQueryOptions {
  from?: string;
  to?: string;
  limit?: number;
}
