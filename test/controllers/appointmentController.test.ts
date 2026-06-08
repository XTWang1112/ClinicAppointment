import type { Request, Response, NextFunction } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createAppointmentHandler,
  listClinicianAppointmentsHandler,
  listAllAppointmentsHandler,
} from "../../src/controllers/appointmentController";

import {
  createAppointment,
  listClinicianAppointments,
  listAllAppointments,
} from "../../src/service/appointmentService";

vi.mock("../../src/service/appointmentService", () => ({
  createAppointment: vi.fn(),
  listClinicianAppointments: vi.fn(),
  listAllAppointments: vi.fn(),
}));

function createMockResponse(): Response {
  return {
    locals: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("appointment controller", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = createMockResponse();
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe("createAppointmentHandler", () => {
    it("returns 201 with created appointment", () => {
      const dto = {
        clinicianId: 1,
        patientId: 2,
        start: "2026-06-10T09:00:00+10:00",
        end: "2026-06-10T09:30:00+10:00",
      };

      const appointment = {
        id: 1,
        clinicianId: 1,
        patientId: 2,
        startTime: "2026-06-09T23:00:00.000Z",
        endTime: "2026-06-09T23:30:00.000Z",
      };

      res.locals.body = dto;
      vi.mocked(createAppointment).mockReturnValue(appointment);

      createAppointmentHandler(req, res, next);

      expect(createAppointment).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(appointment);
      expect(next).not.toHaveBeenCalled();
    });

    it("passes errors to next", () => {
      const error = new Error("Something failed");

      res.locals.body = {
        clinicianId: 1,
        patientId: 2,
        start: "2026-06-10T09:00:00+10:00",
        end: "2026-06-10T09:30:00+10:00",
      };

      vi.mocked(createAppointment).mockImplementation(() => {
        throw error;
      });

      createAppointmentHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("listClinicianAppointmentsHandler", () => {
    it("returns 200 with clinician appointments", () => {
      const params = { id: 1 };
      const query = {
        from: "2026-06-10T09:00:00+10:00",
        to: "2026-06-10T12:00:00+10:00",
      };

      const appointments = [
        {
          id: 1,
          clinicianId: 1,
          patientId: 2,
          startTime: "2026-06-09T23:00:00.000Z",
          endTime: "2026-06-09T23:30:00.000Z",
        },
      ];

      res.locals.params = params;
      res.locals.query = query;

      vi.mocked(listClinicianAppointments).mockReturnValue(appointments);

      listClinicianAppointmentsHandler(req, res, next);

      expect(listClinicianAppointments).toHaveBeenCalledWith(params.id, query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(appointments);
      expect(next).not.toHaveBeenCalled();
    });

    it("passes errors to next", () => {
      const error = new Error("Clinician does not exist");

      res.locals.params = { id: 999 };
      res.locals.query = {};

      vi.mocked(listClinicianAppointments).mockImplementation(() => {
        throw error;
      });

      listClinicianAppointmentsHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("listAllAppointmentsHandler", () => {
    it("returns 200 with all appointments", () => {
      const query = {
        from: "2026-06-10T09:00:00+10:00",
        to: "2026-06-10T12:00:00+10:00",
        limit: 10,
      };

      const appointments = [
        {
          id: 1,
          clinicianId: 1,
          patientId: 2,
          startTime: "2026-06-09T23:00:00.000Z",
          endTime: "2026-06-09T23:30:00.000Z",
        },
      ];

      res.locals.query = query;

      vi.mocked(listAllAppointments).mockReturnValue(appointments);

      listAllAppointmentsHandler(req, res, next);

      expect(listAllAppointments).toHaveBeenCalledWith(query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(appointments);
      expect(next).not.toHaveBeenCalled();
    });

    it("passes errors to next", () => {
      const error = new Error("Unexpected error");

      res.locals.query = {};

      vi.mocked(listAllAppointments).mockImplementation(() => {
        throw error;
      });

      listAllAppointmentsHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
