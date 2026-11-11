"use client";

import { useParams, useRouter } from "next/navigation";
import { usePatientDetail, useClinicalRecords } from "@/hooks/use-queries";
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
import { formatCalendarDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  User,
} from "lucide-react";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data: detail, isLoading: patientLoading } = usePatientDetail(patientId);
  const { data: clinicalRecords, isLoading: clinicalLoading } = useClinicalRecords(patientId);



  // Metricas e historial vienen del backend, ya acotados al alcance del rol.
  const patient = detail?.patient;
  const activity = detail?.activity;
  const history = detail?.history ?? [];
  const clinicalRecordsList = Array.isArray(clinicalRecords) ? clinicalRecords : [];

  if (patientLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando paciente...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Paciente no encontrado</p>
        <Button variant="outline" onPress={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onPress={() => router.back()}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ID: {patient.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant="outline">
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${patient.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  {patient.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Datos de Contacto
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{patient.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Teléfono:</span>
                <span className="font-medium">{patient.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Dirección:</span>
                <span className="font-medium">{patient.address || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Registro:</span>
                <span className="font-medium">{formatDateTime(patient.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen de Actividad
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">Total Citas</span>
                <span className="text-2xl font-bold leading-none tabular-nums">{activity?.totalAppointments ?? 0}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">Atendidas</span>
                <span className="text-2xl font-bold leading-none tabular-nums">{activity?.attended ?? 0}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">Canceladas</span>
                <span className="text-2xl font-bold leading-none tabular-nums">{activity?.cancelled ?? 0}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
                <span className="text-xs text-muted-foreground">Historial Clínico</span>
                <span className="text-2xl font-bold leading-none tabular-nums">{clinicalRecordsList.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment History */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Historial de Citas
          </h3>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay citas registradas para este paciente.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableHead isRowHeader>Fecha / Hora</TableHead>
                  <TableHead>Odontólogo</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableHeader>
                <TableBody>
                  {history.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="text-sm">
                        {formatCalendarDate(appt.date)} - {formatTime(appt.startTime)}
                      </TableCell>
                      <TableCell className="text-sm">Dr. {appt.dentistName}</TableCell>
                      <TableCell className="text-sm">{appt.treatmentName ?? "—"}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical History */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Historial Clínico
          </h3>
          {clinicalLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando historial clínico...
            </p>
          ) : clinicalRecordsList.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay registros clínicos para este paciente.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {clinicalRecordsList.map((record: any) => (
                <div
                  key={record.id}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Registro #{record.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(record.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{record.notes}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
