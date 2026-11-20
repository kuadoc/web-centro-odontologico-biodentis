"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "@biodentis/shared-types";
import { CancelAppointmentSchema, canCancelOrReschedule } from "@biodentis/shared-validators";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast-provider";

export function AppointmentCancellationDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const isPatient = user?.role === "PATIENT";
  const requested = !isPatient && appointment.status === "CONFIRMED";
  const needsReception = isPatient && !canCancelOrReschedule(new Date(appointment.date), appointment.startTime);
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => {
      const body = CancelAppointmentSchema.parse({ reason });
      return requested ? api.post(`/api/appointments/${appointment.id}/cancellation-requests`, body) : api.patch(`/api/appointments/${appointment.id}/cancel`, body);
    },
    onSuccess: () => {
      for (const key of ["appointments", "dashboard", "patients", "cancellation-report"]) void client.invalidateQueries({ queryKey: [key] });
      toast(requested ? "Solicitud enviada a Administración. La cita sigue confirmada." : "Cita cancelada. Motivo y responsable registrados en el reporte.");
      onClose();
    },
    onError: (failure) => setError(failure instanceof Error ? failure.message : "No se pudo procesar la cancelación."),
  });
  return <Dialog isOpen onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }} isDismissable={!mutation.isPending} showCloseButton={!mutation.isPending} className="max-w-lg">
    <DialogHeader><DialogTitle>{requested ? "Solicitar cancelación" : "Cancelar cita"}</DialogTitle><DialogDescription>{requested ? "Administración revisará tu solicitud y añadirá su motivo antes de cancelar. La cita permanece confirmada hasta su aprobación." : "La cita se cancelará y quedarán registrados tu nombre y el motivo."}</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (confirmed && !needsReception && !mutation.isPending) { setError(""); mutation.mutate(); } }}>
      {needsReception && <p role="alert" className="text-sm text-destructive">Faltan 24 horas o menos. Contacta por teléfono o presencialmente con Recepción para gestionar la cita.</p>}
      <div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{appointment.patient?.firstName} {appointment.patient?.lastName}</p><p>{formatCalendarDate(appointment.date)} · {formatTime(appointment.startTime)}</p><p className="text-muted-foreground">{appointment.dentist?.user.firstName} {appointment.dentist?.user.lastName}</p></div>
      <div className="space-y-2"><label htmlFor="cancellation-reason" className="text-sm font-medium">Motivo de Recepción</label><Textarea id="cancellation-reason" required minLength={25} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={mutation.isPending} aria-describedby="cancellation-help" /><p id="cancellation-help" className="text-xs text-muted-foreground">Mínimo 25 caracteres. {reason.trim().length}/2000</p></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={mutation.isPending} required className="mt-1" />{requested ? "Confirmo el envío de esta solicitud a Administración." : "Confirmo la cancelación de esta cita."}</label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>Volver</Button><Button type="submit" variant={requested ? "default" : "destructive"} isDisabled={mutation.isPending || needsReception || !confirmed || reason.trim().length < 25}>{mutation.isPending ? "Guardando…" : requested ? "Enviar solicitud" : "Confirmar cancelación"}</Button></DialogFooter>
    </form>
  </Dialog>;
}
