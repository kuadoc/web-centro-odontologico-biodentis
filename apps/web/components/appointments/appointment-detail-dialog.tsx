"use client";

import { useMemo } from "react";
import type { Appointment } from "@biodentis/shared-types";
import { Badge } from "@workspace/ui/components/badge";
import { useAuth } from "@/hooks/use-auth";
import { ClinicalNoteForm } from "@/components/appointments/clinical-note-form";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils";
import { Phone, Mail, History } from "lucide-react";

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-100 text-gray-800",
};

/** ID de historial clínico mostrado al usuario, derivado del id del paciente. */
const historyCode = (patientId: string) => `HC-${patientId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;

const MOTIVE_FALLBACK = "Sin motivo registrado";

interface AppointmentDetailDialogProps {
  appointment: Appointment | null;
  /** Citas ya cargadas (respetan el alcance del rol); de aqui sale el historial del paciente. */
  appointments: Appointment[];
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-semibold">{children}</div>
    </div>
  );
}

export function AppointmentDetailDialog({ appointment, appointments, onClose }: AppointmentDetailDialogProps) {
  const { user } = useAuth();
  const history = useMemo(() => {
    if (!appointment) return [];
    return appointments
      .filter((a) => a.patientId === appointment.patientId)
      .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
  }, [appointment, appointments]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of history) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [history]);

  return (
    <Dialog
      isOpen={!!appointment}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
      className="max-h-[calc(100dvh-2rem)] gap-0 overflow-clip p-0 sm:max-w-2xl [&>[data-slot=dialog]]:flex [&>[data-slot=dialog]]:max-h-[calc(100dvh-2rem)] [&>[data-slot=dialog]]:min-h-0 [&>[data-slot=dialog]]:flex-col"
    >
      {appointment && (
        <>
          <DialogHeader className="shrink-0 border-b bg-muted/50 p-4 pr-12 sm:p-6 sm:pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>Detalle de la cita</DialogTitle>
              <Badge className={STATUS_COLORS[appointment.status] || ""}>
                {STATUS_LABELS[appointment.status] ?? appointment.status}
              </Badge>
            </div>
            <DialogDescription>
              {formatCalendarDate(appointment.date)} · {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 max-h-[65dvh] flex-col gap-6 overflow-y-auto p-4 sm:p-6">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Datos del paciente</h3>
              <div className="rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/10">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3"><UserAvatar firstName={appointment.patient?.firstName} lastName={appointment.patient?.lastName} /><Badge variant="outline">{history.length} {history.length === 1 ? "cita en el historial" : "citas en el historial"}</Badge></div>
                <p className="text-lg font-semibold">
                  {appointment.patient?.firstName} {appointment.patient?.lastName}
                </p>
                <p className="text-xs font-medium text-primary">Historial: {historyCode(appointment.patientId)}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {appointment.patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {appointment.patient.phone}
                    </span>
                  )}
                  {appointment.patient?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {appointment.patient.email}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Cita y agenda</h3>
              <div className="space-y-4 rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/10">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Odontólogo a cargo">
                    Dr. {appointment.dentist?.user.firstName} {appointment.dentist?.user.lastName}
                    {appointment.dentist?.specialty ? ` (${appointment.dentist.specialty})` : ""}
                  </Field>
                  <Field label="Fecha y hora">
                    {formatCalendarDate(appointment.date)}, {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                  </Field>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Motivo de la consulta</p>
                  {appointment.treatment && <p className="mb-2 text-sm font-medium">{appointment.treatment.specialty?.name ?? appointment.treatment.category} · {appointment.treatment.name}</p>}
                  <p className="rounded-lg bg-card p-3 text-sm">{appointment.notes || MOTIVE_FALLBACK}</p>
                </div>
              </div>
            </section>

            {user?.role === "DENTIST" && appointment.status === "CONFIRMED" && !appointment.clinicalRecord && (
              <ClinicalNoteForm key={appointment.id} appointmentId={appointment.id} onDone={onClose} />
            )}

            {appointment.clinicalRecord && <section className="space-y-2" aria-label="Nota clínica registrada"><h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Nota clínica registrada</h3><p className="whitespace-pre-wrap break-words rounded-lg border p-4 text-sm leading-relaxed">{appointment.clinicalRecord.notes}</p></section>}

            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Historial de citas del paciente ({history.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(counts).map(([status, n]) => (
                  <Badge key={status} className={STATUS_COLORS[status] || ""}>
                    {n} {STATUS_LABELS[status] ?? status}
                  </Badge>
                ))}
              </div>
              <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
                {history.map((a) => (
                  <li
                    key={a.id}
                    className={`flex flex-wrap items-start justify-between gap-3 p-3 text-sm ${
                      a.id === appointment.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatCalendarDate(a.date)} · {formatTime(a.startTime)} - {formatTime(a.endTime)}
                        {a.id === appointment.id && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">(esta cita)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr. {a.dentist?.user.firstName} {a.dentist?.user.lastName}
                      </p>
                      <p className="mt-1 text-xs">
                        <span className="text-muted-foreground">Motivo: </span>
                        {a.notes || MOTIVE_FALLBACK}
                      </p>
                      {a.clinicalRecord?.notes && (
                        <p className="mt-1 text-xs">
                          <span className="text-muted-foreground">Nota clínica: </span>
                          {a.clinicalRecord.notes}
                        </p>
                      )}
                    </div>
                    <Badge className={`shrink-0 ${STATUS_COLORS[a.status] || ""}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <DialogFooter className="m-0 shrink-0 flex-row px-4 sm:px-6">
            <DialogClose>Cerrar</DialogClose>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
