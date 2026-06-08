import type { Request, Response, NextFunction } from "express";
import type {
  CreateAppointmentRequest,
  ClinicianAppointmentsParams,
  AppointmentQuery,
  AdminAppointmentsQuery,
} from "../validation/appointmentSchemas";
import {
  createAppointment,
  listClinicianAppointments,
  listAllAppointments,
} from "../service/appointmentService";

export function createAppointmentHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    const dto = res.locals.body as CreateAppointmentRequest;

    const appointment = createAppointment(dto);

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

export function listClinicianAppointmentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const params = res.locals.params as ClinicianAppointmentsParams;
    const query = res.locals.query as unknown as AppointmentQuery;

    const appointments = listClinicianAppointments(params.id, query);

    res.status(200).json(appointments);
  } catch (error) {
    next(error);
  }
}

export function listAllAppointmentsHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    const query = res.locals.query as AdminAppointmentsQuery;
    const appointments = listAllAppointments(query);

    res.status(200).json(appointments);
  } catch (error) {
    next(error);
  }
}
