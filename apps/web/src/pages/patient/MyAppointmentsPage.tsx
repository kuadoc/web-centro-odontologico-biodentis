import { useState, useEffect } from "react";
import { appointmentsApi, Appointment } from "../../api/appointments";
import { AppointmentStatus } from "@biodentis/shared-types";
import { formatDate } from "../../lib/utils";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAppointments = () => {
    setIsLoading(true);
    appointmentsApi.getAll().then(setAppointments).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Seguro que deseas cancelar esta cita?")) return;
    try {
      await appointmentsApi.cancel(id);
      loadAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Error al cancelar");
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis Citas</h1>

      {appointments.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No tienes citas registradas.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    Dr. {apt.dentist.user.firstName} {apt.dentist.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{apt.dentist.specialty}</p>
                  <p className="text-sm">
                    {formatDate(apt.date)} - {apt.startTime} a {apt.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[apt.status]}`}>
                    {apt.status}
                  </span>
                  {(apt.status === "PENDING" || apt.status === "CONFIRMED") && (
                    <button
                      onClick={() => handleCancel(apt.id)}
                      className="rounded-md px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
