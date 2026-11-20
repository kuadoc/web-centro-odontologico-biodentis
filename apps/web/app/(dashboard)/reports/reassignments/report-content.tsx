"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import type { ReassignmentReport } from "@biodentis/shared-validators";
import { api } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Pagination } from "@workspace/ui/components/pagination";
import { ROLE_LABELS } from "@/lib/role-labels";
import { CancellationReportPanel } from "@/components/appointments/cancellation-report";
import { formatCalendarDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentAnalyticsPanel } from "@/components/appointments/appointment-analytics";

export default function ReportContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState("activity");
  const admin = user?.role === "ADMIN";
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold sm:text-4xl">{admin ? "Reporte de citas" : "Mis citas y recordatorios"}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{admin ? "Actividad clínica, atenciones realizadas, servicios y seguimiento de recordatorios. Consulta por período y odontólogo." : "Consulta tus atenciones, próximas citas y recordatorios. Solo se muestran tus datos."}</p></div>{admin && <div className="flex flex-wrap gap-2 border-b pb-4" role="group" aria-label="Secciones del reporte"><Button variant={tab === "activity" ? "default" : "outline"} aria-pressed={tab === "activity"} onPress={() => setTab("activity")}>Actividad y atenciones</Button><Button variant={tab === "changes" ? "default" : "outline"} aria-pressed={tab === "changes"} onPress={() => setTab("changes")}>Cancelaciones y reasignaciones</Button></div>}{tab === "activity" || !admin ? <AppointmentAnalyticsPanel admin={admin} /> : <ChangesReport />}</div>;
}

function ChangesReport() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [cancellationState, setCancellationState] = useState("REQUESTED");
  const download = useMutation({
    mutationFn: (state: string) => api.download(`/api/reports/appointments/export${state ? `?state=${encodeURIComponent(state)}` : ""}`, "reporte-citas.xlsx"),
  });
  const report = useQuery({
    queryKey: ["reassignment-report", page, pageSize],
    queryFn: () => api.get<ReassignmentReport>(`/api/reports/reassignments?page=${page}&pageSize=${pageSize}`),
    placeholderData: keepPreviousData,
  });
  const totalPages = Math.max(1, Math.ceil((report.data?.total ?? 0) / pageSize));
  if (report.data && !report.isPlaceholderData && page > totalPages) setPage(totalPages);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporte de reasignaciones y cancelaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Solicitudes de cancelación, decisiones e historial de cambios de odontólogo. Consulta exclusiva para administradores.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" isDisabled={download.isPending} onPress={() => download.mutate(cancellationState)}><Download className="size-4" aria-hidden="true" />{download.isPending ? "Generando Excel…" : "Exportar a Excel"}</Button>
          <p className="text-xs text-muted-foreground">Incluye todas las páginas y respeta el filtro de cancelaciones.</p>
        </div>
        {download.isError && <p role="alert" className="mt-2 text-sm text-destructive">{download.error.message || "No se pudo exportar el reporte. Inténtalo nuevamente."}</p>}
      </div>
      <CancellationReportPanel state={cancellationState} onStateChange={setCancellationState} />
      <h2 className="text-lg font-semibold">Historial de reasignaciones</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead><tr className="border-b bg-muted/50 text-muted-foreground">
                {["Fecha del cambio", "Paciente / Cita", "Odontólogo anterior", "Nuevo odontólogo", "Estado", "Responsable", "Motivo"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-medium">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y">
                {report.isPending && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando reporte…</td></tr>}
                {report.isError && <tr><td colSpan={7} className="p-6 text-center"><p role="alert">No se pudo cargar el reporte.</p><Button variant="outline" className="mt-3" onPress={() => void report.refetch()}>Reintentar</Button></td></tr>}
                {!report.isPending && !report.isError && !report.data?.items.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Todavía no hay reasignaciones registradas.</td></tr>}
                {report.data?.items.map((entry) => <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-4 py-3"><p className="font-medium">{entry.patient.name}</p><p className="text-xs text-muted-foreground">{formatCalendarDate(entry.date)} · {formatTime(entry.startTime)}–{formatTime(entry.endTime)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{entry.appointmentId}</p></td>
                  <td className="px-4 py-3">{entry.previousDentist.name}</td>
                  <td className="px-4 py-3">{entry.newDentist.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{entry.status === "PENDING" ? "Pendiente" : "Confirmada"}</Badge></td>
                  <td className="px-4 py-3"><p>{entry.actor.name}</p><p className="text-xs text-muted-foreground">{ROLE_LABELS[entry.actor.role]}</p></td>
                  <td className="min-w-64 max-w-sm whitespace-pre-wrap break-words px-4 py-3">{entry.reason}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={report.data?.total ?? 0} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} label="reasignaciones" pageSizeOptions={[10, 25, 50, 100]} isLoading={report.isFetching || report.isError} showPageNumbers ariaLabel="Paginación de reasignaciones" />
        </CardContent>
      </Card>
    </div>
  );
}
