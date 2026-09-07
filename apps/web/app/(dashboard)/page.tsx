"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { useAuth } from "@/hooks/use-auth";
import { useAppointments, useDentists } from "@/hooks/use-queries";
import { Calendar, Users, Stethoscope, FileText } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments();
  const { data: dentistsData, isLoading: dentistsLoading } = useDentists();

  const appointments = useMemo(
    () => (Array.isArray(appointmentsData) ? appointmentsData : []),
    [appointmentsData]
  );

  const dentists = useMemo(
    () => (Array.isArray(dentistsData) ? dentistsData : []),
    [dentistsData]
  );

  const stats = useMemo(
    () => ({
      totalAppointments: appointments.length,
      pendingAppointments: appointments.filter((a) => a.status === "PENDING").length,
      completedAppointments: appointments.filter((a) => a.status === "COMPLETED").length,
      totalDentists: dentists.length,
    }),
    [appointments, dentists]
  );

  const recentAppointments = useMemo(
    () => appointments.filter((a) => a.patient && a.dentist).slice(0, 5),
    [appointments]
  );

  const statCards = [
    { title: "Citas Totales", value: stats.totalAppointments, icon: Calendar },
    { title: "Citas Pendientes", value: stats.pendingAppointments, icon: Calendar },
    { title: "Citas Completadas", value: stats.completedAppointments, icon: FileText },
    { title: "Odontólogos", value: stats.totalDentists, icon: Stethoscope },
  ];

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    NO_SHOW: "bg-gray-100 text-gray-800",
  };

  if (appointmentsLoading || dentistsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Bienvenido, {user?.firstName}
        </h2>
        <p className="text-muted-foreground">Resumen del sistema BIODENTIS</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Citas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay citas registradas</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">
                      {apt.patient!.firstName} {apt.patient!.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dr. {apt.dentist!.user.firstName} {apt.dentist!.user.lastName} - {apt.date} {apt.startTime}
                    </p>
                  </div>
                  <Badge className={statusColors[apt.status] || ""}>{apt.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
