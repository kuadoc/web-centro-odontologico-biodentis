import { AvailabilityRepository, AvailableSlot } from "./availability.repository";
import { ConfigureAvailabilitySchema, ReplaceWeeklyAvailabilitySchema, AddScheduleExceptionSchema } from "@biodentis/shared-validators";

const availabilityRepository = new AvailabilityRepository();

export class AvailabilityService {
  async getAvailableSlots(dentistId: string, dateStr: string): Promise<AvailableSlot[]> {
    const date = new Date(dateStr);
    // dateStr es YYYY-MM-DD (UTC): usar getUTCDay evita desfases por zona horaria.
    const dayOfWeek = date.getUTCDay();

    const exception = await availabilityRepository.findException(dentistId, date);
    if (exception) return [];

    const dayAvailability = await availabilityRepository.findByDentistAndDay(dentistId, dayOfWeek);
    if (dayAvailability.length === 0) return [];

    const allSlots: AvailableSlot[] = [];
    for (const slot of dayAvailability) {
      const slots = this.generateTimeSlots(slot.startTime, slot.endTime, 30);
      allSlots.push(...slots);
    }

    const bookedAppointments = await availabilityRepository.findBookedAppointments(dentistId, date);
    const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime));

    const now = new Date();
    return allSlots.filter(
      (slot) => !bookedTimes.has(slot.startTime) && new Date(`${dateStr}T${slot.startTime}:00`) > now,
    );
  }

  async getWeekly(dentistId: string) {
    return availabilityRepository.findByDentist(dentistId);
  }

  async replaceWeekly(dentistId: string, data: unknown) {
    const parsed = ReplaceWeeklyAvailabilitySchema.parse(data);
    await availabilityRepository.replaceWeek(dentistId, parsed.days);
    return availabilityRepository.findByDentist(dentistId);
  }

  async configure(dentistId: string, data: unknown) {
    const parsed = ConfigureAvailabilitySchema.parse(data);
    return availabilityRepository.upsert(dentistId, parsed);
  }

  async addException(dentistId: string, data: unknown) {
    const parsed = AddScheduleExceptionSchema.parse(data);
    return availabilityRepository.addException(
      dentistId,
      new Date(parsed.startDate),
      new Date(parsed.endDate),
      parsed.reason
    );
  }

  async removeException(dentistId: string, dateStr: string) {
    return availabilityRepository.removeException(dentistId, new Date(dateStr));
  }

  private generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const [startH, startM] = startTime.split(":").map(Number) as [number, number];
    const [endH, endM] = endTime.split(":").map(Number) as [number, number];

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
