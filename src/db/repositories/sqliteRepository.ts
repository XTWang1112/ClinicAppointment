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

export const sqliteRepository: IRepository = {
  clinicianExists(id: number): boolean {
    return recordExists(
      `
        SELECT id
        FROM clinicians
        WHERE id = ?
        LIMIT 1
      `,
      id
    );
  },

  patientExists(id: number): boolean {
    return recordExists(
      `
        SELECT id
        FROM patients
        WHERE id = ?
        LIMIT 1
      `,
      id
    );
  },

  markAppointmentDeleted(id: number): boolean {
    const result = db
      .prepare(
        `
          UPDATE appointments
          SET is_deleted = 1
          WHERE id = ?
            AND is_deleted = 0
        `
      )
      .run(id);

    return result.changes > 0;
  },

  createAppointmentSafely(params: {
    clinicianId: number;
    patientId: number;
    startTime: string;
    endTime: string;
  }): Appointment {
    const createInTransaction = db.transaction(() => {
      const overlapping = db
        .prepare(
          `
            SELECT 1
            FROM appointments
            WHERE (clinician_id = ? OR patient_id = ?)
              AND is_deleted = 0
              AND ? < end_time
              AND ? > start_time
            LIMIT 1
          `
        )
        .get(params.clinicianId, params.patientId, params.startTime, params.endTime);

      if (overlapping) {
        throw new AppointmentOverlapError();
      }

      const result = db
        .prepare(
          `
            INSERT INTO appointments (
              clinician_id,
              patient_id,
              start_time,
              end_time
            )
            VALUES (?, ?, ?, ?)
          `
        )
        .run(params.clinicianId, params.patientId, params.startTime, params.endTime);

      const row = db
        .prepare(
          `
            SELECT id, clinician_id, patient_id, start_time, end_time
            FROM appointments
            WHERE id = ?
          `
        )
        .get(result.lastInsertRowid) as AppointmentRow;

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

function recordExists(sql: string, id: number): boolean {
  return db.prepare(sql).get(id) !== undefined;
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
    WHERE is_deleted = 0
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
