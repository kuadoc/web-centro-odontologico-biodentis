/** Appointment.date representa una fecha civil (SQL DATE), no un instante. */
export function appointmentInstant(date: Date, time: string): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T${time}:00-05:00`);
}

export function clinicDateKey(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
