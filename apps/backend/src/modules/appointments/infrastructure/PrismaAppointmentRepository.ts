import { PrismaClient } from "@prisma/client";
import {
  AppointmentRepository,
  AppointmentData,
  AppointmentWithRelations,
} from "../domain/AppointmentRepository";
import { AppointmentStatus } from "@biodentis/shared-types";

const prisma = new PrismaClient();

export class PrismaAppointmentRepository implements AppointmentRepository {
  async findById(id: string): Promise<AppointmentWithRelations | null> {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    return appointment as AppointmentWithRelations | null;
  }

  async findByPatientId(patientId: string): Promise<AppointmentWithRelations[]> {
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: "desc" },
    });
    return appointments as AppointmentWithRelations[];
  }

  async findByDentistId(dentistId: string, date?: Date): Promise<AppointmentWithRelations[]> {
    const where: any = { dentistId };
    if (date) {
      where.date = date;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: "desc" },
    });
    return appointments as AppointmentWithRelations[];
  }

  async findAll(filters?: { from?: Date; to?: Date; dentistId?: string }): Promise<AppointmentWithRelations[]> {
    const where: any = {};
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = filters.from;
      if (filters.to) where.date.lte = filters.to;
    }
    if (filters?.dentistId) {
      where.dentistId = filters.dentistId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: "desc" },
    });
    return appointments as AppointmentWithRelations[];
  }

  async create(data: {
    patientId: string;
    dentistId: string;
    date: Date;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<AppointmentData> {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        dentistId: data.dentistId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
      },
    });
    return appointment as AppointmentData;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentData> {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    });
    return appointment as AppointmentData;
  }

  async updateSchedule(id: string, date: Date, startTime: string, endTime: string): Promise<AppointmentData> {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { date, startTime, endTime },
    });
    return appointment as AppointmentData;
  }

  async hasConflict(dentistId: string, date: Date, startTime: string, excludeId?: string): Promise<boolean> {
    const where: any = {
      dentistId,
      date,
      startTime,
      status: { not: "CANCELLED" },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.appointment.count({ where });
    return count > 0;
  }
}
