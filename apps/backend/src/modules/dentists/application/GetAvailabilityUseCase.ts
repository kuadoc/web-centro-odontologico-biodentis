import { AvailabilityService } from "../domain/AvailabilityService";

export class GetAvailabilityUseCase {
  constructor(private availabilityService: AvailabilityService) {}

  async execute(dentistId: string, date: string) {
    return this.availabilityService.getAvailableSlots(dentistId, date);
  }
}
