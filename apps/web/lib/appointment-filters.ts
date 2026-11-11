import type { Appointment } from "@biodentis/shared-types";

export interface AppointmentListFilters {
  search: string;
  status: string;
  from?: string;
  to?: string;
}

const normalize = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Filtra únicamente el listado ya autorizado por la API, usando fechas civiles. */
export function filterAppointments(appointments: Appointment[], filters: AppointmentListFilters): Appointment[] {
  const terms = normalize(filters.search).split(/\s+/).filter(Boolean);
  if (filters.from && filters.to && filters.from > filters.to) return [];

  return appointments.filter((appointment) => {
    if (!appointment.patient || !appointment.dentist) return false;
    if (filters.status && appointment.status !== filters.status) return false;

    // La API serializa Appointment.date como YYYY-MM-DD o ISO a medianoche UTC.
    // Comparar el día civil evita desplazarlo al día anterior al mostrarlo en Lima.
    const date = appointment.date.slice(0, 10);
    if (filters.from && date < filters.from) return false;
    if (filters.to && date > filters.to) return false;

    if (!terms.length) return true;
    const fields = [
      `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      `${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}`,
      appointment.patient.dni ?? "",
    ].map(normalize);
    return fields.some((field) => terms.every((term) => field.includes(term)));
  });
}
