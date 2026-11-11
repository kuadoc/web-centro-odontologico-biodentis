"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReassignAppointmentSchema } from "@biodentis/shared-validators";
import type { Appointment } from "@biodentis/shared-types";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { useDentists } from "@/hooks/use-queries";
import { useToast } from "@/components/ui/toast-provider";
import { api } from "@/lib/api-client";
import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils";

export function ReassignAppointmentDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const [dentistId, setDentistId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const dentists = useDentists();
  const queryClient = useQueryClient();
  const toast = useToast();
  const candidates = (dentists.data ?? []).filter((dentist) => dentist.id !== appointment.dentistId && dentist.user.isActive && dentist.user.role === "DENTIST");
  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/appointments/${appointment.id}/reassign`, ReassignAppointmentSchema.parse({ dentistId, reason })),
    onSuccess: () => {
      for (const key of ["appointments", "dashboard", "patients", "reassignment-report"]) void queryClient.invalidateQueries({ queryKey: [key] });
      toast("Cita reasignada correctamente. El cambio quedó registrado en el reporte.");
      onClose();
    },
    onError: (failure) => setError(failure instanceof Error ? failure.message : "No se pudo reasignar la cita"),
  });
  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }} isDismissable={!mutation.isPending} showCloseButton={!mutation.isPending} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Reasignar odontólogo</DialogTitle>
        <DialogDescription>Se conservarán el estado, la fecha, el horario y el servicio de esta cita.</DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); setError(""); mutation.mutate(); }} className="space-y-4">
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{appointment.patient?.firstName} {appointment.patient?.lastName}</p>
          <p>{formatCalendarDate(appointment.date)} · {formatTime(appointment.startTime)}–{formatTime(appointment.endTime)}</p>
          <p className="text-muted-foreground">Actual: {appointment.dentist?.user.firstName} {appointment.dentist?.user.lastName}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="reassign-dentist" className="text-sm font-medium">Nuevo odontólogo</label>
          <select id="reassign-dentist" required value={dentistId} onChange={(event) => setDentistId(event.target.value)} disabled={dentists.isLoading || mutation.isPending} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="">{dentists.isLoading ? "Cargando odontólogos..." : dentists.isError ? "No se pudo cargar la lista" : !candidates.length ? "No hay otro odontólogo activo disponible" : "Selecciona al nuevo odontólogo"}</option>
            {candidates.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.user.firstName} {dentist.user.lastName} · {dentist.specialty}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Al confirmar se verificará que atienda el servicio y tenga disponibilidad en este horario.</p>
          {dentists.isError && <p role="alert" className="text-sm text-destructive">No se pudo cargar la lista. <button type="button" className="underline" onClick={() => void dentists.refetch()}>Reintentar</button></p>}
          {!dentists.isLoading && !dentists.isError && !candidates.length && <p className="text-sm text-muted-foreground">No hay otros odontólogos activos disponibles para seleccionar.</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="reassign-reason" className="text-sm font-medium">Motivo de la reasignación</label>
          <Textarea id="reassign-reason" required minLength={15} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={mutation.isPending} placeholder="Ej. El odontólogo solicita descanso y se reasigna la atención" aria-describedby="reassign-reason-help" />
          <p id="reassign-reason-help" className="text-xs text-muted-foreground">Describe el motivo con al menos 15 caracteres. Se registrará en el reporte de Administración.</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>Cancelar</Button>
          <Button type="submit" isDisabled={mutation.isPending || !dentistId || reason.trim().length < 15}>{mutation.isPending ? "Reasignando…" : "Confirmar reasignación"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
