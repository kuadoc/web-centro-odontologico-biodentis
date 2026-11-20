import { clinicContact } from "@/lib/clinic-contact";
import { clinicLocation } from "@/lib/clinic-location";

// Contenido institucional tomado de la sección principal del HTML de referencia.
// Mantener aquí los datos que se repiten en contacto, horarios y metadatos.
export const clinic = {
  name: "BIODENTIS",
  ...clinicLocation,
  phone: clinicContact.displayPhone,
  internationalPhone: clinicContact.internationalPhone,
  phoneHref: clinicContact.phoneHref,
  whatsapp: clinicContact.whatsapp,
  email: "contacto@biodentis.cl",
  weekdayHours: "08:00 – 18:00",
  saturdayHours: "09:00 – 14:00",
} as const;

