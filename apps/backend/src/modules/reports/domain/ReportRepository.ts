export interface AppointmentReport {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  confirmed: number;
  byDentist: {
    dentistId: string;
    dentistName: string;
    count: number;
  }[];
}

export interface ReportRepository {
  getAppointmentReport(from: Date, to: Date, dentistId?: string): Promise<AppointmentReport>;
}
