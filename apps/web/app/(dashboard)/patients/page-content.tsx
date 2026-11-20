"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ActionMenu } from "@workspace/ui/components/action-menu";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@workspace/ui/components/table";
import {
  usePatients,
  usePatientStats,
  usePatientDetail,
  useCreatePatient,
  useUpdatePatient,
  useSetPatientActive,
  useExportPatients,
} from "@/hooks/use-queries";
import { useAuth } from "@/hooks/use-auth";
import { formatCalendarDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";
import type { PatientRow } from "@biodentis/shared-types";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Search,
  Plus,
  Download,
  RotateCcw,
  Eye,
  Edit,
  UserMinus,
  UserPlus,
  ShieldCheck,
  Lock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

/** Longitud mínima del motivo de auditoría. El backend exige lo mismo. */
const MIN_AUDIT_REASON = 15;

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-100 text-gray-800",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Atendida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const EMPTY_CREATE = {
  dni: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  address: "",
};

const EMPTY_EDIT = {
  dni: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  auditReason: "",
};

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function safeDate(value: string | null | undefined): string {
  if (!value) return "—";
  return formatDateTime(value);
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="mt-0.5 text-xl font-semibold">{value}</span>
          <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientsPage() {
  const { user } = useAuth();
  const isDentist = user?.role === "DENTIST";
  /** Solo ADMIN y RECEPTIONIST escriben; el odontólogo consulta. */
  const canManage = user?.role === "ADMIN" || user?.role === "RECEPTIONIST";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      appointments: appointmentFilter === "all" ? undefined : appointmentFilter,
    }),
    [search, statusFilter, appointmentFilter]
  );

  const { data: list, isLoading, error } = usePatients({ ...filters, page, pageSize });
  const { data: stats } = usePatientStats();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const setActive = useSetPatientActive();
  const exportPatients = useExportPatients();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<PatientRow | null>(null);
  const [selected, setSelected] = useState<PatientRow | null>(null);

  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [statusReason, setStatusReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: detail, isLoading: detailLoading } = usePatientDetail(drawerId);

  const rows = list?.items ?? [];
  const total = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  const auditLength = editForm.auditReason.trim().length;
  const canSaveEdit = auditLength >= MIN_AUDIT_REASON && !updatePatient.isPending;

  /** Cualquier cambio de filtro vuelve a la primera página. */
  const withReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAppointmentFilter("all");
    setPage(1);
  };

  const openEdit = (patient: PatientRow) => {
    setSelected(patient);
    setEditForm({
      dni: patient.dni ?? "",
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone ?? "",
      address: patient.address ?? "",
      auditReason: "",
    });
    setFormError(null);
    setEditOpen(true);
  };

  const openStatusDialog = (patient: PatientRow) => {
    setStatusTarget(patient);
    setStatusReason("");
    setFormError(null);
  };

  const handleCreate = async () => {
    setFormError(null);
    try {
      await createPatient.mutateAsync(createForm);
      setCreateForm(EMPTY_CREATE);
      setCreateOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al crear el paciente");
    }
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setFormError(null);
    try {
      await updatePatient.mutateAsync({ id: selected.id, data: editForm });
      setEditOpen(false);
      setSelected(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al guardar los cambios");
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setFormError(null);
    try {
      await setActive.mutateAsync({
        id: statusTarget.id,
        isActive: !statusTarget.isActive,
        reason: statusReason,
      });
      setStatusTarget(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al cambiar el estado");
    }
  };

  const handleExport = () => exportPatients.mutate(filters);

  const pct = (value: number) =>
    stats && stats.total > 0 ? `${Math.round((value / stats.total) * 1000) / 10}%` : "0%";

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span>{isDentist ? "Mis pacientes" : "Administración del sistema"}</span>
            <span className="text-[10px]">•</span>
            <span className="font-medium text-foreground">Directorio de Pacientes</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
            <Badge variant="secondary" className="rounded-full text-xs font-medium">
              {stats?.total ?? 0} paciente{stats?.total === 1 ? "" : "s"}{" "}
              {isDentist ? "atendidos" : "registrados"}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {isDentist
              ? "Pacientes que has atendido. El historial mostrado corresponde únicamente a tus propias citas."
              : "Directorio administrativo de pacientes registrados. Gestión de datos personales, estado de cuenta y trazabilidad operativa."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              {isDentist
                ? "Acceso restringido a tus pacientes"
                : "Solo metadatos no clínicos"}
            </span>
          </div>
          {canManage && (
            <Button size="sm" onPress={() => { setCreateForm(EMPTY_CREATE); setFormError(null); setCreateOpen(true); }}>
              <Plus className="h-4 w-4" />
              Nuevo Paciente
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={isDentist ? "Pacientes Atendidos" : "Total Pacientes Base"}
          value={stats?.total ?? 0}
          hint="Registros sincronizados"
          icon={Users}
        />
        <KpiCard
          label="Cuentas Activas"
          value={stats?.active ?? 0}
          hint={`${pct(stats?.active ?? 0)} operando con normalidad`}
          icon={UserCheck}
        />
        <KpiCard
          label="Pacientes Desactivados"
          value={stats?.inactive ?? 0}
          hint="Acceso al portal restringido"
          icon={UserX}
        />
        <KpiCard
          label="Altas Este Mes"
          value={`+${stats?.newThisMonth ?? 0}`}
          hint={new Date().toLocaleDateString("es-PE", { month: "long", year: "numeric" })}
          icon={TrendingUp}
        />
      </div>

      {/* Barra de filtros */}
      <Card>
        <CardContent className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre, DNI, código, correo o teléfono..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  withReset(setSearch)(e.target.value)
                }
              />
            </div>

            <Select aria-label="Filtrar pacientes por estado" placeholder="Filtrar por estado" selectedKey={statusFilter} onSelectionChange={(k) => withReset(setStatusFilter)(String(k))}>
              <SelectTrigger className="min-w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">Todos los estados</SelectItem>
                <SelectItem id="active">Activos</SelectItem>
                <SelectItem id="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select
              selectedKey={appointmentFilter}
              aria-label="Filtrar pacientes por citas registradas"
              placeholder="Filtrar por citas"
              onSelectionChange={(k) => withReset(setAppointmentFilter)(String(k))}
            >
              <SelectTrigger className="min-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">Todas las citas</SelectItem>
                <SelectItem id="with">Con citas registradas</SelectItem>
                <SelectItem id="without">Sin citas registradas</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onPress={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              Restablecer
            </Button>
          </div>

          <Button variant="outline" size="sm" onPress={handleExport} isDisabled={exportPatients.isPending}>
            <Download className="h-4 w-4" />
            {exportPatients.isPending ? "Generando..." : "Exportar listado"}
          </Button>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden p-0">
        <Table aria-label="Directorio de pacientes">
          <TableHeader>
            <TableHead isRowHeader>PACIENTE</TableHead>
            <TableHead>CORREO ELECTRÓNICO</TableHead>
            <TableHead>TELÉFONO</TableHead>
            <TableHead>FECHA DE REGISTRO</TableHead>
            <TableHead>CITAS TOTALES</TableHead>
            <TableHead>ESTADO</TableHead>
            <TableHead className="w-28 min-w-28 px-4 text-center">ACCIONES</TableHead>
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <div className="flex h-24 items-center justify-center px-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Cargando pacientes..."
                    : error
                      ? error instanceof Error
                        ? error.message
                        : "No se pudo cargar el directorio"
                      : "No se encontraron pacientes con estos filtros"}
                </p>
              </div>
            )}
          >
            {rows.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>
                  <button
                    type="button"
                    className="group flex items-center gap-3 text-left"
                    onClick={() => setDrawerId(patient.id)}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        patient.isActive ? "bg-muted" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {initials(patient.firstName, patient.lastName)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium group-hover:underline">
                        {patient.firstName} {patient.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.patientCode ?? "Sin código"}
                      </span>
                    </div>
                  </button>
                </TableCell>
                <TableCell>{patient.email}</TableCell>
                <TableCell className="text-sm">{patient.phone || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {safeDate(patient.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {patient.appointmentCount} cita{patient.appointmentCount === 1 ? "" : "s"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <span
                      className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                        patient.isActive ? "bg-green-500" : "bg-muted-foreground"
                      }`}
                    />
                    {patient.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="w-28 min-w-28 px-4 text-center">
                  <ActionMenu
                    label={`Acciones de ${patient.firstName} ${patient.lastName}`}
                    items={[
                      { id: "view", label: "Ver detalles", icon: Eye, onAction: () => setDrawerId(patient.id) },
                      { id: "edit", label: "Editar datos", icon: Edit, onAction: () => openEdit(patient), isHidden: !canManage },
                      { id: "status", label: patient.isActive ? "Desactivar cuenta" : "Activar cuenta", icon: patient.isActive ? UserMinus : UserPlus, onAction: () => openStatusDialog(patient), isHidden: !canManage, destructive: patient.isActive },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Paginación */}
        <div className="flex flex-col items-center justify-between gap-4 border-t bg-muted/50 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {firstRow}-{lastRow} de {total} pacientes
            </span>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="rows-per-page">
                Filas por página:
              </label>
              <select
                id="rows-per-page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border bg-transparent px-1 py-0.5 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              isDisabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              isDisabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal: nuevo paciente */}
      <Dialog isOpen={createOpen} onOpenChange={setCreateOpen} isDismissable className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo Paciente</DialogTitle>
          <DialogDescription>
            El código de paciente se asigna automáticamente al guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-first-name">
                Nombres *
              </label>
              <Input
                id="create-first-name"
                value={createForm.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((p) => ({ ...p, firstName: e.target.value }))
                }
                placeholder="Ej. María José"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-last-name">
                Apellidos *
              </label>
              <Input
                id="create-last-name"
                value={createForm.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((p) => ({ ...p, lastName: e.target.value }))
                }
                placeholder="Ej. Castillo Rivas"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="create-dni">DNI (opcional)</label>
            <Input id="create-dni" inputMode="numeric" maxLength={8} placeholder="8 dígitos" value={createForm.dni}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((p) => ({ ...p, dni: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-email">
                Correo electrónico (opcional)
              </label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="paciente@correo.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-password">
                Contraseña para portal (opcional)
              </label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Vacía para registro presencial sin credenciales"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-phone">
                Teléfono
              </label>
              <Input
                id="create-phone"
                type="tel"
                value={createForm.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+51 987 654 321"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="create-address">
                Dirección
              </label>
              <Input
                id="create-address"
                value={createForm.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="Ej. Av. Larco 123, Miraflores"
              />
            </div>
          </div>

          {formError && createOpen && <p className="text-xs text-destructive">{formError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onPress={() => setCreateOpen(false)}>
            Cancelar
          </Button>
          <Button onPress={handleCreate} isDisabled={createPatient.isPending}>
            {createPatient.isPending ? "Registrando..." : "Registrar paciente"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: editar con auditoría */}
      <Dialog isOpen={editOpen} onOpenChange={setEditOpen} isDismissable className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Datos del Paciente</DialogTitle>
          <DialogDescription>
            {selected
              ? `${selected.firstName} ${selected.lastName} • ${selected.patientCode ?? "Sin código"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-muted p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              Estás editando datos críticos de un paciente. Esta acción debe contar con el sustento
              correspondiente (solicitud del paciente o corrección de error) y quedará registrada en
              el log de auditoría.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" htmlFor="edit-reason">
                Motivo de auditoría (requerido) *
              </label>
              <span
                className={`text-xs ${
                  auditLength >= MIN_AUDIT_REASON ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {auditLength} / mín. {MIN_AUDIT_REASON} caracteres
              </span>
            </div>
            <Textarea
              id="edit-reason"
              rows={2}
              value={editForm.auditReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEditForm((p) => ({ ...p, auditReason: e.target.value }))
              }
              placeholder="Ej. El paciente solicita actualizar su teléfono de contacto"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-first-name">
                Nombres
              </label>
              <Input placeholder="Ej. María José"
                id="edit-first-name"
                value={editForm.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((p) => ({ ...p, firstName: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-last-name">
                Apellidos
              </label>
              <Input placeholder="Ej. Castillo Rivas"
                id="edit-last-name"
                value={editForm.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-dni">DNI (opcional)</label>
            <Input id="edit-dni" inputMode="numeric" maxLength={8} placeholder="8 dígitos" value={editForm.dni}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, dni: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-email">
                Correo Electrónico
              </label>
              <Input placeholder="Ej. paciente@correo.com"
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-phone">
                Teléfono de Contacto
              </label>
              <Input placeholder="Ej. +51 987 654 321"
                id="edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-address">
              Dirección Residencial
            </label>
            <Input placeholder="Ej. Av. Larco 123, Miraflores"
              id="edit-address"
              value={editForm.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditForm((p) => ({ ...p, address: e.target.value }))
              }
            />
          </div>

          {formError && editOpen && <p className="text-xs text-destructive">{formError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onPress={() => setEditOpen(false)}>
            Cancelar
          </Button>
          <Button onPress={handleSaveEdit} isDisabled={!canSaveEdit}>
            {updatePatient.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: activar / desactivar */}
      <Dialog
        isOpen={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        isDismissable
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>
            {statusTarget?.isActive ? "¿Desactivar cuenta del paciente?" : "¿Reactivar cuenta del paciente?"}
          </DialogTitle>
          <DialogDescription>
            {statusTarget
              ? `${statusTarget.firstName} ${statusTarget.lastName} (${statusTarget.patientCode ?? "sin código"})`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {statusTarget?.isActive
              ? "El paciente no podrá iniciar sesión ni agendar nuevas citas, y se cerrarán sus sesiones abiertas. Su historial de citas y clínico se conserva intacto."
              : "El paciente recuperará el acceso al portal y podrá agendar citas nuevamente."}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" htmlFor="status-reason">
              Motivo (queda en auditoría) *
            </label>
            <Textarea
              id="status-reason"
              rows={2}
              value={statusReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStatusReason(e.target.value)}
              placeholder="Ej. Solicitud del paciente por traslado de ciudad"
            />
          </div>

          {formError && statusTarget && <p className="text-xs text-destructive">{formError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onPress={() => setStatusTarget(null)}>
            Cancelar
          </Button>
          <Button
            variant={statusTarget?.isActive ? "destructive" : "default"}
            onPress={handleToggleStatus}
            isDisabled={setActive.isPending || statusReason.trim().length < 5}
          >
            {setActive.isPending
              ? "Procesando..."
              : statusTarget?.isActive
                ? "Desactivar cuenta"
                : "Reactivar cuenta"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Panel lateral: ficha administrativa */}
      {drawerId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && setDrawerId(null)}
        >
          <aside className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-background shadow-2xl">
            <div className="flex items-start justify-between bg-muted/50 p-6">
              {detail ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {initials(detail.patient.firstName, detail.patient.lastName)}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">
                      {detail.patient.firstName} {detail.patient.lastName}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {detail.patient.patientCode ?? "Sin código"}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs">
                        <span
                          className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            detail.patient.isActive ? "bg-green-500" : "bg-muted-foreground"
                          }`}
                        />
                        {detail.patient.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {detailLoading ? "Cargando ficha..." : "No se pudo cargar la ficha"}
                </span>
              )}
              <Button variant="ghost" size="icon-sm" onPress={() => setDrawerId(null)} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {detail && (
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span className="text-xs">
                    Información clínica confidencial protegida por ley médica.
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Datos personales y contacto
                  </span>
                  <div className="flex flex-col gap-2.5 rounded-lg bg-muted/50 p-4 text-sm">
                    {[
                      ["DNI", detail.patient.dni || "Sin registrar"],
                      ["Correo electrónico", detail.patient.email],
                      ["Teléfono móvil", detail.patient.phone ?? "—"],
                      ["Teléfono secundario", detail.patient.secondaryPhone ?? "—"],
                      ["Dirección residencial", detail.patient.address ?? "—"],
                      ["Fecha de alta", safeDate(detail.patient.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4">
                        <span className="shrink-0 text-muted-foreground">{label}:</span>
                        <span className="text-right font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Resumen de actividad (administrativo — no clínico)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Total citas agendadas", detail.activity.totalAppointments],
                      ["Citas atendidas", detail.activity.attended],
                      ["Citas canceladas", detail.activity.cancelled],
                      ["No asistió", detail.activity.noShow],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex flex-col rounded-lg bg-muted/50 p-3">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="mt-1 text-xl font-semibold">{value}</span>
                      </div>
                    ))}
                    <div className="col-span-2 flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-xs text-muted-foreground">Última asistencia</span>
                      <span className="text-sm font-semibold">
                        {detail.activity.lastAttendedAt ? formatCalendarDate(detail.activity.lastAttendedAt) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Historial de citas (agenda operativa)
                    {isDentist && " — solo tus citas"}
                  </span>
                  <div className="overflow-hidden rounded-lg bg-muted/50">
                    {detail.history.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground">Sin citas registradas.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-muted font-semibold text-muted-foreground">
                            <th className="px-3 py-2">Fecha / Hora</th>
                            <th className="px-3 py-2">Odontólogo</th>
                            <th className="px-3 py-2">Servicio</th>
                            <th className="px-3 py-2 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {detail.history.map((row) => (
                            <tr key={row.id}>
                              <td className="px-3 py-2">
                                {formatCalendarDate(row.date)} - {formatTime(row.startTime)}
                              </td>
                              <td className="px-3 py-2">Dr. {row.dentistName}</td>
                              <td className="px-3 py-2">{row.treatmentName ?? "—"}</td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                    STATUS_BADGE[row.status] ?? ""
                                  }`}
                                >
                                  {STATUS_LABEL[row.status] ?? row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t bg-muted/50 p-4">
              <Button variant="outline" size="sm" onPress={() => setDrawerId(null)}>
                Cerrar
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
