import { AppointmentRepository } from "../domain/AppointmentRepository";
import { Role } from "@biodentis/shared-types";

export class GetAppointmentsUseCase {
  constructor(private appointmentRepo: AppointmentRepository) {}

  async execute(userId: string, role: Role, filters?: { from?: string; to?: string; dentistId?: string }) {
    switch (role) {
      case Role.PATIENT:
        return this.appointmentRepo.findByPatientId(userId);

      case Role.DENTIST:
        if (filters?.from) {
          return this.appointmentRepo.findByDentistId(userId, new Date(filters.from));
        }
        return this.appointmentRepo.findByDentistId(userId);

      case Role.RECEPTIONIST:
      case Role.ADMIN:
        return this.appointmentRepo.findAll({
          from: filters?.from ? new Date(filters.from) : undefined,
          to: filters?.to ? new Date(filters.to) : undefined,
          dentistId: filters?.dentistId,
        });

      default:
        return [];
    }
  }
}
