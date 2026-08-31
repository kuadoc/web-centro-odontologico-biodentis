"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { useAuthContext } from "@/contexts/auth-context";
import { Users, Mail, Phone } from "lucide-react";

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export default function PatientsPage() {
  const { api } = useAuthContext();
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Patient[]>("/api/users/me");
        // Fetch all users - only admin/receptionist can see this
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        // Fallback: use appointments to get unique patients
        const appts = await api.get<Array<{ patient: Patient }>>("/api/appointments");
        if (Array.isArray(appts)) {
          const uniquePatients = Array.from(
            new Map(appts.map((a) => [a.patient.id, a.patient])).values()
          );
          setPatients(uniquePatients);
        }
      } catch {
        console.error("Error loading patients");
      }
    }
    load();
  }, [api]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pacientes</h2>
        <p className="text-muted-foreground">Lista de pacientes registrados</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patients.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-sm">No hay pacientes registrados</p>
            </CardContent>
          </Card>
        ) : (
          patients.map((patient) => (
            <Card key={patient.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{patient.role}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{patient.role}</Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {patient.email}
                  </p>
                  {patient.phone && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {patient.phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
