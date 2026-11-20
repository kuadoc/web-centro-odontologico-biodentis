"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { AppointmentAnalytics } from "@biodentis/shared-validators";
import { CalendarDays, CheckCircle2, Users, Clock, Download, RefreshCw, BellRing } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Pagination } from "@workspace/ui/components/pagination";
import { formatCalendarDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";
import { api } from "@/lib/api-client";
import { AppointmentEvolutionChart, AppointmentRankingChart } from "./report-charts";

const statuses: Record<string, string> = { PENDING: "Pendiente", CONFIRMED: "Confirmada", COMPLETED: "Atendida", CANCELLED: "Cancelada", NO_SHOW: "No asistió" };
const selectClass = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function AppointmentAnalyticsPanel({ admin }: { admin: boolean }) {
  const [filter, setFilter] = useState({ period: "month", date: "", start: "", end: "", dentistId: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [table, setTable] = useState<"appointments" | "upcoming">("upcoming");
  const params = new URLSearchParams(Object.entries(filter).filter(([, value]) => value));
  params.set("page", String(page)); params.set("pageSize", String(pageSize));
  const query = params.toString();
  const completeRange = filter.period !== "custom" || Boolean(filter.start && filter.end);
  const report = useQuery({ queryKey: ["appointment-analytics", query], queryFn: () => api.get<AppointmentAnalytics>(`/api/reports/appointments?${query}`), refetchInterval: 60000, enabled: completeRange, placeholderData: keepPreviousData });
  const download = useMutation({ mutationFn: () => api.download(`/api/reports/appointments/analytics-export?${query}`, "actividad-citas.xlsx") });
  const change = (key: keyof typeof filter, value: string) => { setFilter((previous) => ({ ...previous, [key]: value })); setPage(1); };
  const data = report.data;
  const total = data ? table === "upcoming" ? data.upcomingTotal : data.total : 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (data && !report.isPlaceholderData && page > pages) setPage(pages);
  const paginationProps = { page, pageSize, total, totalPages: pages, onPageChange: setPage, onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); }, label: "citas", pageSizeOptions: [10, 20, 50, 100], isLoading: report.isFetching, showPageNumbers: true };
  const records = data?.[table] ?? [];
  return <div className="space-y-6">
    <Card><CardContent className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Período de consulta</h2><p className="mt-1 text-xs text-muted-foreground">Todos los indicadores y el Excel utilizan estos filtros. Zona horaria de Lima.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" aria-label="Actualizar reporte" isDisabled={report.isFetching} onPress={() => void report.refetch()}><RefreshCw className="size-4" aria-hidden="true" /></Button><Button size="sm" isDisabled={!data || report.isFetching || report.isError || download.isPending} onPress={() => download.mutate()}><Download className="size-4" aria-hidden="true" />{download.isPending ? "Generando…" : "Exportar Excel"}</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="space-y-1.5 text-xs font-medium">Período<select aria-label="Período" className={selectClass} value={filter.period} onChange={(event) => change("period", event.target.value)}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="year">Año</option><option value="custom">Rango personalizado</option></select></label>
      {filter.period === "custom" ? <><label className="space-y-1.5 text-xs font-medium">Desde<Input type="date" aria-label="Desde" value={filter.start} onChange={(event) => change("start", event.target.value)} /></label><label className="space-y-1.5 text-xs font-medium">Hasta<Input type="date" aria-label="Hasta" value={filter.end} onChange={(event) => change("end", event.target.value)} /></label></> : <label className="space-y-1.5 text-xs font-medium">Fecha de referencia<Input type="date" aria-label="Fecha de referencia" value={filter.date} onChange={(event) => change("date", event.target.value)} /><span className="block font-normal text-muted-foreground">Vacío: fecha actual de Lima.</span></label>}
      <label className="space-y-1.5 text-xs font-medium">Odontólogo<select aria-label="Odontólogo" className={selectClass} value={filter.dentistId} onChange={(event) => change("dentistId", event.target.value)}><option value="">Todos los odontólogos</option>{data?.dentistOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label></div>
      {data && <p className="text-xs text-muted-foreground">{formatCalendarDate(data.start)} — {formatCalendarDate(data.end)} · Última consulta: {formatDateTime(data.generatedAt)}</p>}
      {download.isError && <p role="alert" className="text-sm text-destructive">{download.error.message}</p>}
    </CardContent></Card>
    {report.isPending && <p role="status" className="p-8 text-center text-muted-foreground">{completeRange ? "Preparando indicadores y recordatorios…" : "Selecciona ambas fechas para consultar el rango."}</p>}
    {report.isError && <div role="alert" className="rounded-xl border p-5 text-sm text-destructive">{report.error.message}<Button variant="outline" className="ml-3" onPress={() => void report.refetch()}>Reintentar</Button></div>}
    {data && !report.isError && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
        { label: "Citas del período", value: data.summary.total, Icon: CalendarDays, detail: "Todos los estados" },
        { label: "Atenciones realizadas", value: data.summary.completed, Icon: CheckCircle2, detail: `${data.summary.attendanceRate}% de asistencia entre atendidas e inasistencias` },
        { label: "Citas programadas", value: data.summary.scheduled, Icon: Clock, detail: "Futuras, pendientes o confirmadas" },
        { label: "Pacientes atendidos", value: data.summary.patients, Icon: Users, detail: "Personas únicas del período" },
        { label: "Canceladas / No asistieron", value: `${data.summary.cancelled} / ${data.summary.noShow}`, Icon: CalendarDays, detail: `${data.summary.pending} pendientes · ${data.summary.confirmed} confirmadas` },
        { label: "Atendidas hasta hoy", value: data.summary.completedAllTime, Icon: CheckCircle2, detail: "Acumulado histórico; respeta el odontólogo, sin fecha inicial" },
      ].map(({ label, value, Icon, detail }) => <Card key={label}><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{label}</p><Icon className="size-4 text-muted-foreground" aria-hidden="true" /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></CardContent></Card>)}</div>
      <AppointmentEvolutionChart data={data} />
      <div className="grid gap-5 xl:grid-cols-3"><AppointmentRankingChart summary={data.summary} title={admin ? "Ranking de odontólogos" : "Mis atenciones por odontólogo"} description="Ordenado por atenciones completadas; desempate por pacientes únicos." rows={data.dentists} /><AppointmentRankingChart summary={data.summary} title="Especialidades atendidas" description="Especialidad del servicio registrado, solo citas completadas." rows={data.specialties} /><AppointmentRankingChart summary={data.summary} title="Servicios realizados" description="Frecuencia de los servicios en el período seleccionado." rows={data.services} /></div>
      <Card><CardContent className="space-y-4 p-5 sm:p-6"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><BellRing className="size-5" aria-hidden="true" />Recordatorios de citas</h2><p className="mt-1 text-xs text-muted-foreground">Se prevén 24 horas antes de citas confirmadas. Aceptación SMTP no acredita lectura ni entrega en la bandeja.</p></div><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-6">{[["Previstos", data.reminderSummary.scheduled], ["En cola", data.reminderSummary.queued], ["Aceptados SMTP", data.reminderSummary.accepted], ["Fallos / reintentos", data.reminderSummary.failed], ["Plazo alcanzado", data.reminderSummary.late], ["Sin envío habilitado", data.reminderSummary.suppressed]].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>)}</div>
      {admin && <div className="rounded-lg border p-3 text-xs"><p className="font-medium">Ejecución del proceso externo</p>{!data.worker ? <p className="mt-1 text-muted-foreground">Sin ejecuciones registradas. La programación externa todavía no está verificada.</p> : <><p className="mt-1">Último inicio: {formatDateTime(data.worker.startedAt)} · {data.worker.success === null ? "En ejecución o interrumpido" : data.worker.success ? "Finalizó sin fallos de procesamiento" : "Finalizó con incidencias"}</p><p className="mt-1 text-muted-foreground">{data.worker.processed} procesados · {data.worker.failed} fallidos. {new Date(data.generatedAt).getTime() - new Date(data.worker.startedAt).getTime() > 10 * 60000 ? "No hay ejecución reciente en los últimos 10 minutos." : "Hay una ejecución reciente; esto no garantiza las siguientes."}</p></>}</div>}
      </CardContent></Card>
      <Card id="report-appointments-detail" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none"><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="text-xl font-semibold">Detalle de citas</h2><p className="mt-1 text-xs text-muted-foreground">Fechas, servicios y seguimiento del recordatorio.</p></div><div className="flex gap-2"><Button size="sm" variant={table === "upcoming" ? "default" : "outline"} onPress={() => { setTable("upcoming"); setPage(1); }}>Programadas</Button><Button size="sm" variant={table === "appointments" ? "default" : "outline"} onPress={() => { setTable("appointments"); setPage(1); }}>Todas las citas</Button></div></div>
      <div className="overflow-x-auto" aria-busy={report.isFetching}><table aria-label="Citas del reporte" className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr>{["Cita / Paciente", "Odontólogo", "Servicio / Especialidad", "Estado", "Recordatorio 24 h"].map((label) => <th scope="col" key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y">{records.map((row) => <tr key={row.id} data-appointment-id={row.id}><td className="px-5 py-4"><p className="font-medium">{row.patient}</p><p className="mt-1 text-xs text-muted-foreground">{formatCalendarDate(row.date)} · {formatTime(row.startTime)}–{formatTime(row.endTime)}</p></td><td className="px-5 py-4">{row.dentist}</td><td className="px-5 py-4"><p>{row.service}</p><p className="mt-1 text-xs text-muted-foreground">{row.specialty}</p></td><td className="px-5 py-4"><Badge variant="outline">{statuses[row.status]}</Badge></td><td className="max-w-72 px-5 py-4"><p>{row.reminder.label}</p>{row.reminder.dueAt && <p className="mt-1 text-xs text-muted-foreground">Previsto: {formatDateTime(row.reminder.dueAt)}</p>}{row.reminder.attempts > 0 && <p className="mt-1 text-xs text-muted-foreground">{row.reminder.attempts} intento(s){row.reminder.acceptedAt ? ` · Aceptado: ${formatDateTime(row.reminder.acceptedAt)}` : ""}</p>}{row.reminder.nextAttemptAt && <p className="mt-1 text-xs text-muted-foreground">Reintento: {formatDateTime(row.reminder.nextAttemptAt)}</p>}</td></tr>)}{!records.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No hay citas para esta vista y período.</td></tr>}</tbody></table></div><Pagination {...paginationProps} ariaLabel="Paginación inferior de citas" />
      </CardContent></Card>
    </>}
  </div>;
}
