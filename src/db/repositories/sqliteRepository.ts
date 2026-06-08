import { db } from "../database";
import type { Appointment, AppointmentQueryOptions } from "../../models/appointment";
import type { IRepository } from "./repository";
import { AppointmentOverlapError } from "../../middleware/errors";

type AppointmentRow = {
  id: number;
  clinician_id: number;
  patient_id: number;
  start_time: string;
  end_time: string;
};

function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clinicianId: row.clinician_id,
    patientId: row.patient_id,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

const clinicianExistsStatement = db.prepare(
  `
    SELECT id
    FROM clinicians
    WHERE id = ?
    LIMIT 1
  `
);

const patientExistsStatement = db.prepare(
  `
    SELECT id
    FROM patients
    WHERE id = ?
    LIMIT 1
  `
);

const selectOverlappingAppointmentStatement = db.prepare(
  `
    SELECT 1
    FROM appointments
    WHERE (clinician_id = ? OR patient_id = ?)
      AND ? < end_time
      AND ? > start_time
    LIMIT 1
  `
);

const insertAppointmentStatement = db.prepare(
  `
    INSERT INTO appointments (
      clinician_id,
      patient_id,
      start_time,
      end_time
    )
    VALUES (?, ?, ?, ?)
  `
);

const selectAppointmentByIdStatement = db.prepare(
  `
    SELECT id, clinician_id, patient_id, start_time, end_time
    FROM appointments
    WHERE id = ?
  `
);

export const sqliteRepository: IRepository = {
  clinicianExists(id: number): boolean {
    return recordExists(clinicianExistsStatement, id);
  },

  patientExists(id: number): boolean {
    return recordExists(patientExistsStatement, id);
  },

  createAppointmentSafely(params: {
    clinicianId: number;
    patientId: number;
    startTime: string;
    endTime: string;
  }): Appointment {
    const createInTransaction = db.transaction(() => {
      const overlapping = selectOverlappingAppointmentStatement.get(
        params.clinicianId,
        params.patientId,
        params.startTime,
        params.endTime
      );

      if (overlapping) {
        throw new AppointmentOverlapError();
      }

      const result = insertAppointmentStatement.run(
        params.clinicianId,
        params.patientId,
        params.startTime,
        params.endTime
      );

      const row = selectAppointmentByIdStatement.get(result.lastInsertRowid) as AppointmentRow;

      return mapAppointmentRow(row);
    });

    return createInTransaction.immediate();
  },

  findAppointmentsByClinician(
    clinicianId: number,
    options?: AppointmentQueryOptions
  ): Appointment[] {
    return findAppointmentsWithFilters({
      clinicianId,
      ...options,
    });
  },

  findAppointments(options?: AppointmentQueryOptions): Appointment[] {
    return findAppointmentsWithFilters(options);
  },
};

function recordExists(statement: { get: (id: number) => unknown }, id: number): boolean {
  return statement.get(id) !== undefined;
}

function findAppointmentsWithFilters(options?: {
  clinicianId?: number;
  from?: string;
  to?: string;
  limit?: number;
}): Appointment[] {
  const from = options?.from ?? new Date().toISOString();

  let sql = `
    SELECT id, clinician_id, patient_id, start_time, end_time
    FROM appointments
    WHERE 1 = 1
  `;

  const params: Array<string | number> = [];

  if (options?.clinicianId !== undefined) {
    sql += `
      AND clinician_id = ?
    `;
    params.push(options.clinicianId);
  }

  sql += `
    AND start_time >= ?
  `;
  params.push(from);

  if (options?.to) {
    sql += `
      AND start_time < ?
    `;
    params.push(options.to);
  }

  sql += `
    ORDER BY start_time ASC
  `;

  if (options?.limit !== undefined) {
    sql += `
      LIMIT ?
    `;
    params.push(options.limit);
  }

  const rows = db.prepare(sql).all(...params) as AppointmentRow[];

  return rows.map(mapAppointmentRow);
}
