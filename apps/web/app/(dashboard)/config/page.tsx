"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
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

function HorariosTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Horarios y Excepciones Clinicas</CardTitle>
            <CardDescription>Gestion de feriados, recesos medicos y mantenimiento de equipamiento.</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nueva Excepcion
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Gestion de horarios base y excepciones por odontologo.</p>
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
          <CardTitle>Politica de Contrasenas</CardTitle>
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
