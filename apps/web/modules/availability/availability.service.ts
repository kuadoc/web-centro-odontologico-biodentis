import {
  AvailabilityRepository,
  AvailableSlot,
} from "./availability.repository"
import {
  ConfigureAvailabilitySchema,
  ReplaceWeeklyAvailabilitySchema,
  AddScheduleExceptionSchema,
  CatalogIdSchema,
} from "@biodentis/shared-validators"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"
import { ScheduleConflictError } from "@/lib/errors"

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
    // TODO(bug?): una excepción parcial también bloquea el día completo; confirmar HU-09.
    if (exception) return []

    const dayAvailability =
      await this.availabilityRepository.findByDentistAndDay(
        dentistId,
        dayOfWeek
      )
    if (dayAvailability.length === 0) return []

    const allSlots = this.generateDailySlots(
      dayAvailability,
      treatment?.durationMinutes ?? 30,
      treatment ? 15 : 30
    )

    const bookedAppointments =
      await this.availabilityRepository.findBookedAppointments(dentistId, date)

    return this.filterAvailableSlots(
      allSlots,
      bookedAppointments,
      dateStr,
      new Date()
    )
  }

  async getWeekly(dentistId: string) {
    return this.availabilityRepository.findByDentist(dentistId)
  }

  private async requireCoveredAppointments(
    repository: AvailabilityRepository,
    dentistId: string,
    days: { dayOfWeek: number; startTime: string; endTime: string }[],
    previousDays: { dayOfWeek: number; startTime: string; endTime: string }[]
  ) {
    const reducedDays = previousDays.filter((previous) => {
      const next = days.find((day) => day.dayOfWeek === previous.dayOfWeek)
      return !next || next.startTime > previous.startTime || next.endTime < previous.endTime
    })
    if (!reducedDays.length) return
    const appointments = await repository.findScheduledAppointments(dentistId)
    const conflicts = appointments.filter((appointment) => {
      const previous = reducedDays.find((day) => day.dayOfWeek === appointment.date.getUTCDay())
      if (!previous) return false
      const next = days.find((day) => day.dayOfWeek === previous.dayOfWeek)
      if (!next) return true
      const removedStartEnd = next.startTime < previous.endTime ? next.startTime : previous.endTime
      const removedEndStart = next.endTime > previous.startTime ? next.endTime : previous.startTime
      return (next.startTime > previous.startTime && appointment.startTime < removedStartEnd && appointment.endTime > previous.startTime) ||
        (next.endTime < previous.endTime && appointment.startTime < previous.endTime && appointment.endTime > removedEndStart)
    })
    if (!conflicts.length) return
    const labels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const details = [...new Set(conflicts.map((appointment) => appointment.date.getUTCDay()))].map((dayOfWeek) => {
      const entries = conflicts.filter((appointment) => appointment.date.getUTCDay() === dayOfWeek)
      const examples = entries.slice(0, 3).map((appointment) =>
        `${appointment.date.toISOString().slice(0, 10)}, ${appointment.startTime}–${appointment.endTime} (${appointment.status === "PENDING" ? "pendiente" : "confirmada"})`
      ).join("; ")
      return `${labels[dayOfWeek]}: aún hay ${entries.length} cita${entries.length === 1 ? " programada" : "s programadas"}. ${examples}${entries.length > 3 ? "; entre otras" : ""}.`
    }).join("\n\n")
    throw new ScheduleConflictError(
      `No puedes desactivar o reducir el horario indicado.\n\n${details}\n\n`
    )
  }

  async replaceWeekly(dentistId: string, data: unknown, actorId?: string) {
    CatalogIdSchema.parse(dentistId)
    const parsed = ReplaceWeeklyAvailabilitySchema.parse(data)
    return this.availabilityRepository.withTransaction(async (repository) => {
      const previousDays = await repository.findByDentist(dentistId)
      await this.requireCoveredAppointments(repository, dentistId, parsed.days, previousDays)
      await repository.replaceWeek(dentistId, parsed.days)
      if (actorId) await repository.recordScheduleChange(actorId, dentistId, parsed.days)
      return repository.findByDentist(dentistId)
    })
  }

  async configure(dentistId: string, data: unknown) {
    CatalogIdSchema.parse(dentistId)
    const parsed = ConfigureAvailabilitySchema.parse(data)
    return this.availabilityRepository.withTransaction(async (repository) => {
      const existing = await repository.findByDentist(dentistId)
      const days = [...existing.filter((day) => day.dayOfWeek !== parsed.dayOfWeek), parsed]
      await this.requireCoveredAppointments(repository, dentistId, days, existing)
      return repository.upsert(dentistId, parsed)
    })
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

  private generateDailySlots(
    dayAvailability: AvailableSlot[],
    durationMinutes: number,
    stepMinutes: number
  ): AvailableSlot[] {
    const allSlots: AvailableSlot[] = []
    for (const slot of dayAvailability) {
      allSlots.push(
        ...this.generateTimeSlots(
          slot.startTime,
          slot.endTime,
          durationMinutes,
          stepMinutes
        )
      )
    }
    return allSlots
  }

  private filterAvailableSlots(
    slots: AvailableSlot[],
    bookedAppointments: AvailableSlot[],
    dateStr: string,
    now: Date
  ): AvailableSlot[] {
    return slots.filter(
      (slot) =>
        !bookedAppointments.some(
          (a) => slot.startTime < a.endTime && slot.endTime > a.startTime
        ) && new Date(`${dateStr}T${slot.startTime}:00-05:00`) > now
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
