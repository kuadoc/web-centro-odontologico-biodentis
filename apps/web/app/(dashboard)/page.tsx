"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { useAuthContext } from "@/contexts/auth-context";
import { Calendar, Users, Stethoscope, FileText } from "lucide-react";

export default function DashboardPage() {
  const { api, user } = useAuthContext();
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    totalDentists: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Array<{
    id: string;
    date: string;
    startTime: string;
    status: string;
    patient: { firstName: string; lastName: string };
    dentist: { user: { firstName: string; lastName: string } };
  }>>([]);

  useEffect(() => {
    async function load() {
      try {
        const [appointments, dentists] = await Promise.all([
          api.get("/api/appointments"),
          api.get("/api/dentists"),
        ]);

        const appts = Array.isArray(appointments) ? appointments : [];
        setRecentAppointments(appts.slice(0, 5));
        setStats({
          totalAppointments: appts.length,
          pendingAppointments: appts.filter((a: { status: string }) => a.status === "PENDING").length,
          completedAppointments: appts.filter((a: { status: string }) => a.status === "COMPLETED").length,
          totalDentists: Array.isArray(dentists) ? dentists.length : 0,
        });
      } catch {
        console.error("Error loading dashboard");
      }
    }
    load();
  }, [api]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Bienvenido, {user?.firstName}
        </h2>
        <p className="text-muted-foreground">Resumen del sistema BIODENTIS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
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
                      {apt.patient.firstName} {apt.patient.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dr. {apt.dentist.user.firstName} {apt.dentist.user.lastName} - {apt.date} {apt.startTime}
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
