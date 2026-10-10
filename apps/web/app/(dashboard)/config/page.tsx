"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Pagination } from "@workspace/ui/components/pagination";
import { usePagination } from "@workspace/ui/hooks/use-pagination";
import { useAuth } from "@/hooks/use-auth";
import {
  useFullConfig,
  useUpdateClinic,
  useDentalUnits,
  useCreateDentalUnit,
  useUpdateDentalUnit,
  useDeleteDentalUnit,
  useEmailTemplates,
  useUpdateEmailTemplate,
  useToggleEmailTemplate,
  useSecuritySettings,
  useUpdateSecuritySettings,
  useJwtSettings,
  useUpdateJwtSettings,
  useNotificationSettings,
  useUpdateNotificationSettings,
  useDentists,
  useClinicExceptions,
  useCreateClinicException,
  useDentistAvailability,
  useReplaceDentistAvailability,
  type ClinicException,
  type WeeklyAvailability,
} from "@/hooks/use-queries";
import { Settings, Building2, CalendarClock, Bell, Shield, FileSearch, Save, Plus, Trash2, Pencil } from "lucide-react";

const TABS = [
  { id: "general", label: "General y Clinica", icon: Building2, desc: "Datos institucionales y logo" },
  { id: "horarios", label: "Horarios y Excepciones", icon: CalendarClock, desc: "Feriados, recesos y sillones" },
  { id: "notificaciones", label: "Notificaciones", icon: Bell, desc: "Plantillas email y recordatorios" },
  { id: "seguridad", label: "Seguridad", icon: Shield, desc: "Politicas, MFA y JWT" },
  { id: "auditoria", label: "Auditoria", icon: FileSearch, desc: "AuditLog inmutable" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ConfigPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Solo administradores pueden acceder a la configuracion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px]">ADMINISTRACION DEL SISTEMA</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Configuracion del Sistema</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestion centralizada de parametros clinicos, horarios, automatizaciones y registros de seguridad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 sticky top-20">
          <nav className="bg-card rounded-xl ring-1 ring-foreground/10 p-2 flex flex-col gap-1 shadow-xs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold leading-tight truncate">{tab.label}</span>
                  <span className={`text-xs mt-0.5 truncate ${activeTab === tab.id ? "text-white/80" : "text-muted-foreground"}`}>
                    {tab.desc}
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "horarios" && <HorariosTab />}
          {activeTab === "notificaciones" && <NotificacionesTab />}
          {activeTab === "seguridad" && <SeguridadTab />}
          {activeTab === "auditoria" && <AuditoriaTab />}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { data: config, isLoading } = useFullConfig();
  const updateClinic = useUpdateClinic();
  const createUnit = useCreateDentalUnit();
  const updateUnit = useUpdateDentalUnit();
  const deleteUnit = useDeleteDentalUnit();

  const clinic = (config as any)?.clinic;
  const dentalUnits = Array.isArray((config as any)?.dentalUnits) ? (config as any).dentalUnits : [];

  const [clinicForm, setClinicForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    rut: "",
    website: "",
  });

  const [initialized, setInitialized] = useState(false);

  if (clinic && !initialized) {
    setClinicForm({
      name: clinic.name || "",
      address: clinic.address || "",
      phone: clinic.phone || "",
      email: clinic.email || "",
      rut: clinic.rut || "",
      website: clinic.website || "",
    });
    setInitialized(true);
  }

  async function handleSaveClinic() {
    try {
      await updateClinic.mutateAsync(clinicForm);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  if (isLoading) {
    return <div className="flex min-h-[30vh] items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Datos de la Clinica</CardTitle>
              <CardDescription>Informacion publica y fiscal utilizada en recetas, cotizaciones y correos.</CardDescription>
            </div>
            <Badge variant="secondary">Sede Principal</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold">Nombre Institucional</label>
              <input
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
                value={clinicForm.name}
                onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold">Direccion Fisica</label>
              <input
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
                value={clinicForm.address}
                onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Telefono Institucional</label>
              <input
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
                value={clinicForm.phone}
                onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Correo Electronico Oficial</label>
              <input
                type="email"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
                value={clinicForm.email}
                onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">RUT / Identificacion Fiscal</label>
              <input
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
                value={clinicForm.rut}
                onChange={(e) => setClinicForm({ ...clinicForm, rut: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Sitio Web / Portal Pacientes</label>
              <input
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
                value={clinicForm.website}
                onChange={(e) => setClinicForm({ ...clinicForm, website: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button variant="outline" size="sm">Descartar</Button>
            <Button size="sm" onPress={handleSaveClinic} isDisabled={updateClinic.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateClinic.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Infraestructura y Boxes Dentales</CardTitle>
          <CardDescription>Configuracion de unidades clinicas asignables para citas y procedimientos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dentalUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-3">No hay unidades registradas</p>
            ) : (
              dentalUnits.map((unit: any) => (
                <div key={unit.id} className="p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">{unit.type}</span>
                    <p className="text-xl font-bold mt-0.5">{unit.name}</p>
                    <span className={`text-xs font-medium ${unit.status === "ACTIVE" ? "text-emerald-600" : unit.status === "MAINTENANCE" ? "text-amber-600" : "text-muted-foreground"}`}>
                      {unit.status === "ACTIVE" ? "Operativo" : unit.status === "MAINTENANCE" ? "Mantenimiento" : "Inactivo"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-xs" onPress={() => updateUnit.mutate({ id: unit.id, data: { status: unit.status === "ACTIVE" ? "MAINTENANCE" : "ACTIVE" } })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onPress={() => deleteUnit.mutate(unit.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const SCOPE_LABELS = {
  DENTIST: "Receso de odontologo",
  CLINIC: "Feriado de clinica",
  UNIT: "Mantenimiento de unidad",
} as const;

const EMPTY_EXCEPTION_FORM = { scope: "CLINIC", dentistId: "", dentalUnitId: "", startDate: "", endDate: "", reason: "" };

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
// Orden de visualizacion: lunes a domingo
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIME_INPUT_CLASS =
  "flex h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50";

type DaySchedule = { enabled: boolean; startTime: string; endTime: string };
type WeekState = Record<number, DaySchedule>;

function buildWeek(days: WeeklyAvailability[] | undefined): WeekState {
  const week: WeekState = {};
  for (const d of DAY_ORDER) {
    const found = days?.find((x) => x.dayOfWeek === d);
    week[d] = found
      ? { enabled: true, startTime: found.startTime, endTime: found.endTime }
      : { enabled: false, startTime: "09:00", endTime: "18:00" };
  }
  return week;
}

function WeekScheduleEditor({
  initial,
  onSave,
  isSaving,
}: {
  initial: WeeklyAvailability[] | undefined;
  onSave: (days: WeeklyAvailability[]) => Promise<unknown>;
  isSaving: boolean;
}) {
  const [week, setWeek] = useState<WeekState>(() => buildWeek(initial));
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setWeek(buildWeek(initial));
  }, [initial]);

  const update = (day: number, patch: Partial<DaySchedule>) => {
    setMessage(null);
    setWeek((w) => ({ ...w, [day]: { ...w[day]!, ...patch } }));
  };

  const handleSave = async () => {
    const days = DAY_ORDER.filter((d) => week[d]!.enabled).map((d) => ({
      dayOfWeek: d,
      startTime: week[d]!.startTime,
      endTime: week[d]!.endTime,
    }));
    if (days.some((d) => !d.startTime || !d.endTime || d.startTime >= d.endTime)) {
      setMessage({ type: "error", text: "La hora de fin debe ser posterior a la de inicio" });
      return;
    }
    try {
      await onSave(days);
      setMessage({ type: "ok", text: "Horario guardado" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {DAY_ORDER.map((d) => {
          const day = week[d]!;
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 p-3">
              <label className="flex w-36 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => update(d, { enabled: e.target.checked })}
                />
                {DAY_LABELS[d]}
              </label>
              {day.enabled ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="time"
                    aria-label={`Hora de inicio ${DAY_LABELS[d]}`}
                    className={TIME_INPUT_CLASS}
                    value={day.startTime}
                    onChange={(e) => update(d, { startTime: e.target.value })}
                  />
                  a
                  <input
                    type="time"
                    aria-label={`Hora de fin ${DAY_LABELS[d]}`}
                    className={TIME_INPUT_CLASS}
                    value={day.endTime}
                    onChange={(e) => update(d, { endTime: e.target.value })}
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Cerrado / sin atencion</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        {message && (
          <p className={`text-sm ${message.type === "ok" ? "text-emerald-600" : "text-destructive"}`}>{message.text}</p>
        )}
        <Button size="sm" onClick={handleSave} isDisabled={isSaving}>
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? "Guardando..." : "Guardar horario"}
        </Button>
      </div>
    </div>
  );
}

function parseGeneralHours(raw: string | null | undefined): WeeklyAvailability[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WeeklyAvailability[]) : undefined;
  } catch {
    return undefined;
  }
}

function ClinicHoursCard() {
  const { data: config } = useFullConfig();
  const updateClinic = useUpdateClinic();
  const clinic = (config as { clinic?: { generalHours?: string | null } } | undefined)?.clinic;
  const initial = useMemo(() => parseGeneralHours(clinic?.generalHours), [clinic?.generalHours]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario de apertura de la clinica</CardTitle>
        <CardDescription>Dias y horas en que la clinica atiende pacientes.</CardDescription>
      </CardHeader>
      <CardContent>
        <WeekScheduleEditor
          initial={initial}
          isSaving={updateClinic.isPending}
          onSave={(days) => updateClinic.mutateAsync({ generalHours: JSON.stringify(days) })}
        />
      </CardContent>
    </Card>
  );
}

function DentistHoursCard() {
  const { data: dentists } = useDentists();
  const [dentistId, setDentistId] = useState("");
  const { data: availability, isLoading } = useDentistAvailability(dentistId);
  const replace = useReplaceDentistAvailability(dentistId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidad semanal por odontologo</CardTitle>
        <CardDescription>Turnos fijos semanales que determinan los horarios reservables de cada profesional.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-1.5">
          <label className="text-xs font-semibold">Odontologo</label>
          <select
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors"
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
          >
            <option value="">Selecciona...</option>
            {dentists?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.firstName} {d.user.lastName}
              </option>
            ))}
          </select>
        </div>
        {!dentistId ? (
          <p className="text-sm text-muted-foreground">Selecciona un odontologo para editar su horario.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <WeekScheduleEditor
            key={dentistId}
            initial={availability ?? []}
            isSaving={replace.isPending}
            onSave={(days) => replace.mutateAsync(days)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function HorarioBaseSection() {
  return (
    <>
      <ClinicHoursCard />
      <DentistHoursCard />
    </>
  );
}

const HORARIO_SUBTABS = [
  { id: "base", label: "Horario Base de Atencion" },
  { id: "excepciones", label: "Excepciones y Bloqueos" },
] as const;

function HorariosTab() {
  const [sub, setSub] = useState<(typeof HORARIO_SUBTABS)[number]["id"]>("base");
  return (
    <>
      <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {HORARIO_SUBTABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sub === t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              sub === t.id ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === "base" ? <HorarioBaseSection /> : <ExcepcionesSection />}
    </>
  );
}

function ExcepcionesSection() {
  const { data: exceptions, isLoading } = useClinicExceptions();
  const { data: dentists } = useDentists();
  const { data: units } = useDentalUnits();
  const createException = useCreateClinicException();

  const exceptionList = exceptions ?? [];
  const pagination = usePagination(exceptionList, 5);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EXCEPTION_FORM);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary transition-colors";

  const targetName = (e: ClinicException) => {
    if (e.scope === "CLINIC") return "Toda la clinica";
    if (e.scope === "UNIT") return units?.find((u) => u.id === e.dentalUnitId)?.name ?? "Unidad";
    const d = dentists?.find((x) => x.id === e.dentistId);
    return d ? `${d.user.firstName} ${d.user.lastName}` : "Odontologo";
  };

  const handleSubmit = () => {
    setError(null);
    if (!form.startDate || !form.endDate) {
      setError("Indica fecha de inicio y fin");
      return;
    }
    createException.mutate(
      {
        scope: form.scope,
        dentistId: form.scope === "DENTIST" ? form.dentistId || undefined : undefined,
        dentalUnitId: form.scope === "UNIT" ? form.dentalUnitId || undefined : undefined,
        // Dias completos: de 00:00 del inicio a 23:59 del fin
        startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
        reason: form.reason || undefined,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_EXCEPTION_FORM);
          setShowForm(false);
        },
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Horarios y Excepciones Clinicas</CardTitle>
            <CardDescription>Gestion de feriados, recesos medicos y mantenimiento de equipamiento.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva Excepcion
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Tipo</label>
              <select className={inputClass} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {form.scope === "DENTIST" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Odontologo</label>
                <select className={inputClass} value={form.dentistId} onChange={(e) => setForm({ ...form, dentistId: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {dentists?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.firstName} {d.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.scope === "UNIT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Unidad dental</label>
                <select className={inputClass} value={form.dentalUnitId} onChange={(e) => setForm({ ...form, dentalUnitId: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {units?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Desde</label>
              <input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Hasta</label>
              <input type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold">Motivo</label>
              <input className={inputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSubmit} isDisabled={createException.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : !exceptions?.length ? (
          <p className="text-sm text-muted-foreground">No hay excepciones registradas.</p>
        ) : (
          <div className="space-y-2">
            {pagination.pageItems.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {targetName(e)} · {SCOPE_LABELS[e.scope]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.startDate).toLocaleDateString()} - {new Date(e.endDate).toLocaleDateString()}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{e.status}</Badge>
              </div>
            ))}
            <div className="overflow-hidden rounded-lg border">
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                pageSizeOptions={[5, 10, 25]}
                label="excepciones"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificacionesTab() {
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const { data: notifSettings } = useNotificationSettings();
  const updateNotif = useUpdateNotificationSettings();
  const toggleTemplate = useToggleEmailTemplate();

  const templateList = Array.isArray(templates) ? templates : [];
  const settings = Array.isArray(notifSettings) ? notifSettings : [];
  const hoursSetting = settings.find((s: any) => s.key === "reminder_hours_before");
  const hours = hoursSetting?.value || "3";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Correo</CardTitle>
          <CardDescription>Administre las notificaciones automatizadas enviadas en cada fase de la atencion.</CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : templateList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay plantillas configuradas</p>
          ) : (
            <div className="divide-y">
              {templateList.map((tpl: any) => (
                <div key={tpl.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-primary border border-blue-200 flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold block">{tpl.name}</span>
                      <span className="text-xs text-muted-foreground">{tpl.subject}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm">Editar</Button>
                    <button
                      onClick={() => toggleTemplate.mutate(tpl.id)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${tpl.isActive ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tpl.isActive ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de Envio y Anticipacion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold block">Horas de anticipacion del recordatorio</span>
                <span className="text-[11px] text-muted-foreground">Tiempo previo a la cita para enviar recordatorio</span>
              </div>
              <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border">
                <Button variant="ghost" size="icon-xs">-</Button>
                <span className="w-10 text-center text-xs font-bold text-primary">{hours}</span>
                <span className="text-xs text-muted-foreground">hrs</span>
                <Button variant="ghost" size="icon-xs">+</Button>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10">
              <span className="text-xs font-semibold block">Canales de entrega simultanea</span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Se enviara recordatorio por Email y WhatsApp {hours} horas antes de la cita.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function SeguridadTab() {
  const { data: secSettings, isLoading: secLoading } = useSecuritySettings();
  const { data: jwtSettings } = useJwtSettings();
  const updateSec = useUpdateSecuritySettings();
  const updateJwt = useUpdateJwtSettings();

  const sec = Array.isArray(secSettings) ? secSettings : [];
  const jwt = Array.isArray(jwtSettings) ? jwtSettings : [];

  const minLength = sec.find((s: any) => s.key === "password_min_length")?.value || "8";
  const requireUpper = sec.find((s: any) => s.key === "password_require_uppercase")?.value === "true";
  const requireNumbers = sec.find((s: any) => s.key === "password_require_numbers")?.value === "true";
  const requireSpecial = sec.find((s: any) => s.key === "password_require_special")?.value === "true";
  const accessMinutes = jwt.find((s: any) => s.key === "jwt_access_minutes")?.value || "15";
  const refreshDays = jwt.find((s: any) => s.key === "jwt_refresh_days")?.value || "7";

  function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    );
  }

  async function handleSaveSecurity() {
    try {
      await updateSec.mutateAsync({
        settings: [
          { key: "password_require_uppercase", value: String(requireUpper) },
          { key: "password_require_numbers", value: String(requireNumbers) },
          { key: "password_require_special", value: String(requireSpecial) },
        ],
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleSaveJwt() {
    try {
      await updateJwt.mutateAsync({
        settings: [
          { key: "jwt_access_minutes", value: accessMinutes },
          { key: "jwt_refresh_days", value: refreshDays },
        ],
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  if (secLoading) {
    return <div className="flex min-h-[30vh] items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Politica de Contraseñas</CardTitle>
          <CardDescription>Parametros criptograficos y reglas de longitud exigidas para odontologos y administradores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10">
            <div>
              <span className="text-xs font-semibold block">Longitud minima de contrasena</span>
              <span className="text-[11px] text-muted-foreground">Recomendado: 8+ caracteres</span>
            </div>
            <input
              type="number"
              min={6}
              max={32}
              className="h-8 w-16 px-2 text-center rounded-lg bg-card border border-input text-xs font-bold text-primary focus:outline-none focus:border-primary"
              value={minLength}
              readOnly
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10">
            <div>
              <span className="text-xs font-semibold block">Requerir al menos una mayuscula</span>
              <span className="text-[11px] text-muted-foreground">Letras mayusculas (A-Z)</span>
            </div>
            <Toggle checked={requireUpper} onToggle={() => {}} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10">
            <div>
              <span className="text-xs font-semibold block">Requerir al menos un numero</span>
              <span className="text-[11px] text-muted-foreground">Digitos numericos (0-9)</span>
            </div>
            <Toggle checked={requireNumbers} onToggle={() => {}} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10">
            <div>
              <span className="text-xs font-semibold block">Requerir caracteres especiales</span>
              <span className="text-[11px] text-muted-foreground">Simbolos como (!@#$%^&amp;*)</span>
            </div>
            <Toggle checked={requireSpecial} onToggle={() => {}} />
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button size="sm" onPress={handleSaveSecurity} isDisabled={updateSec.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateSec.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesiones y Tokens JWT</CardTitle>
          <CardDescription>Control del ciclo de vida de tokens criptograficos JSON Web Tokens (JWT).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Duracion de Access Token (minutos)</span>
                <Badge variant="outline" className="text-[10px]">Recomendado: 15m</Badge>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={120}
                  className="h-8 w-20 px-2 text-center rounded-lg bg-card border border-input text-xs font-bold text-primary focus:outline-none focus:border-primary"
                  value={accessMinutes}
                  readOnly
                />
                <span className="text-xs text-muted-foreground">minutos</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/60 ring-1 ring-foreground/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Duracion de Refresh Token (dias)</span>
                <Badge variant="outline" className="text-[10px]">Estandar: 7 dias</Badge>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="h-8 w-20 px-2 text-center rounded-lg bg-card border border-input text-xs font-bold text-primary focus:outline-none focus:border-primary"
                  value={refreshDays}
                  readOnly
                />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block">Advertencia de seguridad del sistema</span>
              <p className="mt-0.5">Cambiar estos valores cerrara la sesion de todos los usuarios activos actualmente en la plataforma.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button size="sm" onPress={handleSaveJwt} isDisabled={updateJwt.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateJwt.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AuditoriaTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle>Registro de Auditoria (AuditLog)</CardTitle>
              <Badge variant="outline" className="text-[10px]">Solo lectura / Inmutable</Badge>
            </div>
            <CardDescription>Historial inmutable de eventos del sistema (Solo lectura).</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <FileSearch className="h-4 w-4 mr-1" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Tabla de solo lectura con el historial de acciones del sistema. Los registros no pueden ser modificados ni eliminados.
        </p>
      </CardContent>
    </Card>
  );
}
