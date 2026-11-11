"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReviewAppointmentCancellationSchema, type CancellationReport, type CancellationReportItem } from "@biodentis/shared-validators";
import { BellRing, CheckCircle2, XCircle, History } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { formatCalendarDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";
import { useToast } from "@/components/ui/toast-provider";

const labels = { REQUESTED: "Por revisar", APPROVED: "Cancelada", REJECTED: "Rechazada" };

function ReviewDialog({ entry, onClose }: { entry: CancellationReportItem; onClose: () => void }) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/appointment-cancellations/${entry.id}/review`, ReviewAppointmentCancellationSchema.parse({ decision, reason })),
    onSuccess: () => {
      for (const key of ["appointments", "dashboard", "patients", "cancellation-report"]) void client.invalidateQueries({ queryKey: [key] });
      toast(decision === "APPROVE" ? "Cancelación aprobada. Ambos motivos y responsables quedaron registrados." : "Solicitud rechazada. La cita conserva su estado.");
      onClose();
    },
    onError: (failure) => { setError(failure instanceof Error ? failure.message : "No se pudo resolver la solicitud."); void client.invalidateQueries({ queryKey: ["cancellation-report"] }); },
  });
  return <Dialog isOpen onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }} isDismissable={!mutation.isPending} showCloseButton={!mutation.isPending} className="max-w-xl">
    <DialogHeader><DialogTitle>Revisar solicitud de cancelación</DialogTitle><DialogDescription>Tu decisión y motivo se conservarán junto con la solicitud de Recepción.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (confirmed && !mutation.isPending) { setError(""); mutation.mutate(); } }}>
      <div className="space-y-2 rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{entry.patient.name} · {formatCalendarDate(entry.date)} · {formatTime(entry.startTime)}</p><p>{entry.dentist.name}</p><p className="text-muted-foreground">Solicitado por {entry.requestedBy.name} · Recepción</p><p className="whitespace-pre-wrap break-words">{entry.requestReason}</p></div>
      <div className="space-y-2"><label htmlFor="review-decision" className="text-sm font-medium">Decisión</label><select id="review-decision" value={decision} disabled={mutation.isPending} onChange={(event) => { setDecision(event.target.value as "APPROVE" | "REJECT"); setConfirmed(false); }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="APPROVE">Aprobar y cancelar la cita</option><option value="REJECT">Rechazar solicitud</option></select></div>
      <div className="space-y-2"><label htmlFor="review-reason" className="text-sm font-medium">Motivo adicional de Administración</label><Textarea id="review-reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={mutation.isPending} required minLength={25} maxLength={2000} aria-describedby="review-help" /><p id="review-help" className="text-xs text-muted-foreground">Mínimo 25 caracteres. {reason.trim().length}/2000. El motivo original permanece registrado.</p></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirmed} disabled={mutation.isPending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />{decision === "APPROVE" ? "Confirmo que se cancelará la cita confirmada." : "Confirmo el rechazo de esta solicitud."}</label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>Volver</Button><Button type="submit" variant={decision === "APPROVE" ? "destructive" : "default"} isDisabled={mutation.isPending || !confirmed || reason.trim().length < 25}>{mutation.isPending ? "Guardando…" : decision === "APPROVE" ? "Aprobar y cancelar" : "Rechazar solicitud"}</Button></DialogFooter>
    </form>
  </Dialog>;
}

function ActivityCharts({ data }: { data: CancellationReport }) {
  const series = [{ key: "requests", label: "Solicitudes", color: "var(--chart-1)" }, { key: "cancellations", label: "Cancelaciones", color: "var(--chart-3)" }, { key: "reassignments", label: "Reasignaciones", color: "var(--chart-5)" }] as const;
  const max = Math.max(1, ...data.activity.flatMap((month) => series.map((item) => month[item.key])));
  const total = data.summary.requested + data.summary.approved + data.summary.rejected;
  const states = [{ label: "Por revisar", value: data.summary.requested, color: "var(--chart-1)" }, { label: "Canceladas", value: data.summary.approved, color: "var(--chart-3)" }, { label: "Rechazadas", value: data.summary.rejected, color: "var(--chart-5)" }];
  let offset = 0;
  return <div className="grid gap-4 lg:grid-cols-3">
    <Card className="lg:col-span-2"><CardContent className="p-5"><h2 className="font-semibold">Actividad de los últimos seis meses</h2><p className="mt-1 text-xs text-muted-foreground">Solicitudes al emitirse; cancelaciones al resolverse. Zona horaria de Lima.</p><div className="mt-4 flex flex-wrap gap-4 text-xs">{series.map((item) => <span key={item.key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</span>)}</div>
      <svg viewBox="0 0 600 235" role="img" aria-labelledby="activity-title activity-description" className="mt-3 w-full"><title id="activity-title">Actividad mensual de citas</title><desc id="activity-description">{data.activity.map((month) => `${month.month}: ${month.requests} solicitudes, ${month.cancellations} cancelaciones y ${month.reassignments} reasignaciones`).join(". ")}</desc>
        {[0, 0.5, 1].map((ratio) => <g key={ratio}><line x1="28" x2="590" y1={190 - ratio * 150} y2={190 - ratio * 150} stroke="currentColor" className="text-border" /><text x="24" y={194 - ratio * 150} textAnchor="end" fill="currentColor" className="text-muted-foreground" fontSize="10">{Math.ceil(max * ratio)}</text></g>)}
        {data.activity.map((month, i) => <g key={month.month}>{series.map((item, j) => <rect key={item.key} x={50 + i * 90 + j * 19} y={190 - month[item.key] / max * 150} width="14" height={month[item.key] / max * 150} rx="3" fill={item.color}><title>{month.month} · {item.label}: {month[item.key]}</title></rect>)}<text x={76 + i * 90} y="215" textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize="11">{month.month.slice(5)}/{month.month.slice(2, 4)}</text></g>)}
      </svg>{!data.activity.some((month) => month.requests || month.cancellations || month.reassignments) && <p className="text-center text-xs text-muted-foreground">Sin movimientos en este periodo.</p>}
    </CardContent></Card>
    <Card><CardContent className="p-5"><h2 className="font-semibold">Estado de las cancelaciones</h2><p className="mt-1 text-xs text-muted-foreground">Total histórico registrado en el nuevo flujo.</p><div className="relative mx-auto my-5 h-40 w-40"><svg viewBox="0 0 120 120" role="img" aria-label={states.map((state) => `${state.label}: ${state.value}`).join(", ")} className="h-full w-full -rotate-90"><circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />{states.map((state) => { const length = total ? state.value / total * 301.593 : 0; const start = offset; offset += length; return <circle key={state.label} cx="60" cy="60" r="48" fill="none" stroke={state.color} strokeWidth="12" strokeDasharray={`${length} 301.593`} strokeDashoffset={-start} />; })}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tabular-nums">{total}</span><span className="text-xs text-muted-foreground">registros</span></div></div><div className="space-y-2 text-sm">{states.map((state) => <div key={state.label} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: state.color }} /><span className="flex-1 text-muted-foreground">{state.label}</span><span className="font-medium tabular-nums">{state.value}</span></div>)}</div></CardContent></Card>
  </div>;
}

export function CancellationReportPanel() {
  const [state, setState] = useState("REQUESTED");
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<CancellationReportItem | null>(null);
  const report = useQuery({ queryKey: ["cancellation-report", state, page], queryFn: () => api.get<CancellationReport>(`/api/reports/cancellations?page=${page}&pageSize=10${state ? `&state=${state}` : ""}`), refetchInterval: 30000 });
  if (report.isPending) return <Card><CardContent className="p-6 text-muted-foreground" role="status">Cargando solicitudes y métricas…</CardContent></Card>;
  if (report.isError) return <Card><CardContent className="space-y-3 p-6"><p role="alert">No se pudieron cargar las cancelaciones.</p><Button variant="outline" onPress={() => void report.refetch()}>Reintentar</Button></CardContent></Card>;
  const data = report.data;
  const pages = Math.max(1, Math.ceil(data.total / 10));
  return <section className="space-y-4" aria-label="Gestión de cancelaciones">
    {review && <ReviewDialog key={review.id} entry={review} onClose={() => setReview(null)} />}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[{ label: "Solicitudes por revisar", value: data.summary.requested, Icon: BellRing }, { label: "Citas canceladas", value: data.summary.approved, Icon: CheckCircle2 }, { label: "Solicitudes rechazadas", value: data.summary.rejected, Icon: XCircle }, { label: "Reasignaciones", value: data.summary.reassignments, Icon: History }].map(({ label, value, Icon }) => <Card key={label}><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></div><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
    <ActivityCharts data={data} />
    {data.summary.requested > 0 && <div role="status" className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-sm"><BellRing className="h-5 w-5 shrink-0" aria-hidden="true" /><p><strong>{data.summary.requested} solicitud(es) requieren tu revisión.</strong> Recepción ha solicitado cancelar citas confirmadas.</p></div>}
    <Card><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">Solicitudes y cancelaciones</h2><p className="text-xs text-muted-foreground">Actualización cada 30 segundos. Solo Administración decide sobre las confirmadas.</p></div><div className="flex flex-wrap items-center gap-2"><label htmlFor="cancellation-state" className="sr-only">Estado de la solicitud</label><select id="cancellation-state" value={state} onChange={(event) => { setState(event.target.value); setPage(1); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="REQUESTED">Por revisar</option><option value="APPROVED">Canceladas</option><option value="REJECTED">Rechazadas</option><option value="">Todo el historial</option></select><Button variant="outline" size="sm" isDisabled={report.isFetching} onPress={() => void report.refetch()}>Actualizar</Button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b bg-muted/50 text-muted-foreground"><tr>{["Cita / Paciente", "Solicitud de Recepción", "Estado", "Decisión de Administración", "Acción"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y">{!data.items.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No hay registros para este estado.</td></tr>}{data.items.map((entry) => <tr key={entry.id} className="align-top"><td className="px-4 py-4"><p className="font-medium">{entry.patient.name}</p><p className="text-xs text-muted-foreground">{formatCalendarDate(entry.date)} · {formatTime(entry.startTime)}</p><p className="mt-1">{entry.dentist.name}</p><p className="text-xs text-muted-foreground">Estado original: {entry.originalStatus === "PENDING" ? "Pendiente" : "Confirmada"}</p><p className="mt-1 break-all text-xs text-muted-foreground">{entry.appointmentId}</p></td><td className="min-w-64 max-w-sm px-4 py-4"><p className="font-medium">{entry.requestedBy.name}</p><p className="text-xs text-muted-foreground">Recepción · {formatDateTime(entry.createdAt)}</p><p className="mt-2 whitespace-pre-wrap break-words">{entry.requestReason}</p></td><td className="px-4 py-4"><Badge variant="outline">{labels[entry.state]}</Badge>{entry.state === "REQUESTED" && <p className="mt-2 text-xs text-muted-foreground">La cita aún no está cancelada.</p>}</td><td className="min-w-64 max-w-sm px-4 py-4">{entry.originalStatus === "PENDING" ? <p className="text-muted-foreground">Cancelación directa de Recepción.</p> : entry.reviewedBy ? <><p className="font-medium">{entry.reviewedBy.name}</p><p className="text-xs text-muted-foreground">Administración · {entry.reviewedAt && formatDateTime(entry.reviewedAt)}</p><p className="mt-2 whitespace-pre-wrap break-words">{entry.reviewReason}</p></> : <p className="text-muted-foreground">Pendiente de decisión.</p>}</td><td className="px-4 py-4">{entry.state === "REQUESTED" && <Button variant="outline" size="sm" onPress={() => setReview(entry)}>Revisar solicitud</Button>}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm"><p className="text-muted-foreground">{data.total} registros · Página {page} de {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" isDisabled={page <= 1 || report.isFetching} onPress={() => setPage(page - 1)}>Anterior</Button><Button variant="outline" size="sm" isDisabled={page >= pages || report.isFetching} onPress={() => setPage(page + 1)}>Siguiente</Button></div></div>
    </CardContent></Card>
  </section>;
}
