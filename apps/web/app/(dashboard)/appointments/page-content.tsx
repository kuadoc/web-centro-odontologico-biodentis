"use client";

import { useMemo, useState } from "react";
import type { z } from "zod";
import Link from "next/link";
import { RequestAppointmentSchema } from "@biodentis/shared-validators";
import { useQuery } from "@tanstack/react-query";
import type { Appointment, BookingSpecialty, PatientList } from "@biodentis/shared-types";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ActionMenu, type ActionMenuItem } from "@workspace/ui/components/action-menu";
import { DateRangePicker, type DateRangePickerValue } from "@workspace/ui/components/date-range-picker";
import { ReassignAppointmentDialog } from "@/components/appointments/reassign-appointment-dialog";
import { AppointmentCancellationDialog } from "@/components/appointments/appointment-cancellation-dialog";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { Select, SelectTrigger, SelectValue, SelectPopover, SelectInput, SelectList, SelectItem } from "@workspace/ui/components/select";
import { useToast } from "@/components/ui/toast-provider";
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
import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { filterAppointments } from "@/lib/appointment-filters";
import {
  useAppointments,
  useDentists,
  useCreateAppointment,
  useAvailableSlots,
  useConfirmAppointment,
} from "@/hooks/use-queries";
import { Plus, Calendar, Clock, CheckCircle, XCircle, Search, Eye, UserRoundCog, RotateCcw } from "lucide-react";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments();
  const { data: dentistsData, isLoading: dentistsLoading, isError: dentistsError } = useDentists();

  const appointments = useMemo(
    () => (Array.isArray(appointmentsData) ? appointmentsData : []),
    [appointmentsData]
  );
  const dentists = useMemo(
    () => (Array.isArray(dentistsData) ? dentistsData : []),
    [dentistsData]
  );

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePickerValue | null>(null);
  const [datePickerReset, setDatePickerReset] = useState(0);
  const dateFrom = dateRange?.start.toString();
  const dateTo = dateRange?.end.toString();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reassignAppointment, setReassignAppointment] = useState<Appointment | null>(null);
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);
  const detailAppointment = useMemo(
    () => appointments.find((apt) => apt.id === detailId) ?? null,
    [appointments, detailId]
  );

  const filteredAppointments = useMemo(() => filterAppointments(appointments, {
    search, status: statusFilter, from: dateFrom, to: dateTo,
  }), [appointments, statusFilter, search, dateFrom, dateTo]);

  const pagination = usePagination(filteredAppointments, 10, JSON.stringify([statusFilter, search, dateFrom, dateTo]));
  const pagedAppointments = pagination.pageItems;

  const createMutation = useCreateAppointment();
  const confirmMutation = useConfirmAppointment();

  const [showForm, setShowForm] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const [review, setReview] = useState<{
    data: z.infer<typeof RequestAppointmentSchema>;
    patientName: string; patientEmail: string; specialtyName: string; serviceName: string; dentistName: string;
  } | null>(null);
  const patientDirectory = useQuery({
    queryKey: ["patients", "booking", patientSearch, patientPage],
    queryFn: () => api.get<PatientList>(`/api/patients?status=active&pageSize=20&page=${patientPage}&search=${encodeURIComponent(patientSearch)}`),
    enabled: showForm && (user?.role === "ADMIN" || user?.role === "RECEPTIONIST"),
  });
  const patients = patientDirectory.data?.items ?? [];
  const [form, setForm] = useState({ patientId: "", specialtyId: "", treatmentId: "", dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
  const [questionnaire, setQuestionnaire] = useState({ reason: "", hasPain: "", problemDuration: "" });
  const notesValidation = RequestAppointmentSchema.shape.notes.safeParse(form.notes);
  const notesError = notesValidation.success ? null : notesValidation.error.issues[0]?.message;
  const booking = useQuery({ queryKey: ["booking-catalog"], queryFn: () => api.get<BookingSpecialty[]>("/api/catalog/booking"), enabled: showForm });
  const specialty = booking.data?.find((s) => s.id === form.specialtyId);
  const specialtyDentists = dentists.filter((dentist) => specialty?.dentists.some((assigned) => assigned.id === dentist.id));
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(form.dentistId, form.date, form.treatmentId || undefined);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBookingError("");
    if (!notesValidation.success) return;
    if (!form.startTime) {
      alert("Selecciona un horario disponible");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        dentistId: form.dentistId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        treatmentId: form.treatmentId,
      };
      if (notesValidation.data) payload.notes = notesValidation.data;
      if (user?.role === "PATIENT") Object.assign(payload, { reason: questionnaire.reason, hasPain: questionnaire.hasPain === "yes", problemDuration: questionnaire.problemDuration });
      if (form.patientId) payload.patientId = form.patientId;
      const data = RequestAppointmentSchema.parse(payload);
      if (isReceptionistOrAdmin && !patients.some((patient) => patient.id === data.patientId)) {
        setBookingError("Selecciona un paciente activo de la lista.");
        return;
      }
      if (user?.role === "RECEPTIONIST") {
        const patient = patients.find((item) => item.id === data.patientId);
        const service = specialty?.services.find((item) => item.id === data.treatmentId);
        const dentist = dentists.find((item) => item.id === data.dentistId);
        if (!patient || !specialty || !service || !dentist) {
          setBookingError("Revisa el paciente, la especialidad, el servicio y el odontólogo seleccionados.");
          return;
        }
        setReview({ data, patientName: `${patient.firstName} ${patient.lastName}`, patientEmail: patient.email, specialtyName: specialty.name, serviceName: service.name, dentistName: `${dentist.user.firstName} ${dentist.user.lastName}` });
        return;
      }
      await saveBooking(data);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "No se pudo registrar la cita.");
    }
  }

  async function saveBooking(data: z.infer<typeof RequestAppointmentSchema>) {
    await createMutation.mutateAsync(data);
    setReview(null);
    setShowForm(false);
    setBookingError("");
    setPatientSearch("");
    setPatientPage(1);
    setQuestionnaire({ reason: "", hasPain: "", problemDuration: "" });
    setForm({ patientId: "", specialtyId: "", treatmentId: "", dentistId: "", date: "", startTime: "", endTime: "", notes: "" });
    toast(user?.role === "RECEPTIONIST" ? "Cita registrada y confirmada correctamente." : "Cita registrada correctamente.");
  }

  async function confirmBooking() {
    if (!review || createMutation.isPending) return;
    setBookingError("");
    try { await saveBooking(review.data); }
    catch (err) { setBookingError(err instanceof Error ? err.message : "No se pudo confirmar la cita. Revisa su disponibilidad."); }
  }

  async function handleAction(id: string, action: string) {
    try {
      if (action === "confirm") await confirmMutation.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }


  const isReceptionistOrAdmin = user?.role === "ADMIN" || user?.role === "RECEPTIONIST";
  const isDentist = user?.role === "DENTIST";
  const isPatient = user?.role === "PATIENT";

  function renderActions(appointment: Appointment, asMenu = true) {
    const items: ActionMenuItem[] = [
        { id: "view", label: "Ver detalle", icon: Eye, onAction: () => setDetailId(appointment.id) },
        { id: "reassign", label: "Reasignar odontólogo", icon: UserRoundCog, isHidden: !((user?.role === "RECEPTIONIST" && appointment.status === "PENDING") || (user?.role === "ADMIN" && appointment.status === "CONFIRMED")), onAction: () => setReassignAppointment(appointment) },
        { id: "confirm", label: "Confirmar cita", icon: CheckCircle, isHidden: !isReceptionistOrAdmin || appointment.status !== "PENDING", isDisabled: confirmMutation.isPending, onAction: () => { void handleAction(appointment.id, "confirm"); } },
        { id: "complete", label: "Completar cita", icon: CheckCircle, isHidden: !isDentist || appointment.status !== "CONFIRMED", onAction: () => setDetailId(appointment.id) },
        { id: "cancel", label: !isPatient && appointment.status === "CONFIRMED" ? "Solicitar cancelación" : "Cancelar cita", icon: XCircle, destructive: true, isHidden: !["RECEPTIONIST", "PATIENT"].includes(user?.role ?? "") || !["PENDING", "CONFIRMED"].includes(appointment.status), onAction: () => setCancelAppointment(appointment) },
    ];
    if (asMenu) return <ActionMenu label={`Acciones de la cita del ${formatCalendarDate(appointment.date)} a las ${formatTime(appointment.startTime)}`} items={items} />;
    return <div className="flex flex-wrap justify-end gap-2">{items.filter((item) => !item.isHidden).map((item) => {
      const Icon = item.icon;
      return <Button key={item.id} variant={item.destructive ? "destructive" : "outline"} size="sm" onPress={item.onAction} isDisabled={item.isDisabled}><Icon aria-hidden="true" />{item.label}</Button>;
    })}</div>;
  }

  if (appointmentsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reassignAppointment && <ReassignAppointmentDialog key={reassignAppointment.id} appointment={reassignAppointment} onClose={() => setReassignAppointment(null)} />}
      {cancelAppointment && <AppointmentCancellationDialog key={cancelAppointment.id} appointment={cancelAppointment} onClose={() => setCancelAppointment(null)} />}
      {review && <Dialog isOpen onOpenChange={(open) => { if (!open && !createMutation.isPending) setReview(null); }} isDismissable={!createMutation.isPending} showCloseButton={!createMutation.isPending} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisar y confirmar cita</DialogTitle>
          <DialogDescription>Verifica los datos de la atención. Al confirmar, la cita quedará registrada en estado confirmado.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Paciente</dt><dd className="min-w-0 break-words"><p className="font-medium">{review.patientName}</p><p>{review.patientEmail}</p></dd>
          <dt className="text-muted-foreground">Especialidad</dt><dd>{review.specialtyName}</dd>
          <dt className="text-muted-foreground">Servicio</dt><dd>{review.serviceName}</dd>
          <dt className="text-muted-foreground">Odontólogo</dt><dd>{review.dentistName}</dd>
          <dt className="text-muted-foreground">Fecha</dt><dd>{formatCalendarDate(review.data.date)}</dd>
          <dt className="text-muted-foreground">Horario</dt><dd>{formatTime(review.data.startTime)}–{formatTime(review.data.endTime)}</dd>
          {review.data.notes && <><dt className="text-muted-foreground">Notas</dt><dd className="min-w-0 break-words">{review.data.notes}</dd></>}
        </dl>
        {bookingError && <p role="alert" className="text-sm text-destructive">{bookingError}</p>}
        <DialogFooter>
          <Button variant="outline" onPress={() => setReview(null)} isDisabled={createMutation.isPending}>Volver y editar</Button>
          <Button onPress={() => void confirmBooking()} isDisabled={createMutation.isPending}>{createMutation.isPending ? "Confirmando..." : "Confirmar cita"}</Button>
        </DialogFooter>
      </Dialog>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Citas</h2>
          <p className="text-muted-foreground">Gestión de citas odontológicas</p>
        </div>
        {(isReceptionistOrAdmin || isPatient) && (
          <Button onPress={() => { setBookingError(""); setShowForm(!showForm); }} isDisabled={createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Cancelar" : "Nueva Cita"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <fieldset disabled={createMutation.isPending || !!review} className="space-y-4">
              {isReceptionistOrAdmin && (
                <div className="space-y-2">
                  <label id="appointment-patient-label" className="text-sm font-medium">Paciente *</label>
                  <Select aria-labelledby="appointment-patient-label" placeholder="Seleccionar paciente..." selectedKey={form.patientId || null} onSelectionChange={(key) => setForm({ ...form, patientId: key ? String(key) : "" })} onOpenChange={(open) => { if (open) void patientDirectory.refetch(); }} isRequired isDisabled={createMutation.isPending || !!review} className="w-full">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopover>
                      <SelectInput aria-label="Buscar paciente por nombre, teléfono, correo o código" placeholder="Buscar paciente..." value={patientSearch} onChange={(value) => { setPatientSearch(value); setPatientPage(1); setForm({ ...form, patientId: "" }); }} />
                      {patientDirectory.isFetching && <p role="status" className="p-3 text-xs text-muted-foreground">Cargando pacientes...</p>}
                      <SelectList items={patients} aria-label="Pacientes activos" className="max-h-60 overflow-y-auto" renderEmptyState={() => <p className="p-3 text-xs text-muted-foreground">{patientDirectory.isError ? "No se pudo cargar la lista de pacientes." : patientDirectory.isFetching ? "Buscando..." : "No se encontraron pacientes activos."}</p>}>
                        {(patient) => <SelectItem id={patient.id} textValue={`${patient.firstName} ${patient.lastName} · ${patient.phone || "Sin teléfono"}`} className="cursor-pointer [&>span:first-child]:whitespace-normal [&>span:first-child]:break-words">{patient.firstName} {patient.lastName} · {patient.phone || "Sin teléfono"}</SelectItem>}
                      </SelectList>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t p-2 text-xs">
                        <button type="button" className="underline" disabled={patientDirectory.isFetching} onClick={() => void patientDirectory.refetch()}>Actualizar lista</button>
                        {(patientDirectory.data?.totalPages ?? 0) > 1 && <>
                          <button type="button" className="underline disabled:opacity-50" disabled={patientPage <= 1 || patientDirectory.isFetching} onClick={() => { setPatientPage((page) => page - 1); setForm({ ...form, patientId: "" }); }}>Anterior</button>
                          <span>{patientPage} / {patientDirectory.data?.totalPages}</span>
                          <button type="button" className="underline disabled:opacity-50" disabled={patientPage >= (patientDirectory.data?.totalPages ?? 1) || patientDirectory.isFetching} onClick={() => { setPatientPage((page) => page + 1); setForm({ ...form, patientId: "" }); }}>Siguiente</button>
                        </>}
                      </div>
                    </SelectPopover>
                  </Select>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <Link href="/patients" target="_blank" rel="noopener noreferrer" className="underline">Registrar paciente</Link>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="appointment-specialty" className="text-sm font-medium">Especialidad *</label>
                <select id="appointment-specialty" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" required value={form.specialtyId} onChange={(e) => setForm({ ...form, specialtyId: e.target.value, treatmentId: "", dentistId: "", startTime: "", endTime: "" })}>
                  <option value="">{booking.isPending ? "Cargando especialidades..." : "Seleccionar especialidad..."}</option>
                  {booking.data?.filter((s) => s.services.length > 0).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {booking.isError && <p role="alert" className="text-sm text-destructive">No se pudo cargar el catálogo. <button type="button" className="underline" onClick={() => void booking.refetch()}>Reintentar</button></p>}
                {booking.isSuccess && !booking.data.some((s) => s.services.length > 0) && <p className="text-xs text-muted-foreground">No hay servicios disponibles para reservar. Comunícate con recepción.</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="appointment-service" className="text-sm font-medium">Servicio *</label>
                <select id="appointment-service" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" required disabled={!specialty} value={form.treatmentId} onChange={(e) => setForm({ ...form, treatmentId: e.target.value, startTime: "", endTime: "" })}>
                  <option value="">Seleccionar servicio...</option>
                  {specialty?.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMinutes} min{s.price === null ? "" : ` · S/ ${s.price.toFixed(2)}`}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Odontólogo</label>
                <select
                  className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  value={form.dentistId}
                  disabled={!specialty || dentistsLoading || dentistsError || !specialtyDentists.length}
                  onChange={(e) => setForm({ ...form, dentistId: e.target.value, startTime: "", endTime: "" })}
                  required
                >
                  <option value="">{dentistsLoading ? "Cargando odontólogos..." : "Seleccionar odontólogo..."}</option>
                  {specialtyDentists.map((d) => (
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
                {!form.dentistId || !form.date ? null : slotsLoading ? (
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
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {isPatient && <div className="space-y-3">
                  <label className="block text-sm font-medium">Motivo de consulta<input required minLength={3} maxLength={1000} className="mt-1 w-full rounded-lg border p-2" value={questionnaire.reason} onChange={(event) => setQuestionnaire({ ...questionnaire, reason: event.target.value })} /></label>
                  <label className="block text-sm font-medium">¿Tienes dolor?<select required className="mt-1 w-full rounded-lg border p-2" value={questionnaire.hasPain} onChange={(event) => setQuestionnaire({ ...questionnaire, hasPain: event.target.value })}><option value="">Selecciona una opción</option><option value="yes">Sí</option><option value="no">No</option></select></label>
                  <label className="block text-sm font-medium">¿Desde cuándo tienes el problema?<input required maxLength={200} className="mt-1 w-full rounded-lg border p-2" value={questionnaire.problemDuration} onChange={(event) => setQuestionnaire({ ...questionnaire, problemDuration: event.target.value })} /></label>
                </div>}
                <label htmlFor="appointment-notes" className="text-sm font-medium">Notas (opcional)</label>
                <input
                  id="appointment-notes"
                  aria-invalid={!!notesError}
                  aria-describedby={notesError ? "appointment-notes-error" : undefined}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                {notesError && <p id="appointment-notes-error" role="alert" className="text-xs text-destructive">{notesError}</p>}
              </div>
              {!review && bookingError && <p role="alert" className="text-sm text-destructive">{bookingError}</p>}
              <Button type="submit" className="w-full" isDisabled={createMutation.isPending || !form.treatmentId || !form.startTime || !notesValidation.success || (isReceptionistOrAdmin && !form.patientId)}>
                {createMutation.isPending ? "Creando..." : user?.role === "RECEPTIONIST" ? "Revisar cita" : "Crear Cita"}
              </Button>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-0 flex-[1_1_18rem] space-y-1.5">
          <label htmlFor="appointment-search" className="text-xs font-medium text-muted-foreground">Buscar cita</label>
          <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="appointment-search"
            type="search"
            aria-label="Buscar por nombre de paciente, odontólogo o DNI"
            placeholder="Paciente, odontólogo o DNI..."
            className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          </div>
        </div>
        <DateRangePicker key={datePickerReset} value={dateRange} onChange={setDateRange} className="w-full sm:w-72 sm:flex-none" />
        <div className="flex-[1_1_9rem] space-y-1.5 sm:max-w-48">
          <label htmlFor="appointment-status" className="text-xs font-medium text-muted-foreground">Estado</label>
        <select
          id="appointment-status"
          aria-label="Filtrar por estado"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
        <Button variant="ghost" className="mt-6 h-9" onPress={() => {
          setSearch("");
          setStatusFilter("");
          setDateRange(null);
          setDatePickerReset((value) => value + 1);
        }}><RotateCcw aria-hidden="true" />Limpiar filtros</Button>
      </div>

      {/* Desktop table view */}
      <Card className="hidden overflow-hidden sm:block">
        <CardContent className="p-0">
          <Table aria-label="Listado de citas">
            <TableHeader>
              <TableHead isRowHeader>PACIENTE</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>ODONTÓLOGO</TableHead>
              <TableHead>FECHA Y HORA</TableHead>
              <TableHead>ESTADO</TableHead>
              <TableHead className="w-28 min-w-28 px-4 text-center">ACCIONES</TableHead>
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
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {apt.patient!.dni || "Sin registrar"}
                  </TableCell>
                  <TableCell>
                    Dr. {apt.dentist!.user.firstName} {apt.dentist!.user.lastName}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{formatCalendarDate(apt.date)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[apt.status] || ""}>{STATUS_LABELS[apt.status] ?? apt.status}</Badge>
                  </TableCell>
                  <TableCell className="w-28 min-w-28 px-4 text-center">
                    {renderActions(apt)}
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
                      DNI: {apt.patient!.dni || "Sin registrar"}
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
                    {formatCalendarDate(apt.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                  </span>
                </div>
                <div className="mt-3 flex justify-end border-t pt-3">
                  {renderActions(apt, false)}
                </div>
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
      {(isReceptionistOrAdmin || isPatient) && (
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
