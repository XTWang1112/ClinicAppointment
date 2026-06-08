export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export class RequestValidationError extends AppError {
  constructor(details?: unknown) {
    super(400, "Validation failed", details);
    this.name = "RequestValidationError";
  }
}

export class UnAuthenticatedError extends AppError {
  constructor() {
    super(401, "Current role is not authenticated");
    this.name = "UnAuthenticatedError";
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, "Access forbidden");
    this.name = "ForbiddenError";
  }
}

export class ClinicianNotFoundError extends AppError {
  constructor() {
    super(404, "Clinician does not exist");
    this.name = "ClinicianNotFoundError";
  }
}

export class PatientNotFoundError extends AppError {
  constructor() {
    super(404, "Patient does not exist");
    this.name = "PatientNotFoundError";
  }
}

export class AppointmentOverlapError extends AppError {
  constructor() {
    super(409, "Appointment overlaps with existing appointment");
    this.name = "AppointmentOverlapError";
  }
}
