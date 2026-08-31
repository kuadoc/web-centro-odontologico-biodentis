import { z } from "zod";

export const RoleSchema = z.enum(["PATIENT", "RECEPTIONIST", "DENTIST", "ADMIN"]);
export const AppointmentStatusSchema = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]);
