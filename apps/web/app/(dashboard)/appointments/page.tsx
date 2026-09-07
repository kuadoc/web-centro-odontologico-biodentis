"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/hooks/use-auth";
import {
  useAppointments,
  useDentists,
  useCreateAppointment,
  useConfirmAppointment,
  useCancelAppointment,
  useCompleteAppointment,
} from "@/hooks/use-queries";
import { Plus, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments();
  const { data: dentistsData } = useDentists();

  const appointments = useMemo(
    () => (Array.isArray(appointmentsData) ? appointmentsData : []),
    [appointmentsData]
  );
  const dentists = useMemo(
    () => (Array.isArray(dentistsData) ? dentistsData : []),
    [dentistsData]
  );

  const filteredAppointments = useMemo(
    () => appointments.filter((apt) => apt.patient && apt.dentist),
    [appointments]
  );

  const createMutation = useCreateAppointment();
  const confirmMutation = useConfirmAppointment();
  const cancelMutation = useCancelAppointment();
  const completeMutation = useCompleteAppointment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dentistId: "", date: "", startTime: "", endTime: "", notes: "" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(form);
      setShowForm(false);
      setForm({ dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear cita");
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      if (action === "confirm") await confirmMutation.mutateAsync(id);
      else if (action === "cancel") await cancelMutation.mutateAsync(id);
      else if (action === "complete") await completeMutation.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    NO_SHOW: "bg-gray-100 text-gray-800",
  };

  const canManage = user?.role === "ADMIN" || user?.role === "RECEPTIONIST" || user?.role === "DENTIST";

  if (appointmentsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Citas</h2>
          <p className="text-muted-foreground">Gestión de citas odontológicas</p>
        </div>
        {canManage && (
          <Button onPress={() => setShowForm(!showForm)} className="hidden sm:inline-flex">
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Cancelar" : "Nueva Cita"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Odontólogo</label>
                <select
                  className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  value={form.dentistId}
                  onChange={(e) => setForm({ ...form, dentistId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user.firstName} {d.user.lastName} - {d.specialty}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora inicio</label>
                  <input
                    type="time"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora fin</label>
                  <input
                    type="time"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas (opcional)</label>
                <input
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" isDisabled={createMutation.isPending}>
                {createMutation.isPending ? "Creando..." : "Crear Cita"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Desktop table view */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredAppointments.length === 0 ? (
              <p className="p-4 text-muted-foreground text-sm">No hay citas registradas</p>
            ) : (
              filteredAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {apt.patient!.firstName} {apt.patient!.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {apt.dentist!.user.firstName} {apt.dentist!.user.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{apt.date}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.startTime} - {apt.endTime}
                      </p>
                    </div>
                    <Badge className={statusColors[apt.status] || ""}>{apt.status}</Badge>
                    {canManage && apt.status === "PENDING" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onPress={() => handleAction(apt.id, "confirm")}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onPress={() => handleAction(apt.id, "cancel")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {canManage && apt.status === "CONFIRMED" && (
                      <Button size="sm" variant="outline" onPress={() => handleAction(apt.id, "complete")}>
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-sm">No hay citas registradas</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">
                      {apt.patient!.firstName} {apt.patient!.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dr. {apt.dentist!.user.firstName} {apt.dentist!.user.lastName}
                    </p>
                  </div>
                  <Badge className={statusColors[apt.status] || ""}>{apt.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {apt.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {apt.startTime} - {apt.endTime}
                  </span>
                </div>
                {canManage && (apt.status === "PENDING" || apt.status === "CONFIRMED") && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {apt.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1" onPress={() => handleAction(apt.id, "confirm")}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirmar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onPress={() => handleAction(apt.id, "cancel")}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                      </>
                    )}
                    {apt.status === "CONFIRMED" && (
                      <Button size="sm" variant="outline" className="flex-1" onPress={() => handleAction(apt.id, "complete")}>
                        Completar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile FAB */}
      {canManage && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 sm:hidden"
          aria-label={showForm ? "Cerrar formulario" : "Nueva cita"}
        >
          <Plus className={`h-6 w-6 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`} />
        </button>
      )}
    </div>
  );
}
