"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/hooks/use-auth";
import {
  useDashboardOverview,
  useDashboardAgenda,
  useWaitingRoom,
  useCallNextPatient,
  useCheckInPatient,
} from "@/hooks/use-queries";
import type { AgendaRow, WaitingRoomRow } from "@biodentis/shared-types";
import {
  CalendarDays,
  CalendarPlus,
  Users,
  Stethoscope,
  Wallet,
  FolderOpen,
  MoreVertical,
  RefreshCw,
  Armchair,
  Volume2,
  UserPlus,
  ReceiptText,
  CalendarOff,
  UploadCloud,
  Package,
  TriangleAlert,
  LogIn,
} from "lucide-react";

const PAGE_SIZE = 5;

const STATUS_FILTERS = [
  { key: "", label: "Todas" },
  { key: "PENDING", label: "Pendientes" },
  { key: "CONFIRMED", label: "Confirmadas" },
  { key: "COMPLETED", label: "Completadas" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-secondary text-secondary-foreground",
  PENDING: "bg-muted text-muted-foreground",
  COMPLETED: "bg-secondary text-secondary-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
  NO_SHOW: "bg-muted text-muted-foreground",
};

const WAITING_LABELS: Record<string, string> = {
  WAITING: "En espera",
  TRIAGE: "En triaje",
  IN_CHAIR: "En sillón",
};

function formatMoney(value: number): string {
  return value.toLocaleString("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Variación porcentual vs ayer. `null` = sin base de comparación. */
function TrendChip({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">sin datos de ayer</span>;
  }
  const positive = change >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
        positive ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"
      }`}
    >
      {positive ? "▲" : "▼"} {positive ? "+" : ""}
      {change}%
    </span>
  );
}

function KpiCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {children}
    </div>
  );
}

function PatientAvatar({ row }: { row: AgendaRow }) {
  if (row.patient.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={row.patient.fullName}
        src={row.patient.avatarUrl}
        className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
      {initials(row.patient.fullName)}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [callMsg, setCallMsg] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useDashboardOverview();
  const { data: agenda, isLoading: agendaLoading } = useDashboardAgenda({
    status: statusFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: waitingRoom } = useWaitingRoom();
  const callNext = useCallNextPatient();
  const checkIn = useCheckInPatient();

  const handleCallNext = async () => {
    setCallMsg(null);
    try {
      const res = await callNext.mutateAsync();
      setCallMsg(res.called ? `Llamando a ${res.called.patient.fullName}` : (res.message ?? "No hay pacientes en espera"));
      setTimeout(() => setCallMsg(null), 4000);
    } catch (e) {
      setCallMsg(e instanceof Error ? e.message : "Error al llamar paciente");
    }
  };

  const setFilter = (key: string) => {
    setStatusFilter(key);
    setPage(1);
  };

  if (overviewLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  if (overviewError || !overview) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-destructive">
          {overviewError instanceof Error ? overviewError.message : "No se pudo cargar el dashboard"}
        </p>
      </div>
    );
  }

  const { appointments: apts, attendance, treatments, revenue, inventoryAlerts } = overview;
  const rows = agenda?.items ?? [];
  const room: WaitingRoomRow[] = waitingRoom ?? [];

  // Anchos de la barra apilada de "Citas Hoy".
  const pct = (n: number) => (apts.total > 0 ? (n / apts.total) * 100 : 0);

  const todayLabel = new Date(overview.date).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const filterCount = (key: string) => {
    if (key === "") return apts.total;
    if (key === "PENDING") return apts.pending;
    if (key === "CONFIRMED") return apts.confirmed;
    return apts.completed;
  };

  return (
    <div className="flex w-full flex-col space-y-6">
      {/* 1. Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Bienvenido, {user ? `${user.firstName} ${user.lastName}` : "—"}
            </h1>
            <Badge variant="secondary" className="rounded-full text-xs font-medium">
              {user?.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Resumen clínico y operativo de hoy, {todayLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="outline" size="sm" onPress={() => router.push("/appointments")}>
            <CalendarDays className="h-4 w-4" />
            Ver Calendario
          </Button>
          <Button size="sm" onPress={() => router.push("/appointments?new=1")}>
            <CalendarPlus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Citas Hoy" icon={CalendarDays}>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{apts.total}</span>
              <TrendChip change={apts.changeVsYesterday} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{apts.confirmed}</span> confirmadas •{" "}
              <span className="font-medium text-foreground">{apts.pending}</span> pendientes •{" "}
              <span className="font-medium text-foreground">{apts.completed}</span> completadas
            </p>
          </div>
          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct(apts.confirmed)}%` }} />
            <div className="h-full bg-muted-foreground/60" style={{ width: `${pct(apts.pending)}%` }} />
            <div className="h-full bg-muted-foreground/30" style={{ width: `${pct(apts.completed)}%` }} />
          </div>
        </KpiCard>

        <KpiCard title="Pacientes Atendidos" icon={Users}>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {attendance.attended}
                <span className="text-lg font-normal text-muted-foreground"> / {attendance.scheduled}</span>
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{attendance.percent}%</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ritmo estimado: {attendance.patientsPerHour} pacientes / hora
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${attendance.percent}%` }} />
          </div>
        </KpiCard>

        <KpiCard title="Tratamientos en Curso" icon={Stethoscope}>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{treatments.active}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Activos
              </span>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {treatments.byCategory.length > 0
                ? treatments.byCategory.slice(0, 3).map((c) => `${c.category} (${c.count})`).join(", ")
                : "Sin tratamientos activos"}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1">
            {treatments.byCategory.slice(0, 3).map((c, i) => (
              <div
                key={c.category}
                className={`h-1 flex-1 rounded ${i === 0 ? "bg-primary" : i === 1 ? "bg-muted-foreground/60" : "bg-muted-foreground/30"}`}
              />
            ))}
            {treatments.byCategory.length === 0 && <div className="h-1 flex-1 rounded bg-muted" />}
          </div>
        </KpiCard>

        <KpiCard title="Ingresos Estimados Hoy" icon={Wallet}>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{formatMoney(revenue.estimated)}</span>
              <TrendChip change={revenue.changeVsYesterday} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Meta proyectada: {formatMoney(revenue.goal)} ({revenue.percentOfGoal}%)
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, revenue.percentOfGoal)}%` }} />
          </div>
        </KpiCard>
      </div>

      {/* 3. Agenda + columna lateral */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Agenda del día */}
        <div className="flex flex-col rounded-xl bg-card shadow-sm lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Agenda y Citas de Hoy</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Próximas citas programadas con filtro rápido por estado
              </p>
            </div>
            <div className="inline-flex items-center self-start rounded-lg bg-muted p-1 sm:self-auto">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    statusFilter === f.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label} ({filterCount(f.key)})
                </button>
              ))}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Hora</th>
                  <th className="px-4 py-3 font-semibold">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Odontólogo</th>
                  <th className="px-4 py-3 font-semibold">Tratamiento</th>
                  <th className="px-4 py-3 font-semibold">Sillón / Sala</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {agendaLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Cargando agenda...
                    </td>
                  </tr>
                )}
                {!agendaLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No hay citas para este filtro
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const cancelled = row.status === "CANCELLED";
                  return (
                    <tr key={row.id} className={`transition-colors hover:bg-muted/40 ${cancelled ? "opacity-75" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`font-semibold ${cancelled ? "line-through" : ""}`}>
                          {formatTime(row.startTime)}
                        </span>
                        <span className="block text-xs text-muted-foreground">{row.durationMinutes} min</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <PatientAvatar row={row} />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{row.patient.fullName}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.patient.patientCode ?? "Sin código"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">Dr. {row.dentist.fullName}</td>
                      <td className="max-w-xs px-4 py-3.5">
                        <span className="block truncate font-medium">{row.treatment?.name ?? "Sin tratamiento"}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.plan && row.sessionNumber
                            ? `Sesión ${row.sessionNumber} de ${row.plan.totalSessions}`
                            : (row.notes ?? row.treatment?.category ?? "—")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                          {row.dentalUnit?.name ?? "Sin asignar"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cancelled ? "bg-destructive" : "bg-primary"}`} />
                          {row.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!cancelled && row.waitingStatus === "NOT_ARRIVED" && (
                            <button
                              type="button"
                              title="Registrar llegada del paciente"
                              onClick={() => checkIn.mutate({ id: row.id })}
                              disabled={checkIn.isPending}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                              <LogIn className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title={cancelled ? "Reprogramar cita" : "Historial y expediente"}
                            onClick={() =>
                              router.push(cancelled ? `/appointments?reschedule=${row.id}` : `/patients/${row.patient.id}`)
                            }
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {cancelled ? <RefreshCw className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            title="Ver cita"
                            onClick={() => router.push(`/appointments?id=${row.id}`)}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col items-center justify-between gap-3 rounded-b-xl bg-muted/30 p-4 sm:flex-row">
            <span className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{rows.length}</span> de{" "}
              <span className="font-medium text-foreground">{agenda?.total ?? 0}</span> citas programadas
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {agenda?.page ?? 1} de {agenda?.totalPages ?? 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                isDisabled={page >= (agenda?.totalPages ?? 1)}
                onPress={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Sala de espera */}
          <div className="flex flex-col rounded-xl bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Armchair className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Sala de Espera</h3>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {room.length} paciente{room.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3">
              {room.length === 0 && (
                <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  No hay pacientes en sala. Registra la llegada desde la cita para que aparezcan aquí.
                </p>
              )}
              {room.map((p) => {
                const urgent = p.priority !== "NORMAL";
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{p.patient.fullName}</span>
                        {urgent && <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />}
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          urgent ? "bg-destructive/10 font-semibold text-destructive" : "bg-background"
                        }`}
                      >
                        {p.waitingStatus === "IN_CHAIR"
                          ? (p.dentalUnit?.name ?? "En sillón")
                          : (WAITING_LABELS[p.waitingStatus] ?? p.waitingStatus)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        {p.checkInAt
                          ? `Llegó ${new Date(p.checkInAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`
                          : (p.treatment?.name ?? "Sin tratamiento")}
                      </span>
                      {urgent ? (
                        <span className="shrink-0 font-medium text-destructive">
                          {p.priority === "EMERGENCY" ? "Prioridad 1" : "Prioridad 2"}
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Espera: {p.waitedMinutes} min
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="secondary"
              className="mt-4 w-full"
              onPress={handleCallNext}
              isDisabled={callNext.isPending || room.length === 0}
            >
              <Volume2 className="h-4 w-4" />
              {callNext.isPending ? "Llamando..." : "Llamar siguiente paciente"}
            </Button>
            {callMsg && <p className="mt-2 text-center text-xs text-muted-foreground">{callMsg}</p>}
          </div>

          {/* Acciones rápidas */}
          <div className="flex flex-col rounded-xl bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  icon: UserPlus,
                  title: "Registrar Nuevo Paciente",
                  desc: "Apertura de historial clínico",
                  href: "/patients?new=1",
                },
                {
                  icon: ReceiptText,
                  title: "Catálogo de Tratamientos",
                  desc: "Procedimientos, duración y precios",
                  href: "/config?section=treatments",
                },
                {
                  icon: CalendarOff,
                  title: "Bloquear Horario de Sillón",
                  desc: "Mantenimiento o descanso médico",
                  href: "/config?section=dental-units",
                },
                {
                  icon: UploadCloud,
                  title: "Historial Clínico",
                  desc: "Consultar expedientes y notas",
                  href: "/clinical-records",
                },
              ].map((action) => (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => router.push(action.href)}
                  className="group flex w-full items-center gap-3 rounded-lg bg-muted/50 p-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{action.title}</span>
                    <span className="text-xs text-muted-foreground">{action.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Alerta de insumos */}
          {inventoryAlerts.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background">
                <Package className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Alerta de Insumos</span>
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                </div>
                <ul className="mt-1 space-y-0.5 text-xs leading-relaxed text-muted-foreground">
                  {inventoryAlerts.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <span className="font-medium text-foreground">{item.name}</span> con bajo stock (quedan{" "}
                      {item.stock} {item.unit}, mínimo {item.minStock}).
                    </li>
                  ))}
                </ul>
                {inventoryAlerts.length > 3 && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    y {inventoryAlerts.length - 3} insumo(s) más por reponer.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
