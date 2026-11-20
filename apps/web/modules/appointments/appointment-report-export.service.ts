import ExcelJS from "exceljs";
import { ExportAppointmentReportSchema } from "@biodentis/shared-validators";
import { ROLE_LABELS } from "@/lib/role-labels";
import { clinicDateKey } from "@/lib/clinic-calendar";
import { AuditService } from "@/modules/audit/audit.service";
import { CancellationService } from "./cancellation.service";
import { ReassignmentService } from "./reassignment.service";

const states: Record<string, string> = {
  REQUESTED: "Por revisar", APPROVED: "Cancelada", REJECTED: "Rechazada",
  PENDING: "Pendiente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", COMPLETED: "Completada", NO_SHOW: "No asistió",
};
const dateTime = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const instant = (value: string | null) => value ? dateTime.format(new Date(value)) : "";

function sheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number)[][]) {
  const worksheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  worksheet.columns = headers.map((header) => ({ header, width: /Motivo/.test(header) ? 60 : /ID/.test(header) ? 38 : 26 }));
  worksheet.addRows(rows);
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, worksheet.rowCount), column: headers.length } };
  worksheet.columns.forEach((column) => { column.alignment = { vertical: "top", wrapText: true }; });
  const heading = worksheet.getRow(1);
  heading.font = { bold: true, color: { argb: "FFFFFFFF" } };
  heading.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF187A70" } };
  heading.height = 32;
}

export class AppointmentReportExportService {
  constructor(
    private readonly cancellations = new CancellationService(),
    private readonly reassignments = new ReassignmentService(),
    private readonly audit = new AuditService(),
  ) {}

  async exportXlsx(input: unknown, actorId: string) {
    const filter = ExportAppointmentReportSchema.parse(input);
    const [cancellations, reassignments] = await Promise.all([
      this.cancellations.exportItems(filter), this.reassignments.exportItems(),
    ]);
    const workbook = new ExcelJS.Workbook();
    const generatedAt = new Date();
    workbook.creator = "BIODENTIS";
    workbook.created = generatedAt;
    sheet(workbook, "Resumen", ["Concepto", "Valor"], [
      ["Generado (America/Lima)", instant(generatedAt.toISOString())],
      ["Filtro de cancelaciones", filter.state ? states[filter.state]! : "Todo el historial"],
      ["Cancelaciones exportadas", cancellations.length], ["Reasignaciones exportadas", reassignments.length],
      ["Alcance", "Todas las páginas. Reasignaciones: historial completo."],
    ]);
    sheet(workbook, "Cancelaciones", ["ID registro", "ID cita", "Paciente", "Odontólogo", "Fecha de cita", "Hora inicio", "Hora fin", "Estado solicitud", "Estado original cita", "Estado actual cita", "Fecha solicitud (Lima)", "Solicitado por", "Rol solicitante", "Motivo solicitud", "Fecha revisión (Lima)", "Revisado por", "Rol revisor", "Motivo revisión"], cancellations.map((entry) => [
      entry.id, entry.appointmentId, entry.patient.name, entry.dentist.name, entry.date, entry.startTime, entry.endTime,
      states[entry.state]!, states[entry.originalStatus]!, states[entry.currentStatus] ?? entry.currentStatus,
      instant(entry.createdAt), entry.requestedBy.name, ROLE_LABELS[entry.requestedBy.role], entry.requestReason,
      instant(entry.reviewedAt), entry.reviewedBy?.name ?? "", entry.reviewedBy ? ROLE_LABELS[entry.reviewedBy.role] : "", entry.reviewReason ?? "",
    ]));
    sheet(workbook, "Reasignaciones", ["ID registro", "ID cita", "Fecha cambio (Lima)", "Paciente", "Fecha de cita", "Hora inicio", "Hora fin", "Odontólogo anterior", "Nuevo odontólogo", "Estado cita al cambiar", "Responsable", "Rol responsable", "Motivo cambio"], reassignments.map((entry) => [
      entry.id, entry.appointmentId, instant(entry.createdAt), entry.patient.name, entry.date, entry.startTime, entry.endTime,
      entry.previousDentist.name, entry.newDentist.name, states[entry.status]!, entry.actor.name, ROLE_LABELS[entry.actor.role], entry.reason,
    ]));
    const content = new Uint8Array(await workbook.xlsx.writeBuffer());
    await this.audit.log(actorId, "EXPORT_APPOINTMENT_REPORT", "Report", "appointments", JSON.stringify({ ...filter, cancellations: cancellations.length, reassignments: reassignments.length }));
    return { content, filename: `reporte-citas-${clinicDateKey(generatedAt)}.xlsx` };
  }
}
