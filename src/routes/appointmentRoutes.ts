import { Router } from "express";
import {
  createAppointmentHandler,
  listClinicianAppointmentsHandler,
  listAllAppointmentsHandler,
} from "../controllers/appointmentController";
import {
  createAppointmentSchema,
  clinicianAppointmentsParamsSchema,
  appointmentQuerySchema,
  adminAppointmentsQuerySchema,
} from "../validation/appointmentSchemas";
import { validateRequest } from "../middleware/validateRequest";
import { simulateAuth, requireRole } from "../middleware/auth";

export const appointmentRouter = Router();

/**
 * @openapi
 * /appointments:
 *   post:
 *     summary: Create an appointment
 *     security:
 *       - RoleHeader: []
 *     tags:
 *       - Appointments
 *     parameters:
 *       - in: header
 *         name: x-user-role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [patient, clinician, admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clinicianId
 *               - patientId
 *               - start
 *               - end
 *             properties:
 *               clinicianId:
 *                 type: integer
 *                 example: 1
 *               patientId:
 *                 type: integer
 *                 example: 1
 *               start:
 *                 type: string
 *                 example: "2099-06-10T09:00:00+10:00"
 *               end:
 *                 type: string
 *                 example: "2099-06-10T09:30:00+10:00"
 *     responses:
 *       201:
 *         description: Created appointment
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Appointment overlap
 */
appointmentRouter.post(
  "/appointments",
  simulateAuth,
  requireRole("patient", "clinician", "admin"),
  validateRequest(createAppointmentSchema),
  createAppointmentHandler
);

/**
 * @openapi
 * /clinicians/{id}/appointments:
 *   get:
 *     summary: List clinician upcoming appointments
 *     security:
 *       - RoleHeader: []
 *     tags:
 *       - Appointments
 *     parameters:
 *       - in: header
 *         name: x-user-role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [patient, clinician, admin]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *         example: "2099-06-10T09:00:00+10:00"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *         example: "2099-06-11T09:00:00+10:00"
 *     responses:
 *       200:
 *         description: List of clinician appointments
 *       400:
 *         description: Invalid params or query
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden
 */
appointmentRouter.get(
  "/clinicians/:id/appointments",
  simulateAuth,
  requireRole("patient", "clinician", "admin"),
  validateRequest(clinicianAppointmentsParamsSchema, "params"),
  validateRequest(appointmentQuerySchema, "query"),
  listClinicianAppointmentsHandler
);

/**
 * @openapi
 * /appointments:
 *   get:
 *     summary: Admin list all upcoming appointments
 *     security:
 *       - RoleHeader: []
 *     tags:
 *       - Appointments
 *     parameters:
 *       - in: header
 *         name: x-user-role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [admin]
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *         example: "2099-06-10T09:00:00+10:00"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *         example: "2099-06-11T09:00:00+10:00"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of appointments
 *       400:
 *         description: Invalid query
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden
 */
appointmentRouter.get(
  "/appointments",
  simulateAuth,
  requireRole("admin"),
  validateRequest(adminAppointmentsQuerySchema, "query"),
  listAllAppointmentsHandler
);
