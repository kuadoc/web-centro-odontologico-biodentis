"use client";

import { useMemo, useState } from "react";
import type { Appointment } from "@biodentis/shared-types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCompleteWithNote } from "@/hooks/use-queries";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { formatDate } from "@workspace/ui/lib/utils";
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

/** HU-05: formulario de nota clínica; guarda diagnóstico + tratamiento y completa la cita. */
function ClinicalNoteForm({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [error, setError] = useState("");
  const mutation = useCompleteWithNote();

  async function handleSubmit() {
    if (!diagnosis.trim() || !treatment.trim()) {
      setError("Diagnóstico y tratamiento son obligatorios");
      return;
    }
    setError("");
    try {
      await mutation.mutateAsync({ id: appointmentId, diagnosis, treatment });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la nota clínica");
    }
  }

  return (
    <section className="space-y-3" aria-label="Registro de Nota Clínica">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">Registro de Nota Clínica</h3>
      <div className="space-y-3 rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/10">
        <div className="space-y-1">
          <label htmlFor="clinical-diagnosis" className="text-sm font-medium">Diagnóstico</label>
          <Textarea id="clinical-diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="clinical-treatment" className="text-sm font-medium">Tratamiento</label>
          <Textarea id="clinical-treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onPress={handleSubmit} isDisabled={mutation.isPending}>
          {mutation.isPending ? "Guardando..." : "Guardar y Completar"}
        </Button>
      </div>
    </section>
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
      className="max-w-xl"
    >
      {appointment && (
        <>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Detalle de la cita</DialogTitle>
              <Badge className={STATUS_COLORS[appointment.status] || ""}>
                {STATUS_LABELS[appointment.status] ?? appointment.status}
              </Badge>
            </div>
            <DialogDescription>
              {formatDate(appointment.date)} · {appointment.startTime} - {appointment.endTime}
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Datos del paciente</h3>
              <div className="rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/10">
                <p className="text-lg font-bold">
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
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Odontólogo a cargo">
                    Dr. {appointment.dentist?.user.firstName} {appointment.dentist?.user.lastName}
                    {appointment.dentist?.specialty ? ` (${appointment.dentist.specialty})` : ""}
                  </Field>
                  <Field label="Fecha y hora">
                    {formatDate(appointment.date)}, {appointment.startTime} - {appointment.endTime}
                  </Field>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Motivo de la consulta</p>
                  <p className="rounded-lg bg-card p-3 text-sm">{appointment.notes || MOTIVE_FALLBACK}</p>
                </div>
              </div>
            </section>

            {user?.role === "DENTIST" && appointment.status === "CONFIRMED" && (
              <ClinicalNoteForm appointmentId={appointment.id} onDone={onClose} />
            )}

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
                    className={`flex items-start justify-between gap-3 p-3 text-sm ${
                      a.id === appointment.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatDate(a.date)} · {a.startTime} - {a.endTime}
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

          <DialogFooter>
            <DialogClose>Cerrar</DialogClose>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
