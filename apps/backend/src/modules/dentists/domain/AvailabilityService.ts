import { DentistRepository } from "./DentistRepository";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

export class AvailabilityService {
  constructor(private dentistRepo: DentistRepository) {}

  async getAvailableSlots(dentistId: string, dateStr: string): Promise<AvailableSlot[]> {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    const exception = await this.dentistRepo.getScheduleExceptions(dentistId, date);
    if (exception) {
      return [];
    }

    const availability = await this.dentistRepo.getAvailability(dentistId);
    const dayAvailability = availability.filter((a) => a.dayOfWeek === dayOfWeek);

    if (dayAvailability.length === 0) {
      return [];
    }

    const allSlots: AvailableSlot[] = [];
    for (const slot of dayAvailability) {
      const slots = this.generateTimeSlots(slot.startTime, slot.endTime, 30);
      allSlots.push(...slots);
    }

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        dentistId,
        date,
        status: { not: "CANCELLED" },
      },
      select: { startTime: true },
    });

    const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime));

    return allSlots.filter((slot) => !bookedTimes.has(slot.startTime));
  }

  private generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;
      const slotEndMinutes = currentMinutes + durationMinutes;
      const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, "0")}:${String(slotEndMinutes % 60).padStart(2, "0")}`;

      slots.push({ startTime: slotStart, endTime: slotEnd });
      currentMinutes += durationMinutes;
    }

    return slots;
  }
}
