"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { useAuthContext } from "@/contexts/auth-context";
import { Stethoscope, Mail, Phone } from "lucide-react";

interface Dentist {
  id: string;
  specialty: string;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string };
}

export default function DentistsPage() {
  const { api } = useAuthContext();
  const [dentists, setDentists] = useState<Dentist[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Dentist[]>("/api/dentists");
        setDentists(Array.isArray(data) ? data : []);
      } catch {
        console.error("Error loading dentists");
      }
    }
    load();
  }, [api]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Odontólogos</h2>
        <p className="text-muted-foreground">Equipo odontológico</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dentists.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-sm">No hay odontólogos registrados</p>
            </CardContent>
          </Card>
        ) : (
          dentists.map((dentist) => (
            <Card key={dentist.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Dr. {dentist.user.firstName} {dentist.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{dentist.specialty}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">DENTIST</Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {dentist.user.email}
                  </p>
                  {dentist.user.phone && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {dentist.user.phone}
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
