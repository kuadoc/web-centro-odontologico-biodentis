import { createHash } from "node:crypto";
import { AppointmentStatus, Prisma, Role, type PrismaClient } from "@prisma/client";
import { clinicDateKey } from "../lib/clinic-calendar";
import { nextPatientCode } from "../modules/patients/patient-code.repository";

export const LOCAL_SEED_VERSION = 3;

/** Conservar el namespace v2 permite actualizar fixtures anteriores sin duplicarlos. */
export function seedId(key: string): string {
  const hex = createHash("sha256").update(`biodentis-local-v2:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function readLocalSeedConfig(env: NodeJS.ProcessEnv) {
  const fail = (message: string): never => {
    const error = new Error(message);
    error.name = "LocalSeedConfigError";
    throw error;
  };
  if (env.NODE_ENV === "production") fail("El seed local no se puede ejecutar en producción.");
  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    let connection: URL;
    try { connection = new URL(env[key] ?? ""); }
    catch { return fail(`Configura ${key} con una URL PostgreSQL local válida.`); }
    if (!["postgres:", "postgresql:"].includes(connection.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname)) {
      fail(`${key} debe apuntar a localhost, 127.0.0.1 o [::1]. Este seed restaura contraseñas demo y solo admite bases locales.`);
    }
    if (!connection.pathname || connection.pathname === "/") fail(`${key} debe indicar el nombre de la base local.`);
  }
  const password = env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return fail("Configura SEED_DEMO_PASSWORD con al menos 12 caracteres y como máximo 72 bytes en apps/web/.env.");
  }
  return { password };
}

/** Fecha civil SQL DATE basada en Lima, independiente de la zona del servidor. */
export function seedDate(offset: number, now: Date): Date {
  const date = new Date(`${clinicDateKey(now)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

const dentistSpecs = [
  { email: "dr.martinez@biodentis.com", firstName: "Carlos", lastName: "Martínez", specialty: "Odontología General", license: "DEMO-COP-51033" },
  { email: "dra.rivas@biodentis.com", firstName: "Sofía", lastName: "Rivas", specialty: "Endodoncia", license: "DEMO-COP-45210" },
  { email: "dr.valdes@biodentis.com", firstName: "Andrés", lastName: "Valdés", specialty: "Cirugía Oral", license: "DEMO-COP-38874" },
] as const;

const patientNames = [
  ["Ana", "López"], ["Valentina", "Morales"], ["Joaquín", "Silva"], ["Emilia", "Castillo"],
  ["Camila", "Bravo"], ["Fernando", "Ruiz"], ["Rocío", "Peña"], ["Ignacio", "Fuentes"],
  ["Antonia", "Reyes"], ["Diego", "Salazar"], ["Paula", "Contreras"], ["Tomás", "Aguilar"],
] as const;

const serviceSpecs = [
  { name: "Evaluación odontológica", durationMinutes: 30, price: "80.00", specialty: 0 },
  { name: "Limpieza y profilaxis", durationMinutes: 45, price: "120.00", specialty: 0 },
  { name: "Restauración con resina", durationMinutes: 45, price: "180.00", specialty: 0 },
  { name: "Evaluación endodóntica", durationMinutes: 30, price: "100.00", specialty: 1 },
  { name: "Tratamiento de conducto", durationMinutes: 60, price: "450.00", specialty: 1 },
  { name: "Control endodóntico", durationMinutes: 30, price: "80.00", specialty: 1 },
  { name: "Evaluación quirúrgica", durationMinutes: 30, price: "100.00", specialty: 2 },
  { name: "Extracción dental", durationMinutes: 60, price: "300.00", specialty: 2 },
  { name: "Control posoperatorio", durationMinutes: 30, price: "60.00", specialty: 2 },
] as const;

export function buildLocalAppointments(now: Date) {
  return dentistSpecs.flatMap((_, dentist) => {
    const patient = dentist * 3;
    const service = dentist * 3;
    return [
      { key: "history-1", offset: -30, time: "09:00", patient, service: service + 1, status: AppointmentStatus.COMPLETED, session: 1 },
      { key: "history-2", offset: -7, time: "09:00", patient, service: service + 1, status: AppointmentStatus.COMPLETED, session: 2 },
      { key: "no-show", offset: -1, time: "11:00", patient: patient + 1, service, status: AppointmentStatus.NO_SHOW },
      { key: "today-confirmed", offset: 0, time: "09:00", patient: patient + 1, service, status: AppointmentStatus.CONFIRMED },
      { key: "today-pending", offset: 0, time: "11:00", patient: patient + 2, service, status: AppointmentStatus.PENDING },
      { key: "today-confirmed-2", offset: 0, time: "15:00", patient, service: service + 1, status: AppointmentStatus.CONFIRMED },
      { key: "future-pending", offset: 3, time: "09:00", patient: patient + 2, service, status: AppointmentStatus.PENDING },
      { key: "future-confirmed", offset: 4, time: "10:00", patient, service: service + 1, status: AppointmentStatus.CONFIRMED, session: 3 },
      { key: "cancelled", offset: 5, time: "11:00", patient: patient + 1, service, status: AppointmentStatus.CANCELLED },
    ].map((spec) => {
      const treatment = serviceSpecs[spec.service]!;
      const minutes = Number(spec.time.slice(0, 2)) * 60 + Number(spec.time.slice(3)) + treatment.durationMinutes;
      return {
        ...spec, dentist, id: seedId(`appointment:${dentist}:${spec.key}`), date: seedDate(spec.offset, now),
        endTime: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      };
    });
  });
}

/** Todas las escrituras se confirman juntas; no envía correos ni crea sesiones. */
export async function seedLocal(prisma: PrismaClient, passwordHash: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const [schema] = await tx.$queryRaw<Array<{
      counters: string | null; outbox: string | null; sequence: string | null;
      history: string | null; checks: number; exclusion: boolean; triggers: number; dniUnique: boolean;
    }>>`SELECT to_regclass('public.auth_throttles')::text AS counters,
      to_regclass('public.email_outbox')::text AS outbox,
      to_regclass('public.patient_code_seq')::text AS sequence,
      to_regclass('public._prisma_migrations')::text AS history,
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
        WHERE n.nspname='public' AND c.contype='c' AND c.convalidated) AS checks,
      EXISTS(SELECT 1 FROM pg_constraint WHERE conname='appointments_no_overlap' AND convalidated) AS exclusion,
      (SELECT count(*)::int FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND t.tgenabled IN ('O','A') AND t.tgname IN (
          'clinical_record_matches_appointment','appointment_matches_clinical_record',
          'treatment_category_from_specialty','specialty_name_to_treatments')) AS triggers,
      EXISTS(SELECT 1 FROM pg_index i JOIN pg_class r ON r.oid=i.indexrelid
        JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public'
        AND r.relname='users_dni_key' AND i.indisunique AND i.indisvalid) AS "dniUnique"`;
    if (!schema?.counters || !schema.outbox || !schema.sequence || !schema.history || schema.checks < 15 || !schema.exclusion || schema.triggers !== 4 || !schema.dniUnique) {
      const error = new Error("El seed v3 requiere las cuatro migraciones aplicadas, incluidos triggers, restricciones, outbox y secuencia. Usa una BD local vacía migrada; el seed no repara ni borra datos anteriores.");
      error.name = "LocalSeedSchemaError";
      throw error;
    }
    const account = async (email: string, firstName: string, lastName: string, role: Role, index: number, isActive = true) => {
      const existing = await tx.user.findUnique({ where: { email }, select: { patientCode: true } });
      const patientCode = role === Role.PATIENT
        ? existing?.patientCode && /^#PAC-\d+$/.test(existing.patientCode) ? existing.patientCode : await nextPatientCode(tx)
        : undefined;
      const data = {
        firstName, lastName, role, passwordHash, isActive,
        phone: `900${String(index).padStart(6, "0")}`, address: "Dirección ficticia para pruebas locales, Lima",
        ...(role === Role.PATIENT ? { dni: String(90000000 + index), patientCode } : {}),
      };
      return tx.user.upsert({ where: { email }, update: data, create: { id: seedId(`user:${email}`), email, ...data } });
    };
    const admin = await account("admin@biodentis.com", "Admin", "Demo", Role.ADMIN, 1);
    const reception = await account("recepcion@biodentis.com", "María", "García", Role.RECEPTIONIST, 2);
    const dentists = [];
    const accounts = [admin, reception];
    for (const [index, spec] of dentistSpecs.entries()) {
      const user = await account(spec.email, spec.firstName, spec.lastName, Role.DENTIST, 10 + index);
      accounts.push(user);
      const unitData = { name: `Sillón demo ${index + 1}`, type: "SILLON" as const, status: "ACTIVE" as const, description: "Fixture local v3" };
      const unit = await tx.dentalUnit.upsert({ where: { id: seedId(`unit:${index}`) }, update: unitData, create: { id: seedId(`unit:${index}`), ...unitData } });
      const specialty = await tx.specialty.upsert({ where: { name: spec.specialty }, update: { isActive: true }, create: { id: seedId(`specialty:${index}`), name: spec.specialty, description: "Especialidad de demostración local", isActive: true } });
      const data = {
        specialty: spec.specialty, licenseNumber: spec.license, university: "Universidad de demostración",
        shiftLabel: "Demo: todos los días 08:00–18:00", assignedUnitId: unit.id,
        specialties: { set: [{ id: specialty.id }] },
      };
      const dentist = await tx.dentist.upsert({
        where: { userId: user.id }, update: data,
        create: { ...data, id: seedId(`dentist:${index}`), userId: user.id, specialties: { connect: [{ id: specialty.id }] } },
      });
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        const hours = { startTime: "08:00", endTime: "18:00" };
        await tx.availability.upsert({ where: { dentistId_dayOfWeek: { dentistId: dentist.id, dayOfWeek } }, update: hours, create: { dentistId: dentist.id, dayOfWeek, ...hours } });
      }
      dentists.push({ dentist, user, unit, specialty });
    }
    const patients = [];
    for (const [index, [firstName, lastName]] of patientNames.entries()) {
      const email = index === 0 ? "paciente@biodentis.com" : `paciente${index + 1}@example.test`;
      const patient = await account(email, firstName, lastName, Role.PATIENT, 100 + index);
      patients.push(patient);
      accounts.push(patient);
    }
    accounts.push(await account("paciente.inactivo@example.test", "Paciente", "Inactivo", Role.PATIENT, 199, false));
    await tx.refreshToken.updateMany({ where: { userId: { in: accounts.map((user) => user.id) }, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetToken.deleteMany({ where: { userId: { in: accounts.map((user) => user.id) } } });

    const treatments = [];
    for (const [index, spec] of serviceSpecs.entries()) {
      const data = {
        name: spec.name, durationMinutes: spec.durationMinutes, price: spec.price,
        category: dentistSpecs[spec.specialty].specialty, specialtyId: dentists[spec.specialty]!.specialty.id,
        description: `${spec.name}. Servicio ficticio para pruebas del catálogo y reservas.`, isActive: true,
      };
      treatments.push(await tx.treatment.upsert({ where: { id: seedId(`treatment:${index}`) }, update: data, create: { id: seedId(`treatment:${index}`), ...data } }));
    }
    const plans = [];
    for (const [index, { dentist }] of dentists.entries()) {
      const data = {
        patientId: patients[index * 3]!.id, dentistId: dentist.id, treatmentId: treatments[index * 3 + 1]!.id,
        totalSessions: 3, completedSessions: 2, status: "ACTIVE" as const, startedAt: seedDate(-30, now),
        notes: "Plan demo: dos sesiones atendidas y una sesión futura.",
      };
      plans.push(await tx.treatmentPlan.upsert({ where: { id: seedId(`plan:${index}`) }, update: data, create: { id: seedId(`plan:${index}`), ...data } }));
    }
    let records = 0;
    const fixtures = buildLocalAppointments(now);
    // Nunca dejar trabajos de versiones previas que puedan enviar avisos demo.
    await tx.emailOutbox.deleteMany({ where: { appointmentId: { in: fixtures.map((spec) => spec.id) } } });
    // Una cita demo atendida manualmente vuelve a su estado inicial sin conservar
    // una nota incompatible con ese estado. Solo se afectan nuestras citas.
    await tx.clinicalRecord.deleteMany({
      where: { appointmentId: { in: fixtures.filter((spec) => spec.status !== "COMPLETED").map((spec) => spec.id) } },
    });
    // Mover temporalmente cada fixture a una fecha distinta evita colisiones con
    // el índice único antiguo al refrescar fechas al día siguiente. La transacción
    // oculta estos valores transitorios y los revierte si cualquier escritura falla.
    for (const [index, spec] of fixtures.entries()) {
      await tx.appointment.updateMany({ where: { id: spec.id }, data: { date: new Date(Date.UTC(9990, 0, index + 1)) } });
    }
    for (const spec of fixtures) {
      const { dentist, user, unit } = dentists[spec.dentist]!;
      const patient = patients[spec.patient]!;
      const cancelled = spec.status === "CANCELLED";
      const completed = spec.status === "COMPLETED";
      const data = {
        patientId: patient.id, dentistId: dentist.id, treatmentId: treatments[spec.service]!.id, dentalUnitId: unit.id,
        treatmentPlanId: spec.session ? plans[spec.dentist]!.id : null, sessionNumber: spec.session ?? null,
        date: spec.date, startTime: spec.time, endTime: spec.endTime, status: spec.status,
        notes: "Motivo: evaluación dental de demostración. Dolor: no. Tiempo del problema: una semana.",
        waitingStatus: completed ? "DONE" as const : spec.key === "today-confirmed" ? "WAITING" as const : "NOT_ARRIVED" as const,
        checkInAt: spec.key === "today-confirmed" ? new Date(now.getTime() - 5 * 60_000) : null,
        cancellationReason: cancelled ? "El paciente solicita cambiar su disponibilidad por motivos personales." : null,
        cancelledById: cancelled ? admin.id : null, cancelledAt: cancelled ? now : null,
      };
      await tx.appointment.upsert({ where: { id: spec.id }, update: data, create: { id: spec.id, ...data } });
      if (completed) {
        const note = { patientId: patient.id, dentistId: dentist.id, notes: "Diagnóstico: evaluación de demostración sin datos reales.\nTratamiento: procedimiento demo completado.\nPróximo control: en 1 mes.", createdAt: new Date(`${spec.date.toISOString().slice(0, 10)}T${spec.endTime}:00-05:00`) };
        await tx.clinicalRecord.upsert({ where: { appointmentId: spec.id }, update: note, create: { id: seedId(`record:${spec.id}`), appointmentId: spec.id, ...note } });
        records++;
        const audit = { userId: user.id, action: "CREATE_CLINICAL_RECORD", resourceType: "Appointment", resourceId: spec.id, details: "Registro ficticio del seed local v3", createdAt: note.createdAt };
        await tx.auditLog.upsert({ where: { id: seedId(`audit:record:${spec.id}`) }, update: audit, create: { id: seedId(`audit:record:${spec.id}`), ...audit } });
      }
      if ((spec.dentist === 0 && spec.key === "future-confirmed") ||
          (spec.dentist === 1 && spec.key === "cancelled") ||
          (spec.dentist === 2 && spec.key === "future-confirmed")) {
        const state = spec.dentist === 0 ? "REQUESTED" as const : spec.dentist === 1 ? "APPROVED" as const : "REJECTED" as const;
        const actor = { id: reception.id, name: `${reception.firstName} ${reception.lastName}`, role: reception.role };
        const reviewer = { id: admin.id, name: `${admin.firstName} ${admin.lastName}`, role: admin.role };
        const snapshot = { appointmentId: spec.id, patient: { id: patient.id, name: `${patient.firstName} ${patient.lastName}` }, dentist: { id: dentist.id, name: `${user.firstName} ${user.lastName}` }, date: spec.date.toISOString().slice(0, 10), startTime: spec.time, endTime: spec.endTime, requestedBy: actor };
        const cancellation = {
          appointmentId: spec.id, originalStatus: "CONFIRMED" as const, state, requestedById: reception.id,
          requestReason: "El paciente solicita cambiar su disponibilidad por motivos personales.", snapshot,
          activeAppointmentId: state === "REQUESTED" ? spec.id : null, reviewedById: state === "REQUESTED" ? null : admin.id,
          reviewerSnapshot: state === "REQUESTED" ? Prisma.DbNull : reviewer,
          reviewReason: state === "REQUESTED" ? null : "Revisión administrativa ficticia para probar el reporte local.",
          reviewedAt: state === "REQUESTED" ? null : now, createdAt: now,
        };
        await tx.appointmentCancellation.upsert({ where: { id: seedId(`cancellation:${spec.dentist}`) }, update: cancellation, create: { id: seedId(`cancellation:${spec.dentist}`), ...cancellation } });
        const audit = { userId: state === "REQUESTED" ? reception.id : admin.id, action: state === "REQUESTED" ? "REQUEST_APPOINTMENT_CANCELLATION" : state === "APPROVED" ? "APPROVE_APPOINTMENT_CANCELLATION" : "REJECT_APPOINTMENT_CANCELLATION", resourceType: "Appointment", resourceId: spec.id, details: JSON.stringify(snapshot), createdAt: now };
        await tx.auditLog.upsert({ where: { id: seedId(`audit:cancel:${spec.dentist}`) }, update: audit, create: { id: seedId(`audit:cancel:${spec.dentist}`), ...audit } });
      }
    }
    for (const [index, scope] of (["DENTIST", "CLINIC", "UNIT"] as const).entries()) {
      const date = seedDate(10 + index, now).toISOString().slice(0, 10);
      const data = { scope, status: "CONFIRMED" as const, dentistId: scope === "DENTIST" ? dentists[0]!.dentist.id : null, dentalUnitId: scope === "UNIT" ? dentists[1]!.unit.id : null, startDate: new Date(`${date}T00:00:00-05:00`), endDate: new Date(`${date}T23:59:59-05:00`), reason: `Excepción demo de ${scope}, sin citas afectadas.` };
      await tx.scheduleException.upsert({ where: { id: seedId(`exception:${scope}`) }, update: data, create: { id: seedId(`exception:${scope}`), ...data } });
    }
    const clinicData = { name: "BIODENTIS — Clínica Demo Local", address: "Av. Demostración 123, Lima (ficticia)", phone: "900000001", email: "clinica@example.test", rut: "20000000000", website: "https://example.test", generalHours: "Todos los días de 08:00 a 18:00 (horario demo)" };
    const clinic = await tx.clinic.findFirst();
    await tx.clinic.upsert({ where: { id: clinic?.id ?? seedId("clinic") }, update: clinicData, create: { id: seedId("clinic"), ...clinicData } });
    for (const item of [
      { sku: "DEMO-GUANTES", name: "Guantes de nitrilo demo", stock: 240, minStock: 100 },
      { sku: "DEMO-ANESTESIA", name: "Anestésico demo", stock: 6, minStock: 20 },
      { sku: "DEMO-RESINA", name: "Resina demo", stock: 0, minStock: 10 },
    ]) {
      const data = { ...item, category: "Demostración", unit: "unidades", isActive: true };
      await tx.inventoryItem.upsert({ where: { sku: item.sku }, update: data, create: { id: seedId(item.sku), ...data } });
    }
    const settings = [
      { key: "dashboard_daily_revenue_goal", value: "1800", type: "NUMBER" as const },
      { key: "password_min_length", value: "8", type: "NUMBER" as const },
      { key: "password_require_uppercase", value: "true", type: "BOOLEAN" as const },
      { key: "password_require_numbers", value: "true", type: "BOOLEAN" as const },
      { key: "password_require_special", value: "true", type: "BOOLEAN" as const },
      { key: "jwt_access_minutes", value: "15", type: "NUMBER" as const },
      { key: "jwt_refresh_days", value: "7", type: "NUMBER" as const },
      { key: "reminder_hours_before", value: "24", type: "NUMBER" as const },
      { key: "reminder_channels", value: "email", type: "STRING" as const },
    ];
    for (const data of settings) await tx.systemSetting.upsert({ where: { key: data.key }, update: data, create: data });
    for (const key of ["appointment_confirmation", "appointment_registration", "appointment_reminder", "appointment_cancelled", "password_reset", "welcome"]) {
      const subject = key === "password_reset" ? "Restablece tu contraseña — BIODENTIS demo" : key === "welcome" ? "Bienvenido a BIODENTIS demo" : "BIODENTIS demo — {patientName}";
      const body = key === "password_reset" ? "Hola {userName}, puedes restablecer tu contraseña en {resetLink}. Ejemplo ficticio; no contiene un token válido."
        : key === "welcome" ? "Hola {userName}, tu cuenta demo ha sido creada. Datos ficticios para desarrollo local."
        : "Hola {patientName}, tu cita demo es el {date} a las {time}. Datos ficticios para desarrollo local.";
      const data = { key, name: `Demo: ${key}`, subject, body, isActive: true };
      await tx.emailTemplate.upsert({ where: { key }, update: data, create: { id: seedId(`template:${key}`), ...data } });
    }
    return { version: LOCAL_SEED_VERSION, accounts: accounts.map(({ email, role, isActive }) => ({ email, role, activo: isActive })), appointments: fixtures.length, records };
  }, { timeout: 60_000, maxWait: 10_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
