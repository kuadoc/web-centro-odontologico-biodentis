import { AppointmentRepository } from "./appointment.repository";
import { AvailabilityService } from "@/modules/availability/availability.service";
import {
  RequestAppointmentSchema,
  RescheduleAppointmentSchema,
  AppointmentStatusUpdateSchema,
  CompleteAppointmentSchema,
  canCancelOrReschedule,
  isValidTimeRange,
  isValidTransition,
  DENTIST_VISIBLE_STATUSES,
} from "@biodentis/shared-validators";
import { AppointmentStatus, Role } from "@biodentis/shared-types";
import { ValidationError, DomainError, ScheduleConflictError, NotFoundError, AuthorizationError } from "@/lib/errors";

const appointmentRepository = new AppointmentRepository();
const availabilityService = new AvailabilityService();

export class AppointmentService {
  /** HU-12: si el solicitante es DENTIST solo se devuelven citas CONFIRMED/COMPLETED. */
  async getAll(
    filters: { patientId?: string; dentistId?: string; status?: string; from?: string; to?: string },
    viewerRole?: Role,
  ) {
    let statuses: AppointmentStatus[] | undefined;
    if (viewerRole === Role.DENTIST) {
      const requested = filters.status as AppointmentStatus | undefined;
      statuses = requested
        ? DENTIST_VISIBLE_STATUSES.filter((s) => s === requested)
        : DENTIST_VISIBLE_STATUSES;
      if (statuses.length === 0) return [];
    } else if (filters.status) {
      statuses = [filters.status as AppointmentStatus];
    }

    return appointmentRepository.findMany({
      patientId: filters.patientId,
      dentistId: filters.dentistId,
      statuses,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }

  async getById(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    return appointment;
  }

  /**
   * HU-03: un PATIENT solo puede reservar un bloque libre calculado de la agenda del
   * dentista (sin excepciones ni citas); la hora de fin se toma del bloque, no del cliente.
   */
  async create(data: unknown, patientId: string, actorRole?: Role) {
    const parsed = RequestAppointmentSchema.parse(data);

    if (actorRole === Role.PATIENT) {
      const slots = await availabilityService.getAvailableSlots(parsed.dentistId, parsed.date);
      const slot = slots.find((s) => s.startTime === parsed.startTime);
      if (!slot) {
        throw new ScheduleConflictError("El horario seleccionado ya no esta disponible");
      }
      parsed.endTime = slot.endTime;
    }

    if (!isValidTimeRange(parsed.startTime, parsed.endTime)) {
      throw new ValidationError("Rango de horario inválido");
    }

    const conflict = await appointmentRepository.findConflicting(
      parsed.dentistId,
      new Date(parsed.date),
      parsed.startTime,
    );
    if (conflict) {
      throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
    }

    return appointmentRepository.create({
      patientId,
      dentistId: parsed.dentistId,
      date: new Date(parsed.date),
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      notes: parsed.notes,
      // HU-03: toda cita nueva nace PENDING hasta que Recepcion la confirme.
      status: AppointmentStatus.PENDING,
    });
  }

  async confirm(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!isValidTransition(appointment.status as AppointmentStatus, AppointmentStatus.CONFIRMED)) {
      throw new DomainError(`No se puede confirmar una cita en estado ${appointment.status}`);
    }

    return appointmentRepository.updateStatus(id, AppointmentStatus.CONFIRMED);
  }

  async cancel(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError("No se puede cancelar una cita con menos de 24 horas de anticipación");
    }

    if (!isValidTransition(appointment.status as AppointmentStatus, AppointmentStatus.CANCELLED)) {
      throw new DomainError(`No se puede cancelar una cita en estado ${appointment.status}`);
    }

    return appointmentRepository.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  async reschedule(id: string, data: unknown) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError("No se puede reprogramar una cita con menos de 24 horas de anticipación");
    }

    const parsed = RescheduleAppointmentSchema.parse(data);

    if (!isValidTimeRange(parsed.startTime, parsed.endTime)) {
      throw new ValidationError("Rango de horario inválido");
    }

    const conflict = await appointmentRepository.findConflicting(
      appointment.dentistId,
      new Date(parsed.date),
      parsed.startTime,
      id,
    );
    if (conflict) {
      throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
    }

    return appointmentRepository.reschedule(id, new Date(parsed.date), parsed.startTime, parsed.endTime);
  }

  /**
   * HU-12: un DENTIST solo opera sobre citas propias ya CONFIRMED y unicamente
   * puede marcarlas como COMPLETED. Confirmar/cancelar/no-show es de Recepcion.
   */
  async updateStatus(id: string, data: unknown, actor?: { role: Role; dentistId?: string }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    const parsed = AppointmentStatusUpdateSchema.parse(data);

    if (actor?.role === Role.DENTIST) {
      if (!actor.dentistId || appointment.dentistId !== actor.dentistId) {
        throw new AuthorizationError("Esta cita no pertenece a tu agenda");
      }
      if (!DENTIST_VISIBLE_STATUSES.includes(appointment.status as AppointmentStatus)) {
        throw new AuthorizationError("Esta cita aun no esta confirmada por Recepcion");
      }
      if (parsed.status !== AppointmentStatus.COMPLETED) {
        throw new AuthorizationError("El odontologo solo puede marcar la cita como atendida");
      }
    }

    if (!isValidTransition(appointment.status as AppointmentStatus, parsed.status as AppointmentStatus)) {
      throw new DomainError(`Transición inválida: ${appointment.status} -> ${parsed.status}`);
    }

    return appointmentRepository.updateStatus(id, parsed.status as AppointmentStatus);
  }

  /** HU-05: el odontólogo registra la nota clínica (diagnóstico + tratamiento) y completa su cita CONFIRMED. */
  async completeWithClinicalNote(id: string, data: unknown, actor: { dentistId?: string }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (!actor.dentistId || appointment.dentistId !== actor.dentistId) {
      throw new AuthorizationError("Esta cita no pertenece a tu agenda");
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new DomainError("Solo se puede completar una cita confirmada");
    }
    if (appointment.clinicalRecord) throw new DomainError("La cita ya tiene una nota clínica");

    const { diagnosis, treatment } = CompleteAppointmentSchema.parse(data);
    const notes = `Diagnóstico: ${diagnosis}\nTratamiento: ${treatment}`;
    return appointmentRepository.completeWithRecord(id, appointment.patientId, appointment.dentistId, notes);
  }
}
