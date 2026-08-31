import { useState, useEffect } from "react";
import { dentistsApi, Dentist, AvailableSlot } from "../../api/dentists";
import { appointmentsApi } from "../../api/appointments";

export function RequestAppointmentPage() {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentist, setSelectedDentist] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    dentistsApi.getAll().then(setDentists);
  }, []);

  useEffect(() => {
    if (selectedDentist && date) {
      dentistsApi.getAvailability(selectedDentist, date).then(setSlots);
    }
  }, [selectedDentist, date]);

  const handleSubmit = async () => {
    if (!selectedDentist || !date || !selectedSlot) return;

    setIsLoading(true);
    setMessage("");

    try {
      await appointmentsApi.request({
        dentistId: selectedDentist,
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: notes || undefined,
      });
      setMessage("Cita solicitada exitosamente. Pendiente de confirmacion.");
      setSelectedSlot(null);
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "Error al solicitar cita");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Solicitar Cita</h1>
      <p className="text-muted-foreground">Selecciona odontologo, fecha y hora disponible.</p>

      {message && (
        <div className="mt-4 rounded-md bg-primary/10 p-3 text-sm text-primary">
          {message}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Odontologo</label>
          <select
            value={selectedDentist}
            onChange={(e) => setSelectedDentist(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.user.firstName} {d.user.lastName} - {d.specialty}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        {slots.length > 0 && (
          <div>
            <label className="text-sm font-medium">Horarios Disponibles</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    selectedSlot?.startTime === slot.startTime
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Motivo de la consulta (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedDentist || !date || !selectedSlot || isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? "Solicitando..." : "Solicitar Cita"}
        </button>
      </div>
    </div>
  );
}
