"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@workspace/ui/components/table";
import {
  AppointmentDetailDialog,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/components/appointments/appointment-detail-dialog";
import { Pagination } from "@workspace/ui/components/pagination";
import { usePagination } from "@workspace/ui/hooks/use-pagination";
import { formatDate } from "@workspace/ui/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  useAppointments,
  useDentists,
  useUsers,
  useCreateAppointment,
  useAvailableSlots,
  useConfirmAppointment,
  useCancelAppointment,
  useCompleteAppointment,
} from "@/hooks/use-queries";
import { Plus, Calendar, Clock, CheckCircle, XCircle, Search, Eye } from "lucide-react";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments();
  const { data: dentistsData } = useDentists();
  const { data: patientsData } = useUsers("PATIENT");

  const appointments = useMemo(
    () => (Array.isArray(appointmentsData) ? appointmentsData : []),
    [appointmentsData]
  );
  const dentists = useMemo(
    () => (Array.isArray(dentistsData) ? dentistsData : []),
    [dentistsData]
  );
  const patients = useMemo(
    () => (Array.isArray(patientsData) ? patientsData : []),
    [patientsData]
  );

  const [statusFilter, setStatusFilter] = useState("");
  const [dentistSearch, setDentistSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailAppointment = useMemo(
    () => appointments.find((apt) => apt.id === detailId) ?? null,
    [appointments, detailId]
  );

  const filteredAppointments = useMemo(() => {
    const term = normalize(dentistSearch.trim());
    return appointments.filter((apt) => {
      if (!apt.patient || !apt.dentist) return false;
      if (statusFilter && apt.status !== statusFilter) return false;
      if (term) {
        const name = normalize(`${apt.dentist.user.firstName} ${apt.dentist.user.lastName}`);
        if (!name.includes(term)) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, dentistSearch]);

  const pagination = usePagination(filteredAppointments, 10, `${statusFilter}|${dentistSearch}`);
  const pagedAppointments = pagination.pageItems;

  const createMutation = useCreateAppointment();
  const confirmMutation = useConfirmAppointment();
  const cancelMutation = useCancelAppointment();
  const completeMutation = useCompleteAppointment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: "", dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(form.dentistId, form.date);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startTime) {
      alert("Selecciona un horario disponible");
      return;
    }
    try {
      // For RECEPTIONIST/ADMIN, patientId is required; for PATIENT it's optional (backend uses token)
      const payload: Record<string, string> = {
        dentistId: form.dentistId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
      };
      if (form.notes) payload.notes = form.notes;
      if (form.patientId) payload.patientId = form.patientId;
      await createMutation.mutateAsync(payload);
      setShowForm(false);
      setForm({ patientId: "", dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
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


  const canManage = user?.role === "ADMIN" || user?.role === "RECEPTIONIST" || user?.role === "DENTIST";
  const isReceptionistOrAdmin = user?.role === "ADMIN" || user?.role === "RECEPTIONIST";
  const isDentist = user?.role === "DENTIST";
  const isPatient = user?.role === "PATIENT";

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
        {(canManage || isPatient) && (
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
              {isReceptionistOrAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paciente *</label>
                  <select
                    className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    required={isReceptionistOrAdmin}
                  >
                    <option value="">Seleccionar paciente...</option>
                    {patients.map((p: { id: string; firstName: string; lastName: string; email: string }) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} - {p.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Odontólogo</label>
                <select
                  className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  value={form.dentistId}
                  onChange={(e) => setForm({ ...form, dentistId: e.target.value, startTime: "", endTime: "" })}
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
                  onChange={(e) => setForm({ ...form, date: e.target.value, startTime: "", endTime: "" })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Horario disponible *</label>
                {!form.dentistId || !form.date ? (
                  <p className="text-sm text-muted-foreground">Selecciona odontologo y fecha para ver los horarios.</p>
                ) : slotsLoading ? (
                  <p className="text-sm text-muted-foreground">Consultando disponibilidad...</p>
                ) : !slots?.length ? (
                  <p className="text-sm text-muted-foreground">No hay horarios disponibles para esa fecha.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                    {slots.map((slot) => {
                      const selected = form.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setForm({ ...form, startTime: slot.startTime, endTime: slot.endTime })}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:border-primary hover:bg-muted"
                          }`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      );
                    })}
                  </div>
                )}
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

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar por odontólogo"
            placeholder="Buscar por odontólogo..."
            className="flex h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm outline-none focus:border-primary"
            value={dentistSearch}
            onChange={(e) => setDentistSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrar por estado"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-primary sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS)
            .filter(([value]) => !isDentist || value === "CONFIRMED" || value === "COMPLETED")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
      </div>

      {/* Desktop table view */}
      <Card className="hidden overflow-hidden sm:block">
        <CardContent className="p-0">
          <Table aria-label="Listado de citas">
            <TableHeader>
              <TableHead isRowHeader>PACIENTE</TableHead>
              <TableHead>ODONTÓLOGO</TableHead>
              <TableHead>FECHA Y HORA</TableHead>
              <TableHead>ESTADO</TableHead>
              <TableHead className="text-right">ACCIÓN</TableHead>
            </TableHeader>
            <TableBody
              renderEmptyState={() => (
                <div className="flex h-24 items-center justify-center px-4">
                  <p className="text-sm text-muted-foreground">No hay citas que coincidan</p>
                </div>
              )}
            >
              {pagedAppointments.map((apt) => (
                <TableRow key={apt.id}>
                  <TableCell>
                    <p className="font-medium">
                      {apt.patient!.firstName} {apt.patient!.lastName}
                    </p>
                  </TableCell>
                  <TableCell>
                    Dr. {apt.dentist!.user.firstName} {apt.dentist!.user.lastName}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{formatDate(apt.date)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {apt.startTime} - {apt.endTime}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[apt.status] || ""}>{STATUS_LABELS[apt.status] ?? apt.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canManage && apt.status === "PENDING" && (
                        <>
                          <Button size="sm" variant="outline" aria-label="Confirmar cita" onPress={() => handleAction(apt.id, "confirm")}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" aria-label="Cancelar cita" onPress={() => handleAction(apt.id, "cancel")}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {canManage && apt.status === "CONFIRMED" && (
                        <Button size="sm" variant="outline" onPress={() => handleAction(apt.id, "complete")}>
                          Completar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" aria-label="Ver detalle de la cita" onPress={() => setDetailId(apt.id)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Ver detalle
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            label="citas"
          />
        </CardContent>
      </Card>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {pagedAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-sm">No hay citas que coincidan</p>
            </CardContent>
          </Card>
        ) : (
          pagedAppointments.map((apt) => (
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
                  <Badge className={STATUS_COLORS[apt.status] || ""}>{STATUS_LABELS[apt.status] ?? apt.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(apt.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {apt.startTime} - {apt.endTime}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onPress={() => setDetailId(apt.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalle
                  </Button>
                </div>
                {canManage && (apt.status === "PENDING" || apt.status === "CONFIRMED") && (
                  <div className="flex gap-2 mt-2">
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
        <Card className="overflow-hidden">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            label="citas"
          />
        </Card>
      </div>

      <AppointmentDetailDialog
        appointment={detailAppointment}
        appointments={appointments}
        onClose={() => setDetailId(null)}
      />

      {/* Mobile FAB */}
      {(canManage || isPatient) && (
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
