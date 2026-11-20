import { AppointmentStatus } from "@biodentis/shared-types";

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;

export function canCancelOrReschedule(appointmentDate: Date, appointmentTime: string, now: Date = new Date()): boolean {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime) || !Number.isFinite(appointmentDate.getTime())) return false;
  const appointmentDateTime = new Date(`${appointmentDate.toISOString().slice(0, 10)}T${appointmentTime}:00-05:00`);
  return appointmentDateTime.getTime() - now.getTime() > HOURS_24_IN_MS;
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
