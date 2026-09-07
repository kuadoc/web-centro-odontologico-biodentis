import { z } from "zod";

export const RoleSchema = z.enum(["PATIENT", "RECEPTIONIST", "DENTIST", "ADMIN"]);
export const AppointmentStatusSchema = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]);
export const DentalUnitTypeSchema = z.enum(["SILLON", "QUIRURGICO", "RADIOLOGICO"]);
export const DentalUnitStatusSchema = z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]);
export const ExceptionScopeSchema = z.enum(["DENTIST", "CLINIC", "UNIT"]);
export const ExceptionStatusSchema = z.enum(["PENDING", "CONFIRMED", "CANCELLED"]);
export const SettingTypeSchema = z.enum(["NUMBER", "STRING", "BOOLEAN"]);
