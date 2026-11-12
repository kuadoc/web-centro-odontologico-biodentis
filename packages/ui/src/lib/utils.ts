import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function displayDate(date: string | Date, timeZone: string): string {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return "—"
  return new Intl.DateTimeFormat("es-PE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

/** Instantes reales (registro, auditoría, sesiones), expresados en hora de Lima. */
export function formatDate(date: string | Date): string {
  return displayDate(date, "America/Lima")
}

/** Fechas civiles de citas (SQL DATE): conservar el día sin conversión horaria. */
export function formatCalendarDate(date: string | Date): string {
  const value = typeof date === "string" ? `${date.slice(0, 10)}T00:00:00.000Z` : date
  return displayDate(value, "UTC")
}

export function formatTime(time: string): string {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(time) ? time.slice(0, 5) : "—"
}

export function formatDateTime(date: string | Date): string {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return "—"
  const time = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value)
  return `${formatDate(value)}, ${time}`
}
