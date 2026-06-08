import { beforeEach, describe, expect, it, vi } from "vitest";
import { sqliteRepository } from "../../src/db/repositories/sqliteRepository";
import { db } from "../../src/db/database";
import { AppointmentOverlapError } from "../../src/middlerware/errors";

vi.mock("../../src/db/database", () => ({
  db: {
    prepare: vi.fn(),
    transaction: vi.fn(),
  },
}));

function mockPrepareReturn(methods: {
  get?: ReturnType<typeof vi.fn>;
  run?: ReturnType<typeof vi.fn>;
  all?: ReturnType<typeof vi.fn>;
}) {
  vi.mocked(db.prepare).mockReturnValue(methods as never);
}

describe("sqliteRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("clinicianExists", () => {
    it("returns true when clinician exists", () => {
      mockPrepareReturn({
        get: vi.fn().mockReturnValue({ id: 1 }),
      });

      const result = sqliteRepository.clinicianExists(1);

      expect(result).toBe(true);
      expect(db.prepare).toHaveBeenCalled();
    });

    it("returns false when clinician does not exist", () => {
      mockPrepareReturn({
        get: vi.fn().mockReturnValue(undefined),
      });

      const result = sqliteRepository.clinicianExists(999);

      expect(result).toBe(false);
    });
  });

  describe("patientExists", () => {
    it("returns true when patient exists", () => {
      mockPrepareReturn({
        get: vi.fn().mockReturnValue({ id: 2 }),
      });

      const result = sqliteRepository.patientExists(2);

      expect(result).toBe(true);
    });

    it("returns false when patient does not exist", () => {
      mockPrepareReturn({
        get: vi.fn().mockReturnValue(undefined),
      });

      const result = sqliteRepository.patientExists(999);

      expect(result).toBe(false);
    });
  });

  describe("createAppointmentSafely", () => {
    it("creates appointment when there is no overlap", () => {
      const appointmentRow = {
        id: 1,
        clinician_id: 1,
        patient_id: 2,
        start_time: "2026-06-10T09:00:00.000Z",
        end_time: "2026-06-10T09:30:00.000Z",
      };

      const overlapGet = vi.fn().mockReturnValue(undefined);
      const insertRun = vi.fn().mockReturnValue({ lastInsertRowid: 1 });
      const selectCreatedGet = vi.fn().mockReturnValue(appointmentRow);

      vi.mocked(db.prepare)
        .mockReturnValueOnce({ get: overlapGet } as never)
        .mockReturnValueOnce({ run: insertRun } as never)
        .mockReturnValueOnce({ get: selectCreatedGet } as never);

      vi.mocked(db.transaction).mockImplementation((callback: () => unknown) => {
        const transactionFunction = vi.fn(callback) as any;
        transactionFunction.immediate = vi.fn(callback);
        return transactionFunction;
      });

      const result = sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 2,
        startTime: "2026-06-10T09:00:00.000Z",
        endTime: "2026-06-10T09:30:00.000Z",
      });

      expect(result).toEqual({
        id: 1,
        clinicianId: 1,
        patientId: 2,
        startTime: "2026-06-10T09:00:00.000Z",
        endTime: "2026-06-10T09:30:00.000Z",
      });

      expect(overlapGet).toHaveBeenCalledWith(
        1,
        2,
        "2026-06-10T09:00:00.000Z",
        "2026-06-10T09:30:00.000Z"
      );

      expect(insertRun).toHaveBeenCalledWith(
        1,
        2,
        "2026-06-10T09:00:00.000Z",
        "2026-06-10T09:30:00.000Z"
      );

      expect(selectCreatedGet).toHaveBeenCalledWith(1);
    });

    it("throws AppointmentOverlapError when appointment overlaps", () => {
      vi.mocked(db.prepare).mockReturnValueOnce({
        get: vi.fn().mockReturnValue({ "1": 1 }),
      } as never);

      vi.mocked(db.transaction).mockImplementation((callback: () => unknown) => {
        const transactionFunction = vi.fn(callback) as any;
        transactionFunction.immediate = vi.fn(callback);
        return transactionFunction;
      });

      expect(() =>
        sqliteRepository.createAppointmentSafely({
          clinicianId: 1,
          patientId: 2,
          startTime: "2026-06-10T09:00:00.000Z",
          endTime: "2026-06-10T09:30:00.000Z",
        })
      ).toThrow(AppointmentOverlapError);
    });
  });

  describe("findAppointmentsByClinician", () => {
    it("returns mapped appointments for a clinician", () => {
      const rows = [
        {
          id: 1,
          clinician_id: 1,
          patient_id: 2,
          start_time: "2026-06-10T09:00:00.000Z",
          end_time: "2026-06-10T09:30:00.000Z",
        },
      ];

      const all = vi.fn().mockReturnValue(rows);

      mockPrepareReturn({ all });

      const result = sqliteRepository.findAppointmentsByClinician(1, {
        from: "2026-06-10T00:00:00.000Z",
        to: "2026-06-11T00:00:00.000Z",
      });

      expect(result).toEqual([
        {
          id: 1,
          clinicianId: 1,
          patientId: 2,
          startTime: "2026-06-10T09:00:00.000Z",
          endTime: "2026-06-10T09:30:00.000Z",
        },
      ]);

      expect(all).toHaveBeenCalledWith(1, "2026-06-10T00:00:00.000Z", "2026-06-11T00:00:00.000Z");
    });
  });

  describe("findAppointments", () => {
    it("returns mapped appointments with limit", () => {
      const rows = [
        {
          id: 1,
          clinician_id: 1,
          patient_id: 2,
          start_time: "2026-06-10T09:00:00.000Z",
          end_time: "2026-06-10T09:30:00.000Z",
        },
      ];

      const all = vi.fn().mockReturnValue(rows);

      mockPrepareReturn({ all });

      const result = sqliteRepository.findAppointments({
        from: "2026-06-10T00:00:00.000Z",
        to: "2026-06-11T00:00:00.000Z",
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        clinicianId: 1,
        patientId: 2,
        startTime: "2026-06-10T09:00:00.000Z",
        endTime: "2026-06-10T09:30:00.000Z",
      });

      expect(all).toHaveBeenCalledWith("2026-06-10T00:00:00.000Z", "2026-06-11T00:00:00.000Z", 10);
    });
  });
});
