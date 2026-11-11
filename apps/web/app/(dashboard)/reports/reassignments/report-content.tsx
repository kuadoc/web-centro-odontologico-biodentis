"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReassignmentReport } from "@biodentis/shared-validators";
import { api } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { ROLE_LABELS } from "@/lib/role-labels";
import { CancellationReportPanel } from "@/components/appointments/cancellation-report";
import { formatCalendarDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";

export default function ReportContent() {
  const [page, setPage] = useState(1);
  const report = useQuery({
    queryKey: ["reassignment-report", page],
    queryFn: () => api.get<ReassignmentReport>(`/api/reports/reassignments?page=${page}&pageSize=25`),
  });
  const totalPages = Math.max(1, Math.ceil((report.data?.total ?? 0) / 25));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporte de reasignaciones y cancelaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Solicitudes de cancelación, decisiones e historial de cambios de odontólogo. Consulta exclusiva para administradores.</p>
      </div>
      <CancellationReportPanel />
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
            <span className="text-muted-foreground">{report.data?.total ?? 0} reasignaciones · Página {page} de {totalPages}</span>
            <div className="flex gap-2"><Button variant="outline" isDisabled={page <= 1 || report.isFetching} onPress={() => setPage((value) => value - 1)}>Anterior</Button><Button variant="outline" isDisabled={page >= totalPages || report.isFetching} onPress={() => setPage((value) => value + 1)}>Siguiente</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
