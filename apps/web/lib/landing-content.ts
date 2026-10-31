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

export const specialties = [
  { name: "Odontología General", category: "General", description: "Prevención, diagnóstico y cuidado integral. Limpiezas ultrasónicas y restauraciones que cuidan la salud de tu sonrisa.", icon: "tooth" },
  { name: "Ortodoncia", category: "Especializada", description: "Brackets y alineadores invisibles con planificación digital para acompañarte hacia una sonrisa alineada y funcional.", icon: "ruler" },
  { name: "Endodoncia", category: "Especializada", description: "Tratamiento de conductos con tecnología microscópica para conservar tus dientes y tratar el origen del dolor.", icon: "healing" },
  { name: "Cirugía Maxilofacial", category: "Cirugía", description: "Extracciones complejas, implantes y regeneración ósea con una planificación precisa para cada procedimiento.", icon: "medical" },
  { name: "Periodoncia", category: "Especializada", description: "Cuidado especializado de encías y tejidos de soporte. Prevención y tratamiento de la enfermedad periodontal.", icon: "shield" },
  { name: "Odontopediatría", category: "Infantil", description: "Atención cercana para niños y adolescentes. Creamos hábitos saludables desde su primera visita al dentista.", icon: "child" },
  { name: "Radiología Dental", category: "Diagnóstico", description: "Imágenes digitales y tomografía 3D CBCT para obtener una visión detallada y planificar tu tratamiento.", icon: "scan" },
  { name: "Estética Dental", category: "Estética", description: "Diseño de sonrisa, carillas y blanqueamiento clínico. Resultados que buscan armonía y naturalidad.", icon: "sparkles" },
  { name: "Prótesis y Rehabilitación", category: "Rehabilitación", description: "Coronas, prótesis e implantes para recuperar la función, la comodidad y la confianza al sonreír.", icon: "layers" },
] as const;

