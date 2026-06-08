export type UserRole = "patient" | "clinician" | "admin";

export interface AuthUser {
  role: UserRole;
}
