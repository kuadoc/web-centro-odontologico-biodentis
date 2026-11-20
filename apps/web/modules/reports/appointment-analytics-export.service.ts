import ExcelJS from "exceljs";
import type { Role } from "@biodentis/shared-types";
import { AuditService } from "@/modules/audit/audit.service";
import { AppointmentReportService } from "./appointment-report.service";

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number)[][]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = headers.map((header) => ({ header, width: 28 }));
  sheet.addRows(rows);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: headers.length } };
  sheet.columns.forEach((column) => { column.alignment = { vertical: "top", wrapText: true }; });
  sheet.getRow(1).font = { bold: true };
}
export class AppointmentAnalyticsExportService {
  constructor(private readonly reports = new AppointmentReportService(), private readonly audit = new AuditService()) {}
  async exportXlsx(input: unknown, actor: { id: string; role: Role }) {
    const data = await this.reports.report(input, actor, new Date(), true);
    const workbook = new ExcelJS.Workbook(); workbook.creator = "BIODENTIS";
    addSheet(workbook, "Resumen", ["Indicador", "Valor"], [
      ["Desde", data.start], ["Hasta", data.end], ["Zona horaria", "America/Lima"],
      ["Citas del período", data.summary.total], ["Atendidas del período", data.summary.completed],
      ["Programadas futuras", data.summary.scheduled], ["Pacientes atendidos únicos", data.summary.patients],
      ["Canceladas", data.summary.cancelled], ["No asistieron", data.summary.noShow], ["Asistencia (%)", data.summary.attendanceRate],
      ["Atendidas hasta hoy (sin límite inicial)", data.summary.completedAllTime],
      ["Recordatorios aceptados por SMTP", data.reminderSummary.accepted], ["Recordatorios con incidencias", data.reminderSummary.failed + data.reminderSummary.late],
    ]);
    addSheet(workbook, "Evolución", ["Período", "Citas", "Atendidas", "Canceladas", "Inasistencias"], data.timeline.map((row) => [row.date, row.total, row.completed, row.cancelled, row.noShow]));
    for (const [name, rows] of [["Odontólogos", data.dentists], ["Especialidades", data.specialties], ["Servicios", data.services]] as const) addSheet(workbook, name, ["Posición", "Nombre", "Atenciones completadas", "Pacientes únicos"], rows.map((row, index) => [index + 1, row.name, row.completed, row.patients]));
    const headers = ["ID cita", "Paciente", "Odontólogo", "Servicio", "Especialidad", "Fecha", "Inicio", "Fin", "Estado", "Recordatorio", "Previsto (UTC)", "Intentos", "Aceptado SMTP (UTC)", "Próximo reintento (UTC)"];
    const rows = (items: typeof data.appointments) => items.map((row) => [row.id, row.patient, row.dentist, row.service, row.specialty, row.date, row.startTime, row.endTime, row.status, row.reminder.label, row.reminder.dueAt ?? "", row.reminder.attempts, row.reminder.acceptedAt ?? "", row.reminder.nextAttemptAt ?? ""]);
    addSheet(workbook, "Citas", headers, rows(data.appointments));
    addSheet(workbook, "Programadas y recordatorios", headers, rows(data.upcoming));
    if (actor.role === "ADMIN" && data.worker) addSheet(workbook, "Última ejecución", ["Inicio (UTC)", "Fin (UTC)", "Correcta", "Procesados", "Fallidos"], [[data.worker.startedAt, data.worker.finishedAt ?? "", String(data.worker.success), data.worker.processed, data.worker.failed]]);
    const content = new Uint8Array(await workbook.xlsx.writeBuffer());
    await this.audit.log(actor.id, "EXPORT_APPOINTMENT_ANALYTICS", "Report", "appointments", JSON.stringify({ start: data.start, end: data.end, rows: data.total }));
    return { content, filename: `actividad-citas-${data.start}-${data.end}.xlsx` };
  }
}
