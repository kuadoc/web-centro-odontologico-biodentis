import { AppointmentRepository } from "./appointment.repository";
import {
  RequestAppointmentSchema,
  RescheduleAppointmentSchema,
  AppointmentStatusUpdateSchema,
  canCancelOrReschedule,
  isValidTimeRange,
  isValidTransition,
  AppointmentStatus,
} from "@workspace/shared-validators";
import { ValidationError, DomainError, ScheduleConflictError, NotFoundError } from "@/lib/errors";

const appointmentRepository = new AppointmentRepository();

export class AppointmentService {
  async getAll(filters: { patientId?: string; dentistId?: string; status?: string; from?: string; to?: string }) {
    return appointmentRepository.findMany({
      patientId: filters.patientId,
      dentistId: filters.dentistId,
      status: filters.status as AppointmentStatus | undefined,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }

  async getById(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    return appointment;
  }

  async create(data: unknown, patientId: string) {
    const parsed = RequestAppointmentSchema.parse(data);

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

  async updateStatus(id: string, data: unknown) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    const parsed = AppointmentStatusUpdateSchema.parse(data);

    if (!isValidTransition(appointment.status as AppointmentStatus, parsed.status as AppointmentStatus)) {
      throw new DomainError(`Transición inválida: ${appointment.status} -> ${parsed.status}`);
    }

    return appointmentRepository.updateStatus(id, parsed.status as AppointmentStatus);
  }
}
