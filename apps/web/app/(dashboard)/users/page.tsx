"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ProfilePhotoPicker } from "@/components/ui/profile-photo-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks/use-queries";
import {
  UserPlus,
  Search,
  Shield,
  Stethoscope,
  Headphones,
  User,
  Edit,
  Ban,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  AlertTriangle,
  Save,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  dentistProfile?: {
    id: string;
    specialty: string;
    licenseNumber?: string | null;
    university?: string | null;
  } | null;
}

interface RoleCounts {
  ADMIN: number;
  DENTIST: number;
  RECEPTIONIST: number;
  PATIENT: number;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  DENTIST: "Odontólogo",
  RECEPTIONIST: "Recepcionista",
  PATIENT: "Paciente",
};

const roleIcons: Record<string, React.ReactNode> = {
  ADMIN: <Shield className="h-3.5 w-3.5" />,
  DENTIST: <Stethoscope className="h-3.5 w-3.5" />,
  RECEPTIONIST: <Headphones className="h-3.5 w-3.5" />,
  PATIENT: <User className="h-3.5 w-3.5" />,
};

const roleBadgeStyles: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  DENTIST: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  RECEPTIONIST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PATIENT: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function UsersPage() {
  const { data: usersData, isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = useMemo(
    () => (Array.isArray(usersData) ? usersData : []) as UserItem[],
    [usersData]
  );

  const roleCounts = useMemo<RoleCounts>(() => {
    const counts: RoleCounts = { ADMIN: 0, DENTIST: 0, RECEPTIONIST: 0, PATIENT: 0 };
    users.forEach((u) => {
      if (counts[u.role as keyof RoleCounts] !== undefined) {
        counts[u.role as keyof RoleCounts]++;
      }
    });
    return counts;
  }, [users]);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "DENTIST" as string,
    password: "BioDent#2024",
    avatarUrl: null as string | null,
    specialty: "General",
    licenseNumber: "",
    university: "",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    avatarUrl: null as string | null,
    specialty: "General",
    licenseNumber: "",
    university: "",
  });

  const rowsPerPage = 10;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      search === "" ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? u.isActive : !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function resetFilters() {
    setSearch("");
    setFilterRole("all");
    setFilterStatus("all");
    setPage(1);
  }

  function openEditModal(user: UserItem) {
    setSelectedUser(user);
    setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, avatarUrl: user.avatarUrl ?? null, specialty: user.dentistProfile?.specialty ?? "General", licenseNumber: user.dentistProfile?.licenseNumber ?? "", university: user.dentistProfile?.university ?? "" });
    setShowEditModal(true);
  }

  function openDeactivateModal(user: UserItem) {
    setSelectedUser(user);
    setShowDeactivateModal(true);
  }

  async function handleCreate() {
    try {
      await createMutation.mutateAsync(createForm);
      setShowCreateModal(false);
      setCreateForm({ firstName: "", lastName: "", email: "", phone: "", role: "DENTIST", password: "BioDent#2024", avatarUrl: null, specialty: "General", licenseNumber: "", university: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear usuario");
    }
  }

  async function handleEdit() {
    if (!selectedUser) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedUser.id,
        data: { firstName: editForm.firstName, lastName: editForm.lastName, avatarUrl: editForm.avatarUrl, ...(selectedUser.role === "DENTIST" ? { specialty: editForm.specialty, licenseNumber: editForm.licenseNumber, university: editForm.university } : {}) },
      });
      setShowEditModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function handleDeactivate() {
    if (!selectedUser) return;
    try {
      await deleteMutation.mutateAsync(selectedUser.id);
      setShowDeactivateModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al desactivar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Usuarios del Sistema</h2>
            <Badge variant="secondary">{users.length} usuarios</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Gestión centralizada de credenciales, roles y accesos clínicos
          </p>
        </div>
        <Button onPress={() => setShowCreateModal(true)} className="hidden sm:inline-flex">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* KPI Tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Odontólogos
              </p>
              <p className="text-xl font-bold mt-1">{roleCounts.DENTIST}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
              <p className="text-xl font-bold mt-1">{roleCounts.ADMIN}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recepción
              </p>
              <p className="text-xl font-bold mt-1">{roleCounts.RECEPTIONIST}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <Headphones className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pacientes
              </p>
              <p className="text-xl font-bold mt-1">{roleCounts.PATIENT}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select
            selectedKey={filterRole}
            onSelectionChange={(key) => { setFilterRole(String(key)); setPage(1); }}
            placeholder="Todos los roles"
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="all">Todos los roles</SelectItem>
              <SelectItem id="ADMIN">Administrador</SelectItem>
              <SelectItem id="DENTIST">Odontólogo</SelectItem>
              <SelectItem id="RECEPTIONIST">Recepcionista</SelectItem>
              <SelectItem id="PATIENT">Paciente</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onPress={resetFilters}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restablecer</span>
          </Button>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Correo</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Rol</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Registro</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar firstName={u.firstName} lastName={u.lastName} avatarUrl={u.avatarUrl} size="md" />
                          <div>
                            <p className="font-medium">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {u.id.slice(0, 8)}
                              {u.dentistProfile?.specialty && ` • ${u.dentistProfile.specialty}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={roleBadgeStyles[u.role] || ""}>
                          {roleIcons[u.role]}
                          <span className="ml-1">{roleLabels[u.role] || u.role}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" onPress={() => openEditModal(u)} aria-label="Editar usuario">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onPress={() => openDeactivateModal(u)} aria-label="Desactivar usuario">
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              Mostrando <strong>{(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredUsers.length)}</strong> de <strong>{filteredUsers.length}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-xs" onPress={() => setPage(Math.max(1, page - 1))} isDisabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? "default" : "ghost"} size="icon-xs" onPress={() => setPage(p)}>
                  {p}
                </Button>
              ))}
              <Button variant="ghost" size="icon-xs" onPress={() => setPage(Math.min(totalPages, page + 1))} isDisabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {paginatedUsers.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-sm text-center">No se encontraron usuarios</p>
            </CardContent>
          </Card>
        ) : (
          paginatedUsers.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <UserAvatar firstName={u.firstName} lastName={u.lastName} avatarUrl={u.avatarUrl} size="md" />
                    <div>
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge className={roleBadgeStyles[u.role] || ""}>
                    {roleIcons[u.role]}
                    <span className="ml-1">{roleLabels[u.role] || u.role}</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onPress={() => openEditModal(u)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onPress={() => openDeactivateModal(u)}>
                      <Ban className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <Button variant="ghost" size="icon-xs" onPress={() => setPage(Math.max(1, page - 1))} isDisabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === page ? "default" : "ghost"} size="icon-xs" onPress={() => setPage(p)}>
                {p}
              </Button>
            ))}
            <Button variant="ghost" size="icon-xs" onPress={() => setPage(Math.min(totalPages, page + 1))} isDisabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 sm:hidden"
        aria-label="Nuevo usuario"
      >
        <UserPlus className="h-6 w-6" />
      </button>

      {/* Create User Modal */}
      <Dialog isOpen={showCreateModal} onOpenChange={setShowCreateModal} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Crear Nuevo Usuario
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos para otorgar acceso al sistema institucional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ProfilePhotoPicker key={`create-${showCreateModal}`} firstName={createForm.firstName} lastName={createForm.lastName} avatarUrl={createForm.avatarUrl} portrait={createForm.role === "DENTIST"} isSaving={createMutation.isPending} onProcessingChange={setPhotoProcessing} onChange={(avatarUrl) => setCreateForm((form) => ({ ...form, avatarUrl }))} />
            {createForm.role === "DENTIST" && <p className="text-xs text-muted-foreground">El nombre, la foto y los datos profesionales se mostrarán en el equipo de la página principal mientras la cuenta esté activa.</p>}
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                El usuario recibirá un correo institucional para verificar su cuenta y establecer su contraseña definitiva.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rol en el Sistema *</label>
              <select
                className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                <option value="DENTIST">Odontólogo</option>
                <option value="ADMIN">Administrador</option>
                <option value="RECEPTIONIST">Recepcionista</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombres *</label>
                <Input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  placeholder="Ej. Roberto Carlos"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellidos *</label>
                <Input
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  placeholder="Ej. San Martín"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Correo Institucional *</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="r.sanmartin@biodentis.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+56 9 8765 4321"
              />
            </div>

            {createForm.role === "DENTIST" && <div className="space-y-3 rounded-xl border p-3">
              <div className="space-y-1"><label htmlFor="create-specialty" className="text-sm font-medium">Especialidad</label><Input id="create-specialty" value={createForm.specialty} onChange={(e) => setCreateForm({ ...createForm, specialty: e.target.value })} /></div>
              <div className="space-y-1"><label htmlFor="create-license" className="text-sm font-medium">Registro profesional</label><Input id="create-license" value={createForm.licenseNumber} onChange={(e) => setCreateForm({ ...createForm, licenseNumber: e.target.value })} /></div>
              <div className="space-y-1"><label htmlFor="create-university" className="text-sm font-medium">Universidad</label><Input id="create-university" value={createForm.university} onChange={(e) => setCreateForm({ ...createForm, university: e.target.value })} /></div>
            </div>}
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Contraseña Temporal
              </label>
              <Input
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="font-mono text-xs"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" defaultChecked className="rounded" />
                Exigir cambio de contraseña al primer inicio
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onPress={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onPress={handleCreate} isDisabled={createMutation.isPending || photoProcessing}>
              <Save className="mr-1.5 h-4 w-4" />
              {createMutation.isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog isOpen={showEditModal} onOpenChange={setShowEditModal} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription>
              {selectedUser && `Modificación de credenciales para ${selectedUser.firstName} ${selectedUser.lastName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ProfilePhotoPicker key={selectedUser?.id} firstName={editForm.firstName} lastName={editForm.lastName} avatarUrl={editForm.avatarUrl} portrait={selectedUser?.role === "DENTIST"} isSaving={updateMutation.isPending} onProcessingChange={setPhotoProcessing} onChange={(avatarUrl) => setEditForm((form) => ({ ...form, avatarUrl }))} />
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-destructive" />
                  Rol Institucional
                </label>
                <Badge variant="secondary">
                  {selectedUser && (roleLabels[selectedUser.role] || selectedUser.role)}
                </Badge>
              </div>
              <div className="mt-2 rounded-md bg-muted p-2.5">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>El rol no se puede modificar una vez creada la cuenta.</strong>{" "}
                    Para cambiar de rol, desactive esta cuenta y cree una nueva.
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre Completo</label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Correo Institucional</label>
              <Input value={editForm.email} disabled />
            </div>
            {selectedUser?.role === "DENTIST" && <div className="space-y-3 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Estos datos se mostrarán en la página principal mientras el odontólogo esté activo.</p>
              <div className="space-y-1"><label htmlFor="edit-specialty" className="text-sm font-medium">Especialidad</label><Input id="edit-specialty" value={editForm.specialty} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} /></div>
              <div className="space-y-1"><label htmlFor="edit-license" className="text-sm font-medium">Registro profesional</label><Input id="edit-license" value={editForm.licenseNumber} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} /></div>
              <div className="space-y-1"><label htmlFor="edit-university" className="text-sm font-medium">Universidad</label><Input id="edit-university" value={editForm.university} onChange={(e) => setEditForm({ ...editForm, university: e.target.value })} /></div>
            </div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onPress={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onPress={handleEdit} isDisabled={updateMutation.isPending || photoProcessing}>
              <Save className="mr-1.5 h-4 w-4" />
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Usuario"}
            </Button>
          </DialogFooter>
      </Dialog>

      {/* Deactivate Confirmation Modal */}
      <Dialog isOpen={showDeactivateModal} onOpenChange={setShowDeactivateModal} className="sm:max-w-md max-sm:inset-2 max-sm:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Desactivar acceso?
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Estás a punto de desactivar la cuenta de{" "}
                  <strong>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </strong>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Advertencia
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Si procede con la desactivación, el usuario no podrá iniciar sesión en boxes clínicos ni en la app móvil.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onPress={() => setShowDeactivateModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onPress={handleDeactivate} isDisabled={deleteMutation.isPending}>
              <Ban className="mr-1.5 h-4 w-4" />
              {deleteMutation.isPending ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
      </Dialog>
    </div>
  );
}
