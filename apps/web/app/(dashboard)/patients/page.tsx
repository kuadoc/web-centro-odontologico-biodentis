"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import { useAppointments, useUsers } from "@/hooks/use-queries";
import { cn, formatDate } from "@workspace/ui/lib/utils";
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
  Shield,
  Lock,
  AlertTriangle,
  FileDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface DentistData {
  id: string;
  userId: string;
  specialty: string;
  user: Patient;
}

interface AppointmentData {
  patient: Patient;
  dentist?: DentistData;
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface PatientStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

type StatusFilter = "all" | "active" | "inactive";
type AppointmentFilter = "all" | "with-appointments" | "without-appointments";

export default function PatientsPage() {
  const { data: usersData, isLoading: usersLoading } = useUsers("PATIENT");
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments();

  const appointments = useMemo(
    () => (Array.isArray(appointmentsData) ? appointmentsData : []),
    [appointmentsData]
  );

  const patients = useMemo(() => {
    if (Array.isArray(usersData) && usersData.length > 0) {
      return usersData as Patient[];
    }
    return Array.from(
      new Map(
        appointments
          .filter((a) => a.patient)
          .map((a) => [a.patient!.id, a.patient as Patient])
      ).values()
    );
  }, [usersData, appointments]);

  const isLoading = usersLoading || appointmentsLoading;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    reason: "",
  });

  // Compute stats
  const stats = useMemo<PatientStats>(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = patients.filter(
      (p) => new Date(p.createdAt) >= monthStart
    ).length;

    return {
      total: patients.length,
      active: patients.length,
      inactive: 0,
      newThisMonth,
    };
  }, [patients]);

  // Get patient appointment count
  const getPatientAppointments = useCallback(
    (patientId: string) => {
      return appointments.filter((a) => a.patient?.id === patientId);
    },
    [appointments]
  );

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        searchQuery === "" ||
        `${patient.firstName} ${patient.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.phone && patient.phone.includes(searchQuery));

      const patientAppts = getPatientAppointments(patient.id);
      const hasAppointments = patientAppts.length > 0;

      const matchesAppointment =
        appointmentFilter === "all" ||
        (appointmentFilter === "with-appointments" && hasAppointments) ||
        (appointmentFilter === "without-appointments" && !hasAppointments);

      return matchesSearch && matchesAppointment;
    });
  }, [patients, searchQuery, appointmentFilter, getPatientAppointments]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    try {
      return formatDate(dateString);
    } catch {
      return dateString;
    }
  };

  // Handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setCurrentPage(1);
  };

  const handleAppointmentFilterChange = (value: string) => {
    setAppointmentFilter(value as AppointmentFilter);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAppointmentFilter("all");
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const openEditModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone || "",
      address: "",
      reason: "",
    });
    setEditModalOpen(true);
  };

  const openDrawer = (patient: Patient) => {
    setSelectedPatient(patient);
    setDrawerOpen(true);
  };

  const openDeactivateModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setDeactivateModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedPatient(null);
    setEditForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      reason: "",
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedPatient(null);
  };

  const closeDeactivateModal = () => {
    setDeactivateModalOpen(false);
    setSelectedPatient(null);
  };

  const handleSaveEdit = () => {
    console.log("Saving patient edit:", editForm);
    closeEditModal();
  };

  const handleDeactivate = () => {
    console.log("Deactivating patient:", selectedPatient?.id);
    closeDeactivateModal();
  };

  const handleExport = () => {
    console.log("Exporting patient list...");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando pacientes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ADMINISTRACIÓN DEL SISTEMA
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-medium text-muted-foreground">
              Directorio de Pacientes
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
            <Badge variant="secondary">
              {stats.total} pacientes registrados
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Directorio administrativo de pacientes registrados. Gestión
            exclusiva de datos personales, estado de cuenta y trazabilidad
            operativa.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              Acceso Administrativo: Solo lectura de metadatos no clínicos
            </span>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Total Pacientes Base
              </span>
              <span className="mt-0.5 text-2xl font-bold">{stats.total}</span>
              <span className="mt-1 text-xs text-muted-foreground">
                100% registros sincronizados
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Cuentas Activas
              </span>
              <span className="mt-0.5 text-2xl font-bold">{stats.active}</span>
              <span className="mt-1 text-xs text-muted-foreground">
                {stats.total > 0
                  ? Math.round((stats.active / stats.total) * 100)
                  : 0}
                % operando con normalidad
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Pacientes Desactivados
              </span>
              <span className="mt-0.5 text-2xl font-bold">
                {stats.inactive}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Acceso portal restringido
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <UserX className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Altas Este Mes
              </span>
              <span className="mt-0.5 text-2xl font-bold">
                +{stats.newThisMonth}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {new Date().toLocaleDateString("es-CL", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Control Bar */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, correo o teléfono..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select
              selectedKey={statusFilter}
              onSelectionChange={(key) =>
                handleStatusFilterChange(key as string)
              }
              placeholder="Todos los estados"
            >
              <SelectTrigger className="w-full min-w-[170px] sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">
                  Todos los estados ({stats.total})
                </SelectItem>
                <SelectItem id="active">
                  Activos ({stats.active})
                </SelectItem>
                <SelectItem id="inactive">
                  Inactivos ({stats.inactive})
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              selectedKey={appointmentFilter}
              onSelectionChange={(key) =>
                handleAppointmentFilterChange(key as string)
              }
              placeholder="Todas las citas"
            >
              <SelectTrigger className="w-full min-w-[180px] sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">Todas las citas</SelectItem>
                <SelectItem id="with-appointments">
                  Con citas este mes
                </SelectItem>
                <SelectItem id="without-appointments">
                  Sin citas registradas
                </SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onPress={handleResetFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onPress={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Exportar listado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Data Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PACIENTE</TableHead>
              <TableHead>CORREO ELECTRÓNICO</TableHead>
              <TableHead>TELÉFONO</TableHead>
              <TableHead>FECHA DE REGISTRO</TableHead>
              <TableHead>CITAS TOTALES</TableHead>
              <TableHead>ESTADO</TableHead>
              <TableHead className="text-right">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <p className="text-muted-foreground">
                    No se encontraron pacientes
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPatients.map((patient) => {
                const patientAppts = getPatientAppointments(patient.id);
                return (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <button
                        className="flex items-center gap-3 text-left group"
                        onClick={() => openDrawer(patient)}
                        type="button"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                          {getInitials(patient.firstName, patient.lastName)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium group-hover:underline">
                            {patient.firstName} {patient.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {patient.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell className="text-sm">
                      {patient.phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDisplayDate(patient.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {patientAppts.length} citas
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                        Activo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onPress={() => openDrawer(patient)}
                          aria-label="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onPress={() => openEditModal(patient)}
                          aria-label="Editar datos"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onPress={() => openDeactivateModal(patient)}
                          aria-label="Desactivar cuenta"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-4 border-t bg-muted/50 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {(currentPage - 1) * rowsPerPage + 1}-
              {Math.min(currentPage * rowsPerPage, filteredPatients.length)} de{" "}
              {filteredPatients.length} pacientes
            </span>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <label
                className="text-xs text-muted-foreground"
                htmlFor="rows-per-page"
              >
                Filas por página:
              </label>
              <select
                id="rows-per-page"
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(e.target.value)}
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
              isDisabled={currentPage === 1}
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon-sm"
                  onPress={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && (
              <span className="px-1 text-xs text-muted-foreground">...</span>
            )}
            {totalPages > 5 && (
              <Button
                variant="outline"
                size="icon-sm"
                onPress={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              isDisabled={currentPage === totalPages || totalPages === 0}
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit Patient Modal */}
      <Dialog
        isOpen={editModalOpen}
        onOpenChange={setEditModalOpen}
        isDismissable
        className="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Editar Datos del Paciente</DialogTitle>
          <DialogDescription>
            {selectedPatient
              ? `${selectedPatient.firstName} ${selectedPatient.lastName} • ${selectedPatient.id.slice(0, 8).toUpperCase()}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-muted p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Estás editando datos críticos de un paciente. Esta acción debe
              contar con el sustento correspondiente (solicitud del paciente o
              corrección de error).
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" htmlFor="edit-reason">
                Motivo de auditoría (Requerido)*
              </label>
              <span
                className={cn(
                  "text-xs",
                  editForm.reason.length >= 15
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {editForm.reason.length} / mín. 15 caracteres
              </span>
            </div>
            <Textarea
              id="edit-reason"
              placeholder="Especifique la causa justificada del cambio (se guardará en el registro de auditoría del sistema)..."
              value={editForm.reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEditForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="edit-first-name"
              >
                Nombres
              </label>
              <Input
                id="edit-first-name"
                value={editForm.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="edit-last-name"
              >
                Apellidos
              </label>
              <Input
                id="edit-last-name"
                value={editForm.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="edit-email"
              >
                Correo Electrónico
              </label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="edit-phone"
              >
                Teléfono de Contacto
              </label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="edit-address"
            >
              Dirección Residencial
            </label>
            <Input
              id="edit-address"
              value={editForm.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditForm((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onPress={closeEditModal}>
            Cancelar
          </Button>
          <Button
            onPress={handleSaveEdit}
            isDisabled={editForm.reason.length < 15}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Patient Detail Drawer */}
      <Dialog
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        isDismissable
        className="max-w-lg"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
              {selectedPatient
                ? getInitials(
                    selectedPatient.firstName,
                    selectedPatient.lastName
                  )
                : ""}
            </div>
            <div>
              <DialogTitle>
                {selectedPatient
                  ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                  : ""}
              </DialogTitle>
              <DialogDescription>
                {selectedPatient
                  ? selectedPatient.id.slice(0, 8).toUpperCase()
                  : ""}
                {selectedPatient && (
                  <>
                    {" "}
                    <span className="mx-1">•</span>
                    <Badge variant="outline">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                      Activo
                    </Badge>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Información clínica confidencial protegida por ley médica.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Datos Personales y Contacto
            </span>
            <div className="flex flex-col gap-2.5 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Correo Electrónico:
                </span>
                <span className="font-medium">
                  {selectedPatient?.email || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Teléfono móvil:
                </span>
                <span className="font-medium">
                  {selectedPatient?.phone || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Fecha de Alta:
                </span>
                <span className="font-medium">
                  {selectedPatient
                    ? formatDisplayDate(selectedPatient.createdAt)
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen de Actividad (Administrativo - No Clínico)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">
                  Total Citas Agendadas
                </span>
                <span className="mt-1 text-2xl font-bold">
                  {selectedPatient
                    ? getPatientAppointments(selectedPatient.id).length
                    : 0}
                </span>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">
                  Citas Atendidas
                </span>
                <span className="mt-1 text-2xl font-bold">
                  {selectedPatient
                    ? getPatientAppointments(selectedPatient.id).filter(
                        (a) => a.status === "COMPLETED"
                      ).length
                    : 0}
                </span>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">
                  Citas Canceladas
                </span>
                <span className="mt-1 text-2xl font-bold">
                  {selectedPatient
                    ? getPatientAppointments(selectedPatient.id).filter(
                        (a) => a.status === "CANCELLED"
                      ).length
                    : 0}
                </span>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">
                  Última Asistencia
                </span>
                <span className="mt-1.5 text-sm font-semibold">
                  {(() => {
                    if (!selectedPatient) return "—";
                    const completed = getPatientAppointments(
                      selectedPatient.id
                    )
                      .filter((a) => a.status === "COMPLETED")
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      );
                    return completed[0]
                      ? formatDisplayDate(completed[0].date)
                      : "—";
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Historial de Citas (Agenda Operativa)
            </span>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Odontólogo</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPatient &&
                  getPatientAppointments(selectedPatient.id).length > 0 ? (
                    getPatientAppointments(selectedPatient.id)
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .slice(0, 5)
                      .map((appt) => (
                        <TableRow key={appt.id}>
                          <TableCell className="text-sm">
                            {formatDisplayDate(appt.date)} - {appt.startTime}
                          </TableCell>
                          <TableCell className="text-sm">
                            {appt.dentist?.user
                              ? `Dr. ${appt.dentist.user.firstName} ${appt.dentist.user.lastName}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">—</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                appt.status === "COMPLETED"
                                  ? "secondary"
                                  : appt.status === "CANCELLED"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {appt.status === "COMPLETED"
                                ? "Atendida"
                                : appt.status === "CANCELLED"
                                  ? "Cancelada"
                                  : appt.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-16 text-center text-sm text-muted-foreground"
                      >
                        Sin citas registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onPress={closeDrawer}>
            Cerrar
          </Button>
          <Button onPress={() => console.log("Downloading admin file...")}>
            <FileDown className="h-4 w-4" />
            Descargar Ficha Administrativa
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Deactivate Confirmation Modal */}
      <Dialog
        isOpen={deactivateModalOpen}
        onOpenChange={setDeactivateModalOpen}
        isDismissable
        className="max-w-md"
      >
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <UserX className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>¿Desactivar cuenta del paciente?</DialogTitle>
          <DialogDescription>
            {selectedPatient
              ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.id.slice(0, 8).toUpperCase()})`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          El paciente no podrá iniciar sesión ni agendar nuevas citas. Su
          historial de citas y clínico se conservará intacto.
        </p>

        <DialogFooter>
          <Button variant="outline" onPress={closeDeactivateModal}>
            Cancelar
          </Button>
          <Button variant="destructive" onPress={handleDeactivate}>
            Desactivar Cuenta
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
