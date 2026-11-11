import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El seed de demostración no se puede ejecutar en producción.");
  }
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Configura SEED_DEMO_PASSWORD con al menos 12 caracteres en el entorno local.");
  }
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: "admin@biodentis.com" },
    update: {},
    create: {
      email: "admin@biodentis.com",
      passwordHash,
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "BIODENTIS",
    },
  });

  await prisma.user.upsert({
    where: { email: "recepcion@biodentis.com" },
    update: {},
    create: {
      email: "recepcion@biodentis.com",
      passwordHash,
      role: Role.RECEPTIONIST,
      firstName: "María",
      lastName: "García",
      phone: "555-0101",
    },
  });

  const dentistUser = await prisma.user.upsert({
    where: { email: "dr.martinez@biodentis.com" },
    update: {},
    create: {
      email: "dr.martinez@biodentis.com",
      passwordHash,
      role: Role.DENTIST,
      firstName: "Carlos",
      lastName: "Martínez",
      phone: "555-0102",
    },
  });

  const dentist = await prisma.dentist.upsert({
    where: { userId: dentistUser.id },
    update: {},
    create: { userId: dentistUser.id, specialty: "Odontología General" },
  });

  await prisma.user.upsert({
    where: { email: "paciente@biodentis.com" },
    update: {},
    create: {
      email: "paciente@biodentis.com",
      passwordHash,
      role: Role.PATIENT,
      firstName: "Ana",
      lastName: "López",
      phone: "555-0103",
    },
  });

  const schedule = [
    { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 1, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 2, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 4, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 4, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 5, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 5, startTime: "14:00", endTime: "18:00" },
  ];

  for (const slot of schedule) {
    await prisma.availability.upsert({
      where: { dentistId_dayOfWeek: { dentistId: dentist.id, dayOfWeek: slot.dayOfWeek } },
      update: { startTime: slot.startTime, endTime: slot.endTime },
      create: { dentistId: dentist.id, ...slot },
    });
  }

  // ── Catalogo de tratamientos ────────────────────────────────
  // Precios de lista en PEN. Alimentan el KPI de ingresos estimados.
  const treatments = [
    { name: "Limpieza Dental & Profilaxis", category: "Higiene", durationMinutes: 45, price: "120.00" },
    { name: "Evaluación Inicial & Diagnóstico", category: "Diagnóstico", durationMinutes: 30, price: "80.00" },
    { name: "Endodoncia Molar", category: "Endodoncia", durationMinutes: 60, price: "450.00" },
    { name: "Revisión de Ortodoncia", category: "Ortodoncia", durationMinutes: 30, price: "150.00" },
    { name: "Instalación de Brackets", category: "Ortodoncia", durationMinutes: 90, price: "1200.00" },
    { name: "Extracción Tercer Molar", category: "Cirugía", durationMinutes: 90, price: "600.00" },
    { name: "Implante Dental Unitario", category: "Implantes", durationMinutes: 120, price: "2500.00" },
    { name: "Resina Compuesta", category: "Restauración", durationMinutes: 45, price: "180.00" },
  ];

  for (const t of treatments) {
    const existing = await prisma.treatment.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.treatment.update({ where: { id: existing.id }, data: t });
    } else {
      await prisma.treatment.create({ data: t });
    }
  }

  // ── Sillones y salas ────────────────────────────────────────
  const units = [
    { name: "Sillón 1", type: "SILLON" as const },
    { name: "Sillón 2", type: "SILLON" as const },
    { name: "Sillón 3", type: "SILLON" as const },
    { name: "Quirófano 1", type: "QUIRURGICO" as const },
    { name: "Sala de Radiología", type: "RADIOLOGICO" as const },
  ];

  for (const u of units) {
    const existing = await prisma.dentalUnit.findFirst({ where: { name: u.name } });
    if (!existing) await prisma.dentalUnit.create({ data: u });
  }

  // ── Insumos clinicos ────────────────────────────────────────
  const inventory = [
    { sku: "ANE-LID-2", name: "Anestésico Lidocaína 2%", category: "Anestesia", stock: 6, minStock: 20, unit: "cartuchos" },
    { sku: "GUA-NIT-M", name: "Guantes de Nitrilo Talla M", category: "Bioseguridad", stock: 240, minStock: 100, unit: "pares" },
    { sku: "RES-A2", name: "Resina Compuesta A2", category: "Restauración", stock: 14, minStock: 10, unit: "jeringas" },
    { sku: "AGU-30G", name: "Agujas Dentales 30G", category: "Anestesia", stock: 45, minStock: 60, unit: "unidades" },
  ];

  for (const item of inventory) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: { minStock: item.minStock },
      create: item,
    });
  }

  // Meta de ingresos diaria que muestra el dashboard.
  await prisma.systemSetting.upsert({
    where: { key: "dashboard_daily_revenue_goal" },
    update: {},
    create: { key: "dashboard_daily_revenue_goal", value: "1800", type: "NUMBER" },
  });

  // ── Odontologos adicionales ─────────────────────────────────
  const extraDentists = [
    { email: "dra.rivas@biodentis.com", firstName: "Sofía", lastName: "Rivas", specialty: "Endodoncia", license: "COP-45210", university: "UNMSM", shift: "Turno Mañana" },
    { email: "dr.valdes@biodentis.com", firstName: "Andrés", lastName: "Valdés", specialty: "Cirugía Maxilofacial", license: "COP-38874", university: "UPCH", shift: "Turno Tarde" },
  ];

  // Por createdAt para conservar el orden de inserción: Sillón 1..3, Quirófano, Radiología.
  const allUnits = await prisma.dentalUnit.findMany({ orderBy: { createdAt: "asc" } });
  const dentistRecords = [dentist];

  for (const [index, d] of extraDentists.entries()) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash,
        role: Role.DENTIST,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: `555-020${index + 1}`,
      },
    });

    const record = await prisma.dentist.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialty: d.specialty,
        licenseNumber: d.license,
        university: d.university,
        shiftLabel: d.shift,
        assignedUnitId: allUnits[index + 1]?.id,
      },
    });
    dentistRecords.push(record);

    // Lunes a viernes, jornada completa.
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await prisma.availability.upsert({
        where: { dentistId_dayOfWeek: { dentistId: record.id, dayOfWeek } },
        update: {},
        create: { dentistId: record.id, dayOfWeek, startTime: "08:00", endTime: "16:00" },
      });
    }
  }

  // Completa la ficha del odontologo base con sus datos profesionales.
  await prisma.dentist.update({
    where: { id: dentist.id },
    data: {
      licenseNumber: "COP-51033",
      university: "UNMSM",
      shiftLabel: "Turno Mañana / Tarde",
      assignedUnitId: allUnits[0]?.id,
    },
  });

  // ── Pacientes de prueba ─────────────────────────────────────
  // Mezcla deliberada: activos e inactivos, con y sin citas, altas de varios
  // meses, para que los KPIs y todos los filtros del directorio tengan datos.
  const patientSeeds = [
    { firstName: "Valentina", lastName: "Morales Gómez", email: "v.morales@correo.com", phone: "+51 984 129 031", address: "Av. Arequipa 1240, Dpto 802, Lima", monthsAgo: 12, active: true },
    { firstName: "Joaquín", lastName: "Silva Navarrete", email: "j.silva.n@correo.com", phone: "+51 973 114 452", address: "Los Alerces 415, San Isidro", monthsAgo: 20, active: true },
    { firstName: "Emilia", lastName: "Castillo Rojas", email: "emilia.castillo@correo.com", phone: "+51 965 201 198", address: "Las Hualtatas 6320, Miraflores", monthsAgo: 8, active: true },
    { firstName: "Matías", lastName: "Alarcón Prado", email: "m.alarcon@correo.com", phone: "+51 991 248 830", address: "Av. Grecia 2045, Surco", monthsAgo: 26, active: false },
    { firstName: "Camila", lastName: "Bravo Vergara", email: "camila.bravo@correo.com", phone: "+51 944 197 205", address: "Monseñor Edwards 110, La Molina", monthsAgo: 11, active: true },
    { firstName: "Fernando", lastName: "Ruiz Pavez", email: "f.ruiz@correo.com", phone: "+51 978 023 314", address: "Pasaje Los Maitenes 89, Callao", monthsAgo: 4, active: true },
    { firstName: "Sofía", lastName: "Hevia Lira", email: "sofia.hevia@correo.com", phone: "+51 953 209 019", address: "San Sebastián 2812, San Borja", monthsAgo: 22, active: true },
    { firstName: "Gonzalo", lastName: "Cifuentes Mora", email: "g.cifuentes@correo.com", phone: "+51 932 110 048", address: "Alonso de Córdova 3910, Miraflores", monthsAgo: 25, active: false },
    { firstName: "Rocío", lastName: "Peña Zamora", email: "rocio.pena@correo.com", phone: "+51 987 445 120", address: "Jr. Puno 455, Cercado de Lima", monthsAgo: 6, active: true },
    { firstName: "Ignacio", lastName: "Fuentes Lara", email: "i.fuentes@correo.com", phone: "+51 962 883 771", address: "Av. Brasil 1820, Jesús María", monthsAgo: 3, active: true },
    { firstName: "Antonia", lastName: "Reyes Cortés", email: "a.reyes@correo.com", phone: "+51 915 330 902", address: "Calle Schell 210, Miraflores", monthsAgo: 15, active: true },
    { firstName: "Diego", lastName: "Salazar Núñez", email: "d.salazar@correo.com", phone: "+51 946 771 233", address: "Av. Javier Prado 4500, Surco", monthsAgo: 1, active: true },
    { firstName: "Paula", lastName: "Contreras Vidal", email: "p.contreras@correo.com", phone: "+51 903 118 447", address: "Los Nogales 78, San Miguel", monthsAgo: 0, active: true },
    { firstName: "Tomás", lastName: "Aguilar Soto", email: "t.aguilar@correo.com", phone: "+51 998 220 116", address: "Av. Universitaria 900, Los Olivos", monthsAgo: 0, active: true },
    { firstName: "Javiera", lastName: "Muñoz Tapia", email: "j.munoz@correo.com", phone: "+51 971 664 508", address: "Jr. Camaná 1150, Cercado", monthsAgo: 18, active: true },
    { firstName: "Sebastián", lastName: "Poblete Díaz", email: "s.poblete@correo.com", phone: "+51 955 019 887", address: "Av. La Marina 2300, San Miguel", monthsAgo: 30, active: false },
  ];

  const createdPatients = [];
  for (const [index, p] of patientSeeds.entries()) {
    const createdAt = new Date();
    createdAt.setMonth(createdAt.getMonth() - p.monthsAgo);

    const patient = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash,
        role: Role.PATIENT,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        address: p.address,
        isActive: p.active,
        createdAt,
        patientCode: `#PAC-${String(1000 + index + 1).padStart(4, "0")}`,
      },
    });
    createdPatients.push(patient);
  }

  // ── Planes de tratamiento en curso ──────────────────────────
  const orthodontics = await prisma.treatment.findFirst({ where: { category: "Ortodoncia" } });
  const endodontics = await prisma.treatment.findFirst({ where: { category: "Endodoncia" } });
  const implants = await prisma.treatment.findFirst({ where: { category: "Implantes" } });
  const cleaning = await prisma.treatment.findFirst({ where: { category: "Higiene" } });
  const evaluation = await prisma.treatment.findFirst({ where: { category: "Diagnóstico" } });
  const surgery = await prisma.treatment.findFirst({ where: { category: "Cirugía" } });

  const planSpecs = [
    { treatment: orthodontics, patientIndex: 0, dentistIndex: 0, totalSessions: 12, completed: 5 },
    { treatment: orthodontics, patientIndex: 4, dentistIndex: 0, totalSessions: 10, completed: 3 },
    { treatment: endodontics, patientIndex: 1, dentistIndex: 1, totalSessions: 3, completed: 1 },
    { treatment: endodontics, patientIndex: 8, dentistIndex: 1, totalSessions: 3, completed: 2 },
    { treatment: implants, patientIndex: 6, dentistIndex: 2, totalSessions: 4, completed: 1 },
    { treatment: implants, patientIndex: 10, dentistIndex: 2, totalSessions: 4, completed: 3 },
  ];

  const createdPlans = new Map<number, { id: string; sessionNumber: number }>();
  for (const spec of planSpecs) {
    if (!spec.treatment) continue;
    const patient = createdPatients[spec.patientIndex];
    const assignedDentist = dentistRecords[spec.dentistIndex];
    if (!patient || !assignedDentist) continue;

    const existing = await prisma.treatmentPlan.findFirst({
      where: { patientId: patient.id, treatmentId: spec.treatment.id, status: "ACTIVE" },
    });
    const plan =
      existing ??
      (await prisma.treatmentPlan.create({
        data: {
          patientId: patient.id,
          dentistId: assignedDentist.id,
          treatmentId: spec.treatment.id,
          totalSessions: spec.totalSessions,
          completedSessions: spec.completed,
        },
      }));
    createdPlans.set(spec.patientIndex, { id: plan.id, sessionNumber: spec.completed + 1 });
  }

  // ── Citas ───────────────────────────────────────────────────
  const today = new Date();
  const dayOnly = (offsetDays: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    d.setDate(d.getDate() + offsetDays);
    return d;
  };

  /**
   * `dayOffset` 0 = hoy. Se siembran citas de hoy (agenda y sala de espera),
   * de ayer (para la comparativa "vs ayer") y pasadas (historial del paciente).
   */
  const appointmentSpecs = [
    // Hoy: la agenda que ve el dashboard.
    { patientIndex: 0, dentistIndex: 0, dayOffset: 0, startTime: "09:00", endTime: "09:45", treatment: cleaning, unitIndex: 0, status: "CONFIRMED", waitingStatus: "WAITING", checkedInMinutesAgo: 8 },
    { patientIndex: 1, dentistIndex: 1, dayOffset: 0, startTime: "10:15", endTime: "11:15", treatment: endodontics, unitIndex: 2, status: "PENDING", waitingStatus: "WAITING", checkedInMinutesAgo: 2 },
    { patientIndex: 4, dentistIndex: 0, dayOffset: 0, startTime: "11:30", endTime: "12:00", treatment: orthodontics, unitIndex: 0, status: "CONFIRMED", waitingStatus: "NOT_ARRIVED" },
    { patientIndex: 6, dentistIndex: 2, dayOffset: 0, startTime: "12:45", endTime: "14:15", treatment: surgery, unitIndex: 3, status: "CONFIRMED", waitingStatus: "TRIAGE", checkedInMinutesAgo: 15, priority: "EMERGENCY" },
    { patientIndex: 2, dentistIndex: 1, dayOffset: 0, startTime: "14:30", endTime: "15:00", treatment: evaluation, unitIndex: 1, status: "CANCELLED", waitingStatus: "NOT_ARRIVED" },
    { patientIndex: 8, dentistIndex: 1, dayOffset: 0, startTime: "15:15", endTime: "15:45", treatment: cleaning, unitIndex: 1, status: "COMPLETED", waitingStatus: "DONE" },
    { patientIndex: 10, dentistIndex: 2, dayOffset: 0, startTime: "16:00", endTime: "17:00", treatment: implants, unitIndex: 3, status: "COMPLETED", waitingStatus: "DONE" },
    { patientIndex: 9, dentistIndex: 0, dayOffset: 0, startTime: "17:15", endTime: "17:45", treatment: evaluation, unitIndex: 0, status: "PENDING", waitingStatus: "NOT_ARRIVED" },

    // Ayer: base de comparacion de los KPIs.
    { patientIndex: 3, dentistIndex: 0, dayOffset: -1, startTime: "09:00", endTime: "09:30", treatment: cleaning, unitIndex: 0, status: "COMPLETED" },
    { patientIndex: 5, dentistIndex: 1, dayOffset: -1, startTime: "10:00", endTime: "10:45", treatment: evaluation, unitIndex: 1, status: "COMPLETED" },
    { patientIndex: 7, dentistIndex: 2, dayOffset: -1, startTime: "11:00", endTime: "12:00", treatment: endodontics, unitIndex: 2, status: "COMPLETED" },
    { patientIndex: 11, dentistIndex: 0, dayOffset: -1, startTime: "15:00", endTime: "15:30", treatment: cleaning, unitIndex: 0, status: "NO_SHOW" },

    // Historial pasado.
    { patientIndex: 0, dentistIndex: 0, dayOffset: -40, startTime: "10:30", endTime: "11:15", treatment: cleaning, unitIndex: 0, status: "COMPLETED" },
    { patientIndex: 0, dentistIndex: 1, dayOffset: -120, startTime: "16:00", endTime: "16:30", treatment: orthodontics, unitIndex: 1, status: "COMPLETED" },
    { patientIndex: 0, dentistIndex: 0, dayOffset: -200, startTime: "11:15", endTime: "11:45", treatment: evaluation, unitIndex: 0, status: "CANCELLED" },
    { patientIndex: 1, dentistIndex: 1, dayOffset: -60, startTime: "09:30", endTime: "10:30", treatment: endodontics, unitIndex: 2, status: "COMPLETED" },
    { patientIndex: 2, dentistIndex: 0, dayOffset: -90, startTime: "14:00", endTime: "14:30", treatment: cleaning, unitIndex: 0, status: "COMPLETED" },
    { patientIndex: 4, dentistIndex: 0, dayOffset: -30, startTime: "12:00", endTime: "12:30", treatment: orthodontics, unitIndex: 0, status: "COMPLETED" },
    { patientIndex: 6, dentistIndex: 2, dayOffset: -75, startTime: "08:30", endTime: "10:30", treatment: implants, unitIndex: 3, status: "COMPLETED" },
    { patientIndex: 14, dentistIndex: 1, dayOffset: -150, startTime: "13:00", endTime: "13:30", treatment: evaluation, unitIndex: 1, status: "COMPLETED" },
  ] as const;

  for (const spec of appointmentSpecs) {
    const patient = createdPatients[spec.patientIndex];
    const assignedDentist = dentistRecords[spec.dentistIndex];
    if (!patient || !assignedDentist || !spec.treatment) continue;

    const date = dayOnly(spec.dayOffset);
    const plan = spec.dayOffset === 0 ? createdPlans.get(spec.patientIndex) : undefined;

    // Comprueba el fixture sin depender de una clave que incluya citas canceladas.
    const existing = await prisma.appointment.findFirst({
      where: {
          dentistId: assignedDentist.id,
          date,
          startTime: spec.startTime,
      },
    });
    if (existing) continue;

    const checkInAt =
      "checkedInMinutesAgo" in spec && spec.checkedInMinutesAgo !== undefined
        ? new Date(Date.now() - spec.checkedInMinutesAgo * 60_000)
        : null;

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        dentistId: assignedDentist.id,
        treatmentId: spec.treatment.id,
        dentalUnitId: allUnits[spec.unitIndex]?.id,
        treatmentPlanId: plan?.id,
        sessionNumber: plan?.sessionNumber,
        date,
        startTime: spec.startTime,
        endTime: spec.endTime,
        status: spec.status,
        waitingStatus: "waitingStatus" in spec ? spec.waitingStatus : "NOT_ARRIVED",
        priority: "priority" in spec ? spec.priority : "NORMAL",
        checkInAt,
      },
    });
  }

  // Codigo visible para los pacientes que aun no lo tengan (#PAC-0001...).
  const patientsWithoutCode = await prisma.user.findMany({
    where: { role: Role.PATIENT, patientCode: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const offset = await prisma.user.count({ where: { role: Role.PATIENT, patientCode: { not: null } } });
  for (const [index, patient] of patientsWithoutCode.entries()) {
    await prisma.user.update({
      where: { id: patient.id },
      data: { patientCode: `#PAC-${String(offset + index + 1).padStart(4, "0")}` },
    });
  }

  console.log("Seed completado!");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
