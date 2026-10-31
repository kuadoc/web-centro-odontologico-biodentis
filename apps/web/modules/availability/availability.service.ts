import {
  AvailabilityRepository,
  AvailableSlot,
} from "./availability.repository"
import {
  ConfigureAvailabilitySchema,
  ReplaceWeeklyAvailabilitySchema,
  AddScheduleExceptionSchema,
} from "@biodentis/shared-validators"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

export class AvailabilityService {
  constructor(
    private readonly availabilityRepository = new AvailabilityRepository(),
    private readonly catalog = new CatalogAdminService()
  ) {}
  async getAvailableSlots(
    dentistId: string,
    dateStr: string,
    treatmentId?: string
  ): Promise<AvailableSlot[]> {
    const treatment = treatmentId
      ? await this.catalog.requireBookable(treatmentId, dentistId)
      : null
    const date = new Date(dateStr)
    // dateStr es YYYY-MM-DD (UTC): usar getUTCDay evita desfases por zona horaria.
    const dayOfWeek = date.getUTCDay()

    const exception = await this.availabilityRepository.findException(
      dentistId,
      date
    )
    if (exception) return []

    const dayAvailability =
      await this.availabilityRepository.findByDentistAndDay(
        dentistId,
        dayOfWeek
      )
    if (dayAvailability.length === 0) return []

    const allSlots: AvailableSlot[] = []
    for (const slot of dayAvailability) {
      const slots = this.generateTimeSlots(
        slot.startTime,
        slot.endTime,
        treatment?.durationMinutes ?? 30,
        treatment ? 15 : 30
      )
      allSlots.push(...slots)
    }

    const bookedAppointments =
      await this.availabilityRepository.findBookedAppointments(dentistId, date)

    const now = new Date()
    return allSlots.filter(
      (slot) =>
        !bookedAppointments.some(
          (a) => slot.startTime < a.endTime && slot.endTime > a.startTime
        ) && new Date(`${dateStr}T${slot.startTime}:00-05:00`) > now
    )
  }

  async getWeekly(dentistId: string) {
    return this.availabilityRepository.findByDentist(dentistId)
  }

  async replaceWeekly(dentistId: string, data: unknown) {
    const parsed = ReplaceWeeklyAvailabilitySchema.parse(data)
    await this.availabilityRepository.replaceWeek(dentistId, parsed.days)
    return this.availabilityRepository.findByDentist(dentistId)
  }

  async configure(dentistId: string, data: unknown) {
    const parsed = ConfigureAvailabilitySchema.parse(data)
    return this.availabilityRepository.upsert(dentistId, parsed)
  }

  async addException(dentistId: string, data: unknown) {
    const parsed = AddScheduleExceptionSchema.parse(data)
    return this.availabilityRepository.addException(
      dentistId,
      new Date(parsed.startDate),
      new Date(parsed.endDate),
      parsed.reason
    )
  }

  async removeException(dentistId: string, dateStr: string) {
    return this.availabilityRepository.removeException(
      dentistId,
      new Date(dateStr)
    )
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    stepMinutes = durationMinutes
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = []
    const [startH, startM] = startTime.split(":").map(Number) as [
      number,
      number,
    ]
    const [endH, endM] = endTime.split(":").map(Number) as [number, number]

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`
      const slotEndMinutes = currentMinutes + durationMinutes
      const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, "0")}:${String(slotEndMinutes % 60).padStart(2, "0")}`
      slots.push({ startTime: slotStart, endTime: slotEnd })
      currentMinutes += stepMinutes
    }

    return slots
  }
}
