import { ReportRepository } from "../domain/ReportRepository";

export class GetAppointmentReportUseCase {
  constructor(private reportRepo: ReportRepository) {}

  async execute(from: string, to: string, dentistId?: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.reportRepo.getAppointmentReport(fromDate, toDate, dentistId);
  }
}
