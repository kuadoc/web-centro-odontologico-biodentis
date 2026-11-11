"use client"

import { useState } from "react"
import { CompleteAppointmentSchema } from "@biodentis/shared-validators"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  CheckCircle,
  Eye,
  FileText,
  Plus,
  Stethoscope,
  Trash2,
} from "lucide-react"
import { useCompleteWithNote } from "@/hooks/use-queries"

type NoteItem = { id: string; name: string; description: string }
const blank = (): NoteItem => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
})
const frequentDiagnoses = [
  "Pulpitis aguda",
  "Caries profunda",
  "Gingivitis inducida por placa",
]
const frequentTreatments = [
  "Destartraje ultrasónico",
  "Profilaxis",
  "Fluorización",
]
const controlLabels = {
  none: "Sin control indicado",
  "1m": "En 1 mes",
  "3m": "En 3 meses",
  "6m": "En 6 meses",
}
const serialize = (items: NoteItem[]) =>
  items
    .filter((item) => item.name.trim())
    .map(
      (item, index) =>
        `${index + 1}. ${item.name.trim()}${item.description.trim() ? `: ${item.description.trim()}` : ""}`
    )
    .join("\n")

function NoteItems({
  kind,
  items,
  onChange,
  disabled,
}: {
  kind: "diagnosis" | "treatment"
  items: NoteItem[]
  onChange: (items: NoteItem[]) => void
  disabled: boolean
}) {
  const diagnosis = kind === "diagnosis"
  const title = diagnosis ? "Diagnóstico" : "Tratamiento realizado"
  const frequent = diagnosis ? frequentDiagnoses : frequentTreatments
  const update = (id: string, field: "name" | "description", value: string) =>
    onChange(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  const add = (name = "") => {
    const item = { ...blank(), name }
    onChange(
      items.length === 1 && !items[0]?.name && !items[0]?.description
        ? [item]
        : [...items, item]
    )
  }
  return (
    <section className="space-y-3" aria-label={title}>
      <h4 className="flex items-center gap-2 font-semibold">
        {diagnosis ? (
          <FileText className="size-4" aria-hidden="true" />
        ) : (
          <CheckCircle className="size-4" aria-hidden="true" />
        )}
        {title}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </h4>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="space-y-3 rounded-lg border bg-background p-3"
        >
          <div className="flex items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <label
                className="sr-only"
                htmlFor={
                  index === 0 ? `clinical-${kind}` : `${kind}-${item.id}`
                }
              >
                {diagnosis ? "Nombre del diagnóstico" : "Procedimiento"}{" "}
                {index + 1}
              </label>
              <Input
                id={index === 0 ? `clinical-${kind}` : `${kind}-${item.id}`}
                aria-required="true"
                value={item.name}
                onChange={(event) =>
                  update(item.id, "name", event.target.value)
                }
                placeholder={
                  diagnosis
                    ? "Ej. Caries dental"
                    : "Ej. Limpieza dental"
                }
                disabled={disabled}
                maxLength={2000}
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar ${diagnosis ? "diagnóstico" : "tratamiento"} ${index + 1}`}
              isDisabled={disabled || items.length === 1}
              onPress={() =>
                onChange(items.filter((other) => other.id !== item.id))
              }
            >
              <Trash2
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </Button>
          </div>
          <label className="sr-only" htmlFor={`${kind}-description-${item.id}`}>
            {diagnosis
              ? "Explicación para el paciente"
              : "Descripción del procedimiento"}{" "}
            {index + 1}
          </label>
          <Textarea
            id={`${kind}-description-${item.id}`}
            value={item.description}
            onChange={(event) =>
              update(item.id, "description", event.target.value)
            }
            placeholder={
              diagnosis
                ? "Explicación para el paciente, en lenguaje sencillo"
                : "Describe qué se hizo, en lenguaje sencillo"
            }
            disabled={disabled}
            maxLength={2000}
            rows={2}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onPress={() => onChange([...items, blank()])}
          isDisabled={disabled}
        >
          <Plus className="size-4" aria-hidden="true" />
          Agregar {diagnosis ? "diagnóstico" : "tratamiento"}
        </Button>
        <Select
          aria-label={
            diagnosis ? "Diagnósticos frecuentes" : "Procedimientos frecuentes"
          }
          selectedKey={null}
          onSelectionChange={(key) => {
            if (key) add(String(key))
          }}
          isDisabled={disabled}
          className="max-w-full min-w-0"
        >
          <SelectTrigger>
            <SelectValue>{() => diagnosis ? "Añadir diagnóstico frecuente" : "Añadir procedimiento frecuente"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {frequent.map((name) => (
              <SelectItem key={name} id={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}

export function ClinicalNoteForm({
  appointmentId,
  onDone,
}: {
  appointmentId: string
  onDone: () => void
}) {
  const [diagnoses, setDiagnoses] = useState<NoteItem[]>(() => [blank()])
  const [treatments, setTreatments] = useState<NoteItem[]>(() => [blank()])
  const [control, setControl] = useState<keyof typeof controlLabels>("none")
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState("")
  const mutation = useCompleteWithNote()
  const data = {
    diagnosis: serialize(diagnoses),
    treatment: serialize(treatments),
    nextControl: control,
  }
  const validate = () => {
    if ([...diagnoses, ...treatments].some((item) => !item.name.trim())) {
      setError(
        "Completa el nombre de cada diagnóstico y tratamiento o elimina las filas vacías."
      )
      return false
    }
    const parsed = CompleteAppointmentSchema.safeParse(data)
    if (!parsed.success) {
      setError(
        "Diagnóstico y tratamiento son obligatorios y cada sección admite hasta 2000 caracteres."
      )
      return false
    }
    setError("")
    return true
  }
  const save = async () => {
    if (!validate()) return
    try {
      await mutation.mutateAsync({ id: appointmentId, ...data })
      onDone()
    } catch (err) {
      setConfirm(false)
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos guardar la nota clínica. Inténtalo nuevamente."
      )
    }
  }
  return (
    <section className="space-y-4" aria-label="Registro de nota clínica">
      <div>
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Stethoscope className="size-4" aria-hidden="true" />
          Registro de nota clínica
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Registra la información indicada por el odontólogo tratante. Los
          campos marcados con * son obligatorios.
        </p>
      </div>
      <fieldset
        disabled={mutation.isPending || confirm}
        className="min-w-0 space-y-5 border-0 p-0"
      >
        <NoteItems
          kind="diagnosis"
          items={diagnoses}
          onChange={setDiagnoses}
          disabled={mutation.isPending || confirm}
        />
        <NoteItems
          kind="treatment"
          items={treatments}
          onChange={setTreatments}
          disabled={mutation.isPending || confirm}
        />
        <div className="space-y-2">
          <p id="next-control-label" className="font-semibold">
            Próximo control
          </p>
          <Select
            aria-labelledby="next-control-label"
            placeholder="Selecciona cuándo debe volver el paciente"
            selectedKey={control}
            onSelectionChange={(key) => {
              if (key && Object.hasOwn(controlLabels, key))
                setControl(key as keyof typeof controlLabels)
            }}
            className="w-full"
            isDisabled={mutation.isPending || confirm}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(controlLabels).map(([key, label]) => (
                <SelectItem key={key} id={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Esta indicación se incluirá en el historial; no reserva una cita.
          </p>
        </div>
      </fieldset>
      <Button
        variant="outline"
        onPress={() => setPreview(!preview)}
        aria-expanded={preview}
        aria-controls="clinical-note-preview"
      >
        <Eye className="size-4" aria-hidden="true" />
        {preview ? "Ocultar vista previa" : "Vista previa para el paciente"}
      </Button>
      {preview && (
        <div
          id="clinical-note-preview"
          className="space-y-4 rounded-lg bg-muted p-4"
        >
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Así lo verá el paciente
          </p>
          <div>
            <h4 className="font-semibold">Diagnóstico</h4>
            <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
              {data.diagnosis || "Aún no has añadido diagnósticos."}
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Tratamiento realizado</h4>
            <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
              {data.treatment || "Aún no has añadido tratamientos."}
            </p>
          </div>
          <p className="text-sm">
            <strong>Próximo control:</strong> {controlLabels[control]}
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {confirm ? (
        <div
          role="region"
          aria-label="Confirmar registro clínico"
          className="space-y-3 rounded-lg border p-4"
        >
          <h4 className="font-semibold">
            ¿Guardar la nota y completar la cita?
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Se registrarán {diagnoses.length} diagnóstico(s) y{" "}
            {treatments.length} tratamiento(s) en el historial del paciente. La
            cita quedará completada.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onPress={() => setConfirm(false)}
              isDisabled={mutation.isPending}
            >
              Volver a editar
            </Button>
            <Button onPress={save} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Confirmar y completar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3">
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Revisa la información antes de completar la atención.
          </p>
          <Button
            onPress={() => {
              if (validate()) setConfirm(true)
            }}
          >
            <CheckCircle className="size-4" aria-hidden="true" />
            Guardar y completar
          </Button>
        </div>
      )}
    </section>
  )
}
