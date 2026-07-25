import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sqliteRepository } from "../../src/db/repositories/sqliteRepository";
import { AppointmentOverlapError } from "../../src/middleware/errors";
import { closeTestDatabase, resetTestDatabase, startTestDatabase } from "../setupTestDb";

describe("sqliteRepository", () => {
  beforeAll(() => {
    startTestDatabase();
  });

  beforeEach(() => {
    resetTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  describe("clinicianExists", () => {
    it("returns true when clinician exists", () => {
      expect(sqliteRepository.clinicianExists(1)).toBe(true);
    });

    it("returns false when clinician does not exist", () => {
      expect(sqliteRepository.clinicianExists(999)).toBe(false);
    });
  });

  describe("patientExists", () => {
    it("returns true when patient exists", () => {
      expect(sqliteRepository.patientExists(1)).toBe(true);
    });

    it("returns false when patient does not exist", () => {
      expect(sqliteRepository.patientExists(999)).toBe(false);
    });
  });

  describe("createAppointmentSafely", () => {
    it("creates appointment when there is no overlap", () => {
      const result = sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 2,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      expect(result).toEqual({
        id: 1,
        clinicianId: 1,
        patientId: 2,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });
    });

    it("throws AppointmentOverlapError when appointment overlaps", () => {
      sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      expect(() =>
        sqliteRepository.createAppointmentSafely({
          clinicianId: 1,
          patientId: 2,
          startTime: "2099-06-10T09:15:00.000Z",
          endTime: "2099-06-10T09:45:00.000Z",
        })
      ).toThrow(AppointmentOverlapError);
    });

    it("ignores deleted appointments when checking overlaps", () => {
      const appointment = sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      expect(sqliteRepository.markAppointmentDeleted(appointment.id)).toBe(true);

      expect(() =>
        sqliteRepository.createAppointmentSafely({
          clinicianId: 1,
          patientId: 2,
          startTime: "2099-06-10T09:15:00.000Z",
          endTime: "2099-06-10T09:45:00.000Z",
        })
      ).not.toThrow();
    });
  });

  describe("markAppointmentDeleted", () => {
    it("returns true when an appointment is marked deleted", () => {
      const appointment = sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      expect(sqliteRepository.markAppointmentDeleted(appointment.id)).toBe(true);
    });

    it("returns false when the appointment does not exist", () => {
      expect(sqliteRepository.markAppointmentDeleted(999)).toBe(false);
    });
  });

  describe("findAppointmentsByClinician", () => {
    it("returns only matching clinician appointments within the range", () => {
      sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      sqliteRepository.createAppointmentSafely({
        clinicianId: 2,
        patientId: 2,
        startTime: "2099-06-10T10:00:00.000Z",
        endTime: "2099-06-10T10:30:00.000Z",
      });

      const result = sqliteRepository.findAppointmentsByClinician(1, {
        from: "2099-06-10T08:00:00.000Z",
        to: "2099-06-10T10:00:00.000Z",
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        clinicianId: 1,
        patientId: 1,
      });
    });

    it("does not return deleted appointments", () => {
      const appointment = sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      sqliteRepository.markAppointmentDeleted(appointment.id);

      const result = sqliteRepository.findAppointmentsByClinician(1, {
        from: "2099-06-10T08:00:00.000Z",
        to: "2099-06-10T10:00:00.000Z",
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("findAppointments", () => {
    it("returns appointments sorted by start time and respects limit", () => {
      sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T11:00:00.000Z",
        endTime: "2099-06-10T11:30:00.000Z",
      });

      sqliteRepository.createAppointmentSafely({
        clinicianId: 2,
        patientId: 2,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      const result = sqliteRepository.findAppointments({
        from: "2099-06-10T08:00:00.000Z",
        to: "2099-06-10T12:00:00.000Z",
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        clinicianId: 2,
        patientId: 2,
        startTime: "2099-06-10T09:00:00.000Z",
      });
    });

    it("does not return deleted appointments", () => {
      const appointment = sqliteRepository.createAppointmentSafely({
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-10T09:00:00.000Z",
        endTime: "2099-06-10T09:30:00.000Z",
      });

      sqliteRepository.markAppointmentDeleted(appointment.id);

      const result = sqliteRepository.findAppointments({
        from: "2099-06-10T08:00:00.000Z",
        to: "2099-06-10T10:00:00.000Z",
      });

      expect(result).toHaveLength(0);
    });
  });
});
