"use client";

import { ROLE_LABELS } from "@/lib/role-labels";
import { formatDateTime } from "@workspace/ui/lib/utils";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import {
  useMyProfile,
  useUpdateProfile,
  useUpdatePassword,
  useMySessions,
  useRevokeOtherSessions,
} from "@/hooks/use-queries";
import {
  Shield,
  Lock,
  Award,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Smartphone,
  KeyRound,
  CheckCircle,
  Clock,
  CalendarDays,
  FileText,
  Save,
  PhoneCall,
  Info,
  BadgeCheck,
  Laptop,
} from "lucide-react";

function passwordStrength(pwd: string): { label: string; score: number } {
  if (!pwd) return { label: "", score: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
  return { label: labels[score] ?? "Débil", score };
}

const NOT_SET = "No registrado";

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useMyProfile();
  const { data: sessions } = useMySessions();
  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();
  const revokeOthers = useRevokeOtherSessions();

  const user = profile?.user;
  const dentist = profile?.dentist ?? null;

  const [contactForm, setContactForm] = useState({ phone: "", secondaryPhone: "" });
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const savingProfile = useRef(false);
  /**
   * Id del usuario ya volcado al formulario.
   *
   * La sincronización va aquí y no en un `useEffect` sobre `user`: ese efecto se
   * volvía a disparar en cada refetch (por ejemplo tras guardar la foto) y
   * descartaba los teléfonos que el usuario estuviera escribiendo.
   */
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [contactMsg, setContactMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  if (user && syncedUserId !== user.id) {
    setSyncedUserId(user.id);
    setContactForm({ phone: user.phone ?? "", secondaryPhone: user.secondaryPhone ?? "" });
    setPendingAvatar(undefined);
  }

  const strength = useMemo(() => passwordStrength(pwdForm.next), [pwdForm.next]);

  /** `null` quita la foto; el string es el data URL ya recortado por el navegador. */
  const handleAvatarChange = (dataUrl: string | null) => {
    setPendingAvatar(dataUrl);
  };

  const handleSaveContact = async () => {
    if (savingProfile.current || photoProcessing) return;
    savingProfile.current = true;
    setContactMsg(null);
    try {
      await updateProfile.mutateAsync({
        phone: contactForm.phone,
        secondaryPhone: contactForm.secondaryPhone,
        ...(pendingAvatar !== undefined ? { avatarUrl: pendingAvatar } : {}),
      });
      setPendingAvatar(undefined);
      setContactMsg({ type: "ok", text: "Cambios guardados correctamente" });
      setTimeout(() => setContactMsg(null), 2500);
    } catch (e) {
      setContactMsg({ type: "err", text: e instanceof Error ? e.message : "Error al guardar" });
    } finally {
      savingProfile.current = false;
    }
  };

  const handleUpdatePassword = async () => {
    setPwdMsg(null);
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdMsg({ type: "err", text: "Las contraseñas no coinciden" });
      return;
    }
    try {
      await updatePassword.mutateAsync({
        currentPassword: pwdForm.current,
        newPassword: pwdForm.next,
        confirmPassword: pwdForm.confirm,
      });
      setPwdMsg({ type: "ok", text: "Contraseña actualizada. Se cerraron las demás sesiones." });
      setPwdForm({ current: "", next: "", confirm: "" });
    } catch (e) {
      setPwdMsg({ type: "err", text: e instanceof Error ? e.message : "Error al actualizar" });
    }
  };

  const handleRevokeOthers = async () => {
    setSessionMsg(null);
    try {
      const res = (await revokeOthers.mutateAsync()) as { revokedSessions: number };
      setSessionMsg(
        res.revokedSessions > 0
          ? `${res.revokedSessions} sesión(es) cerradas`
          : "No hay otras sesiones activas"
      );
      setTimeout(() => setSessionMsg(null), 3000);
    } catch (e) {
      setSessionMsg(e instanceof Error ? e.message : "Error al cerrar sesiones");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando perfil...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "No se pudo cargar el perfil"}
        </p>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const isDentist = dentist !== null;
  const currentSession = sessions?.find((s) => s.current);
  const otherSessions = sessions?.filter((s) => !s.current).length ?? 0;
  const schedule = profile?.schedule ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span>{isDentist ? "Panel Odontólogo" : "Panel"}</span>
            <span className="text-[10px]">•</span>
            <span className="font-semibold text-foreground">Mi Perfil</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Gestiona tu información de contacto personal, credenciales de acceso y consulta tus asignaciones profesionales.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start md:self-auto rounded-full bg-muted px-3 py-1.5 text-xs shadow-sm">
          <span className={`h-2 w-2 rounded-full ${user.isActive ? "bg-primary animate-pulse" : "bg-destructive"}`} />
          <span className="font-medium">{user.isActive ? "Cuenta activa" : "Cuenta inactiva"}</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-semibold">{ROLE_LABELS[user.role]}</span>
        </div>
      </div>

      {/* Datos profesionales — solo lectura, gestionados por Dirección Médica */}
      <Card>
        <CardContent className="p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <AvatarPicker
                portrait={isDentist}
                firstName={user.firstName}
                lastName={user.lastName}
                avatarUrl={pendingAvatar === undefined ? user.avatarUrl : pendingAvatar}
                isSaving={updateProfile.isPending}
                onProcessingChange={setPhotoProcessing}
                onChange={handleAvatarChange}
              />
              {pendingAvatar !== undefined && (
                <>
                  <p className="max-w-48 text-center text-xs text-muted-foreground">Foto pendiente. Pulsa Guardar cambios para confirmar.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" isDisabled={photoProcessing || updateProfile.isPending} onPress={() => setPendingAvatar(undefined)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight truncate">
                  {isDentist ? `Dr. ${fullName}` : fullName}
                </h2>
                {dentist && (
                  <Badge variant="secondary" className="rounded-full font-semibold uppercase tracking-wider text-xs">
                    {dentist.specialty}
                  </Badge>
                )}
              </div>
              {isDentist && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">
                      <strong className="font-semibold text-foreground">Colegiatura:</strong>{" "}
                      {dentist.licenseNumber ?? NOT_SET}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">
                      <strong className="font-semibold text-foreground">Alma Máter:</strong>{" "}
                      {dentist.university ?? NOT_SET}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">
                      <strong className="font-semibold text-foreground">Asignación:</strong>{" "}
                      {dentist.assignedUnit?.name ?? NOT_SET}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {isDentist && (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <span>Estos datos son gestionados por la Dirección Médica. Para actualizar especialidad o colegiatura, contacta a administración.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Izquierda */}
        <div className="flex flex-col gap-6">
          {/* Contacto editable */}
          <Card>
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Información de Contacto</h3>
                </div>
                <p className="text-xs text-muted-foreground">Actualiza tus vías de contacto para comunicaciones clínicas y emergencias.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mobile-phone" className="text-xs font-semibold flex justify-between">
                    <span>Teléfono / Móvil Clínico</span>
                    <span className="text-primary">Principal</span>
                  </Label>
                  <div className="relative">
                    <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="mobile-phone" type="tel" className="pl-8" value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+51 987 654 321" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="inst-email" className="text-xs font-semibold flex justify-between">
                    <span>Correo Institucional</span>
                    <span className="font-normal text-muted-foreground">Solo lectura</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="inst-email" type="email" className="pl-8 pr-8 bg-muted" disabled value={user.email} />
                    <Lock className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" /> Contacta al administrador para modificar el correo institucional.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dni" className="text-xs font-semibold flex justify-between">
                    <span>DNI</span>
                    <span className="font-normal text-muted-foreground">Solo lectura</span>
                  </Label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="dni" type="text" className="pl-8 pr-8 bg-muted" disabled value={user.dni ?? NOT_SET} />
                    <Lock className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" /> El DNI no se puede modificar. Contacta al administrador si necesitas corregirlo.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="alt-phone" className="text-xs font-semibold">
                    Teléfono Secundario / Emergencias
                  </Label>
                  <div className="relative">
                    <PhoneCall className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="alt-phone" type="tel" className="pl-8" value={contactForm.secondaryPhone} onChange={(e) => setContactForm((p) => ({ ...p, secondaryPhone: e.target.value }))} placeholder="+51 1 249 0112" />
                  </div>
                </div>

                {contactMsg && (
                  <p role={contactMsg.type === "err" ? "alert" : "status"} className={`text-xs ${contactMsg.type === "ok" ? "text-green-600" : "text-destructive"}`}>{contactMsg.text}</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onPress={handleSaveContact} isDisabled={photoProcessing || updateProfile.isPending}>
                  <Save className="h-4 w-4" />
                  {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card>
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Seguridad de la Cuenta</h3>
                </div>
                <p className="text-xs text-muted-foreground">Al cambiar la contraseña se cerrarán tus demás sesiones abiertas.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="current-pwd" className="text-xs font-semibold">
                    Contraseña Actual
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="current-pwd" type="password" className="pl-8" placeholder="Ingresa tu contraseña actual" value={pwdForm.current} onChange={(e) => setPwdForm((p) => ({ ...p, current: e.target.value }))} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-pwd" className="text-xs font-semibold">
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="new-pwd" type="password" className="pl-8" placeholder="Mínimo 8 caracteres" value={pwdForm.next} onChange={(e) => setPwdForm((p) => ({ ...p, next: e.target.value }))} />
                  </div>
                  {pwdForm.next && (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Nivel de Seguridad:</span>
                        <span className="font-semibold">{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 h-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className={`rounded-full ${i < strength.score ? "bg-primary" : "bg-muted"}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm-pwd" className="text-xs font-semibold">
                    Confirmar Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <CheckCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-pwd" type="password" className="pl-8" placeholder={pwdForm.next ? "Repite exactamente la nueva contraseña" : "Primero escribe tu nueva contraseña"} value={pwdForm.confirm} onChange={(e) => setPwdForm((p) => ({ ...p, confirm: e.target.value }))} />
                  </div>
                </div>

                {pwdMsg && <p className={`text-xs ${pwdMsg.type === "ok" ? "text-green-600" : "text-destructive"}`}>{pwdMsg.text}</p>}
              </div>

              <div className="flex justify-end">
                <Button size="sm" onPress={handleUpdatePassword} isDisabled={updatePassword.isPending}>
                  <KeyRound className="h-4 w-4" />
                  {updatePassword.isPending ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Derecha */}
        <div className="flex flex-col gap-6">
          {isDentist && (
            <Card>
              <CardContent className="p-6 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Mi Horario Semanal</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Disponibilidad clínica activa para asignación de turnos.</p>
                  </div>
                  {dentist?.shiftLabel && (
                    <Badge variant="secondary" className="rounded-full self-start sm:self-auto">
                      {dentist.shiftLabel}
                    </Badge>
                  )}
                </div>

                {schedule.length === 0 ? (
                  <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                    Aún no tienes disponibilidad configurada. Solicítala a Dirección Médica.
                  </p>
                ) : (
                  <div className="flex flex-col rounded-lg border overflow-hidden divide-y">
                    {schedule.map((row) => (
                      <div key={row.dayOfWeek} className={`flex items-center justify-between p-2.5 text-sm ${row.available ? "hover:bg-muted/50" : "opacity-60 bg-muted/30"}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-20 text-xs font-semibold ${row.available ? "text-foreground" : "text-muted-foreground"}`}>{row.dayName}</span>
                          <span className={row.available ? "text-foreground" : "text-muted-foreground"}>
                            {row.available ? `${row.startTime} – ${row.endTime}` : "No disponible / Receso"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {row.unitName && <span className="hidden sm:inline text-xs text-muted-foreground">{row.unitName}</span>}
                          <Badge variant={row.available ? "secondary" : "outline"} className="rounded-full text-xs">
                            {row.available ? "Disponible" : "No asignado"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                  <span className="text-muted-foreground font-medium">Carga horaria asignada:</span>
                  <span className="font-bold">{profile?.weeklyHours ?? 0} hrs / semana</span>
                </div>

                {profile?.upcomingException && (
                  <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-semibold">Ausencia programada:</strong>{" "}
                      {formatDateTime(profile.upcomingException.startDate)} –{" "}
                      {formatDateTime(profile.upcomingException.endDate)}
                      {profile.upcomingException.reason ? ` · ${profile.upcomingException.reason}` : ""}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Tu horario es planificado por Dirección Médica. Para modificaciones solicita con 48h de anticipación.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sesiones activas */}
          <Card>
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Cuenta &amp; Sesiones</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Estado de la cuenta</span>
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Rol asignado: {ROLE_LABELS[user.role]}</p>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-primary" : "bg-destructive"}`} />
                    Miembro desde: {formatDateTime(user.createdAt)}
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Sesión Actual</span>
                    <Laptop className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentSession?.deviceInfo ?? "Dispositivo no identificado"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {otherSessions} otra(s) sesión(es)
                    </span>
                    <button
                      className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                      onClick={handleRevokeOthers}
                      disabled={revokeOthers.isPending || otherSessions === 0}
                      type="button"
                    >
                      {revokeOthers.isPending ? "Cerrando..." : "Cerrar otras"}
                    </button>
                  </div>
                </div>
              </div>

              {sessionMsg && <p className="text-xs text-muted-foreground">{sessionMsg}</p>}

              {sessions && sessions.length > 0 && (
                <div className="flex flex-col rounded-lg border overflow-hidden divide-y">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 text-xs">
                      <span className="truncate">{s.deviceInfo ?? "Dispositivo desconocido"}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground hidden sm:inline">{formatDateTime(s.createdAt)}</span>
                        {s.current && (
                          <Badge variant="secondary" className="rounded-full text-[10px]">
                            Actual
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
