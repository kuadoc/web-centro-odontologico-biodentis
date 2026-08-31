import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
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

  const receptionist = await prisma.user.upsert({
    where: { email: "recepcion@biodentis.com" },
    update: {},
    create: {
      email: "recepcion@biodentis.com",
      passwordHash,
      role: Role.RECEPTIONIST,
      firstName: "Maria",
      lastName: "Garcia",
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
      lastName: "Martinez",
      phone: "555-0102",
    },
  });

  const dentist = await prisma.dentist.upsert({
    where: { userId: dentistUser.id },
    update: {},
    create: {
      userId: dentistUser.id,
      specialty: "Odontologia General",
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: "paciente@biodentis.com" },
    update: {},
    create: {
      email: "paciente@biodentis.com",
      passwordHash,
      role: Role.PATIENT,
      firstName: "Ana",
      lastName: "Lopez",
      phone: "555-0103",
    },
  });

  const mondayToFriday = [
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

  for (const slot of mondayToFriday) {
    await prisma.availability.upsert({
      where: { dentistId_dayOfWeek: { dentistId: dentist.id, dayOfWeek: slot.dayOfWeek } },
      update: { startTime: slot.startTime, endTime: slot.endTime },
      create: {
        dentistId: dentist.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
  }

  await prisma.clinic.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Centro Odontologico BIODENTIS",
      address: "Av. Principal 123, Ciudad",
      phone: "555-0000",
      generalHours: "Lunes a Viernes 8:00-12:00, 14:00-18:00",
    },
  });

  console.log("Seed completed!");
  console.log("  Admin: admin@biodentis.com / password123");
  console.log("  Recepcion: recepcion@biodentis.com / password123");
  console.log("  Odontologo: dr.martinez@biodentis.com / password123");
  console.log("  Paciente: paciente@biodentis.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
