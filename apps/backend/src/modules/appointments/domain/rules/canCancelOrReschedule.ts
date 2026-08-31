const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;

export function canCancelOrReschedule(appointmentDate: Date, appointmentTime: string, now: Date = new Date()): boolean {
  const [hours, minutes] = appointmentTime.split(":").map(Number);
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  return appointmentDateTime.getTime() - now.getTime() >= HOURS_24_IN_MS;
}
