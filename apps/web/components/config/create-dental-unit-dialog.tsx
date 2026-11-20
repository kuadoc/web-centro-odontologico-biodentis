"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { CreateDentalUnitSchema, DentalUnitTypeSchema, DentalUnitStatusSchema } from "@biodentis/shared-validators";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useCreateDentalUnit } from "@/hooks/use-queries";
import { useToast } from "@/components/ui/toast-provider";

type UnitInput = z.infer<typeof CreateDentalUnitSchema>;
const TYPE_LABELS: Record<UnitInput["type"], string> = {
  SILLON: "Sillón dental", QUIRURGICO: "Unidad quirúrgica", RADIOLOGICO: "Unidad radiológica",
};
const STATUS_LABELS: Record<UnitInput["status"], string> = {
  ACTIVE: "Operativo", MAINTENANCE: "Mantenimiento", INACTIVE: "Inactivo",
};

export function CreateDentalUnitDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<UnitInput>({ name: "", type: "SILLON", status: "ACTIVE", description: "" });
  const [error, setError] = useState("");
  const create = useCreateDentalUnit();
  const toast = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    setError("");
    const parsed = CreateDentalUnitSchema.safeParse({ ...form, name: form.name.trim(), description: form.description?.trim() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa los datos de la unidad."); return; }
    try {
      await create.mutateAsync(parsed.data);
      toast("Unidad clínica registrada correctamente.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo registrar la unidad. Intenta nuevamente.");
    }
  }

  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open && !create.isPending) onClose(); }} isDismissable={!create.isPending} showCloseButton={!create.isPending} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Añadir unidad clínica</DialogTitle>
        <DialogDescription>Registra un box o equipo y selecciona su estado actual.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" aria-busy={create.isPending}>
        <div className="space-y-2">
          <Label htmlFor="new-unit-name">Nombre de la unidad</Label>
          <Input id="new-unit-name" name="name" placeholder="Ej. Sillón de atención 4" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={create.isPending} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-unit-type">Tipo de unidad</Label>
            <select id="new-unit-type" name="type" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.type} onChange={(event) => setForm({ ...form, type: DentalUnitTypeSchema.parse(event.target.value) })} disabled={create.isPending}>
              {DentalUnitTypeSchema.options.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-unit-status">Estado inicial</Label>
            <select id="new-unit-status" name="status" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: DentalUnitStatusSchema.parse(event.target.value) })} disabled={create.isPending}>
              {DentalUnitStatusSchema.options.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-unit-description">Descripción (opcional)</Label>
          <Textarea id="new-unit-description" name="description" rows={3} placeholder="Ubicación o detalle del mantenimiento" value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={create.isPending} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onPress={onClose} isDisabled={create.isPending}>Cancelar</Button>
          <Button type="submit" isDisabled={create.isPending}>{create.isPending ? "Guardando…" : "Guardar unidad"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
