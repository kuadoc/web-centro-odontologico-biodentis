"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useAuthContext } from "@/contexts/auth-context";
import { Plus, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  patient: { id: string; firstName: string; lastName: string; email: string };
  dentist: { id: string; user: { firstName: string; lastName: string } };
}

interface Dentist {
  id: string;
  userId: string;
  specialty: string;
  user: { firstName: string; lastName: string };
}

export default function AppointmentsPage() {
  const { api, user } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [appts, dents] = await Promise.all([
        api.get("/api/appointments"),
        api.get("/api/dentists"),
      ]);
      setAppointments(Array.isArray(appts) ? appts : []);
      setDentists(Array.isArray(dents) ? dents : []);
    } catch {
      console.error("Error loading data");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/appointments", form);
      setShowForm(false);
      setForm({ dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear cita");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      if (action === "confirm") {
        await api.patch(`/api/appointments/${id}/confirm`, {});
      } else if (action === "cancel") {
        await api.patch(`/api/appointments/${id}/cancel`, {});
      } else if (action === "complete") {
        await api.patch(`/api/appointments/${id}/status`, { status: "COMPLETED" });
      }
      loadData();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Citas</h2>
          <p className="text-muted-foreground">Gestión de citas odontológicas</p>
        </div>
        {canManage && (
          <Button onPress={() => setShowForm(!showForm)}>
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
                    <option key={d.id} value={d.userId}>
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
              <Button type="submit" className="w-full" isDisabled={loading}>
                {loading ? "Creando..." : "Crear Cita"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {appointments.length === 0 ? (
              <p className="p-4 text-muted-foreground text-sm">No hay citas registradas</p>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {apt.dentist.user.firstName} {apt.dentist.user.lastName}
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
    </div>
  );
}
