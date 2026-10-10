import { AppointmentStatus } from "@biodentis/shared-types";

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;

export function canCancelOrReschedule(appointmentDate: Date, appointmentTime: string, now: Date = new Date()): boolean {
  const [hours, minutes] = appointmentTime.split(":").map(Number) as [number, number];
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  return appointmentDateTime.getTime() - now.getTime() >= HOURS_24_IN_MS;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const [startH, startM] = startTime.split(":").map(Number) as [number, number];
  const [endH, endM] = endTime.split(":").map(Number) as [number, number];
  return endH * 60 + endM > startH * 60 + startM;
}

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED, AppointmentStatus.PENDING],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.NO_SHOW]: [],
  [AppointmentStatus.CANCELLED]: [],
};

export function isValidTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** HU-12: el odontologo solo ve citas ya validadas por Recepcion o atendidas. */
export const DENTIST_VISIBLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];
