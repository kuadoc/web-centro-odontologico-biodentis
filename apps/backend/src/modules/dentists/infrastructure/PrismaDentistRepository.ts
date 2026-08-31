import { PrismaClient } from "@prisma/client";
import {
  DentistRepository,
  DentistProfile,
  AvailabilitySlot,
  ScheduleExceptionData,
} from "../domain/DentistRepository";

const prisma = new PrismaClient();

export class PrismaDentistRepository implements DentistRepository {
  async findById(id: string): Promise<DentistProfile | null> {
    const dentist = await prisma.dentist.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!dentist) return null;
    return {
      id: dentist.id,
      userId: dentist.userId,
      specialty: dentist.specialty,
      user: dentist.user,
    };
  }

  async findAll(): Promise<DentistProfile[]> {
    const dentists = await prisma.dentist.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return dentists.map((d) => ({
      id: d.id,
      userId: d.userId,
      specialty: d.specialty,
      user: d.user,
    }));
  }

  async create(data: { userId: string; specialty: string }): Promise<DentistProfile> {
    const dentist = await prisma.dentist.create({
      data,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return {
      id: dentist.id,
      userId: dentist.userId,
      specialty: dentist.specialty,
      user: dentist.user,
    };
  }

  async getAvailability(dentistId: string): Promise<AvailabilitySlot[]> {
    return prisma.availability.findMany({ where: { dentistId } });
  }

  async setAvailability(dentistId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<AvailabilitySlot> {
    return prisma.availability.upsert({
      where: { dentistId_dayOfWeek: { dentistId, dayOfWeek } },
      update: { startTime, endTime },
      create: { dentistId, dayOfWeek, startTime, endTime },
    });
  }

  async getScheduleExceptions(dentistId: string, date: Date): Promise<ScheduleExceptionData | null> {
    const exception = await prisma.scheduleException.findUnique({
      where: { dentistId_date: { dentistId, date } },
    });
    return exception;
  }

  async addScheduleException(dentistId: string, date: Date, reason?: string): Promise<ScheduleExceptionData> {
    return prisma.scheduleException.create({
      data: { dentistId, date, reason },
    });
  }
}
