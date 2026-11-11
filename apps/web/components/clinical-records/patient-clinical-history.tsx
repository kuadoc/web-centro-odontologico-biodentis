"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { Appointment } from "@biodentis/shared-types"
import {
  Bell,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  LockKeyhole,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Pagination } from "@workspace/ui/components/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { usePagination } from "@workspace/ui/hooks/use-pagination"
import { useAppointments } from "@/hooks/use-queries"
import { UserAvatar } from "@/components/ui/user-avatar"
import { parseClinicalNote } from "@/lib/clinical-note-display"
import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils"

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
const day = (date: string) => date.slice(0, 10)
const dateLabel = (date: string, options?: Intl.DateTimeFormatOptions) =>
  options ? new Intl.DateTimeFormat(
    "es-PE",
    { ...options, timeZone: "UTC" }
  ).format(new Date(`${day(date)}T00:00:00Z`)) : formatCalendarDate(date)
const specialtyLabel = (appointment: Appointment) =>
  appointment.treatment?.specialty?.name ??
  appointment.dentist?.specialty ??
  "Especialidad no registrada"
const dentistLabel = (appointment: Appointment) =>
  appointment.dentist?.user
    ? `${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}`
    : "Odontólogo no disponible"

function printRecord(appointment: Appointment) {
  const printWindow = window.open("", "_blank", "width=850,height=700")
  if (!printWindow) return false
  const doc = printWindow.document
  doc.documentElement.lang = "es"
  doc.title = "Historial clínico — BIODENTIS"
  const style = doc.createElement("style")
  style.textContent =
    "body{font:14px/1.7 Arial,sans-serif;color:#171717;max-width:760px;margin:40px auto;padding:24px}h1{font-size:24px}h2{font-size:16px;margin-top:28px}p{white-space:pre-wrap;overflow-wrap:anywhere}footer{border-top:1px solid #ddd;margin-top:40px;padding-top:12px;font-size:12px;color:#555}@page{margin:20mm}"
  doc.head.append(style)
  const lines: [string, string][] = [
    ["h1", "BIODENTIS · Historial clínico"],
    [
      "p",
      `Paciente: ${appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : "No disponible"}`,
    ],
    ["h2", appointment.treatment?.name ?? "Atención odontológica"],
    [
      "p",
      `${specialtyLabel(appointment)}\nOdontólogo: ${dentistLabel(appointment)}\nAtención del ${dateLabel(appointment.date)} · ${formatTime(appointment.startTime)}`,
    ],
    ["h2", "Registro clínico de la atención"],
    ["p", appointment.clinicalRecord?.notes || "Sin notas registradas."],
    [
      "footer",
      "Información confidencial. Registrada por el odontólogo tratante.",
    ],
  ]
  for (const [tag, text] of lines) {
    const element = doc.createElement(tag)
    element.textContent = text
    doc.body.append(element)
  }
  printWindow.focus()
  printWindow.setTimeout(() => printWindow.print(), 250)
  return true
}

function HistoryCard({
  appointment,
  initiallyOpen,
}: {
  appointment: Appointment
  initiallyOpen: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const [printError, setPrintError] = useState(false)
  const detailsId = `clinical-detail-${appointment.id}`
  const note = parseClinicalNote(appointment.clinicalRecord?.notes ?? "")
  return (
    <article aria-labelledby={`clinical-title-${appointment.id}`}>
      <Card className="gap-0">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline">{specialtyLabel(appointment)}</Badge>
              <h3
                id={`clinical-title-${appointment.id}`}
                className="text-lg font-semibold tracking-tight"
              >
                {appointment.treatment?.name ?? "Atención odontológica"}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <UserAvatar
                    firstName={appointment.dentist?.user?.firstName}
                    lastName={appointment.dentist?.user?.lastName}
                    size="sm"
                  />
                  {dentistLabel(appointment)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0" aria-hidden="true" />
                  <time dateTime={day(appointment.date)}>
                    Atención del {dateLabel(appointment.date)} · {formatTime(appointment.startTime)}
                  </time>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                <CheckCircle className="size-3.5" aria-hidden="true" />
                Atención registrada
              </Badge>
              <Button
                variant={open ? "outline" : "default"}
                onPress={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls={detailsId}
                aria-label={`${open ? "Ocultar" : "Ver"} detalle de ${appointment.treatment?.name ?? "la atención"} del ${dateLabel(appointment.date)}`}
              >
                {open ? "Ocultar detalle" : "Ver detalle"}
                {open ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>
          </div>
          {open && (
            <div id={detailsId} className="space-y-4 pb-4">
              <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm">
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Información de tu atención</p>
                  <p className="mt-1 text-muted-foreground">
                    Consulta las notas registradas por tu odontólogo. Si tienes
                    dudas sobre tu diagnóstico o tratamiento, consúltalas en tu
                    próxima cita.
                  </p>
                </div>
              </div>
              {note ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: "Diagnóstico",
                      items: note.diagnoses,
                      icon: Stethoscope,
                    },
                    {
                      title: "Tratamiento realizado",
                      items: note.treatments,
                      icon: CheckCircle,
                    },
                  ].map(({ title, items, icon: Icon }) => (
                    <section
                      key={title}
                      className="min-w-0 space-y-3 rounded-lg border p-4"
                      aria-label={title}
                    >
                      <h4 className="flex items-center gap-2 font-semibold">
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {title}
                      </h4>
                      {items.length > 0 ? (
                        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                          {items.map((item, index) => (
                            <li
                              key={index}
                              className="pl-1 break-words whitespace-pre-wrap"
                            >
                              {item}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Sin información registrada.
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <section
                  className="space-y-3 rounded-lg border p-4"
                  aria-label="Registro clínico de la atención"
                >
                  <h4 className="flex items-center gap-2 font-semibold">
                    <Stethoscope className="size-4" aria-hidden="true" />
                    Registro clínico de la atención
                  </h4>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {appointment.clinicalRecord?.notes ||
                      "El odontólogo no ha añadido notas a esta atención."}
                  </p>
                </section>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {note?.nextControl
                        ? "Próximo control"
                        : "Continúa con tu cuidado dental"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {note?.nextControl ??
                        "Coordina tu próximo control según las indicaciones de tu odontólogo."}
                    </p>
                  </div>
                </div>
                <Link
                  href="/appointments"
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Calendar className="size-4" aria-hidden="true" />
                  Ir a mis citas
                </Link>
              </div>
            </div>
          )}
        </CardContent>
        {open && (
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Registrado por el odontólogo tratante
            </p>
            <Button
              variant="outline"
              onPress={() => setPrintError(!printRecord(appointment))}
            >
              <Printer className="size-4" aria-hidden="true" />
              Imprimir / guardar PDF
            </Button>
            {printError && (
              <p role="alert" className="w-full text-sm text-destructive">
                Permite las ventanas emergentes para abrir la vista de
                impresión.
              </p>
            )}
          </CardFooter>
        )}
      </Card>
    </article>
  )
}

export function PatientClinicalHistory() {
  const { data, isLoading, error, refetch, isFetching } = useAppointments()
  const [search, setSearch] = useState("")
  const [specialty, setSpecialty] = useState("all")
  const [dentist, setDentist] = useState("all")
  const [year, setYear] = useState("all")
  const appointments = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const records = useMemo(
    () =>
      appointments
        .filter((item) => item.clinicalRecord)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.startTime.localeCompare(a.startTime)
        ),
    [appointments]
  )
  const specialties = [...new Set(records.map(specialtyLabel))].sort((a, b) =>
    a.localeCompare(b, "es")
  )
  const dentists = [
    ...new Map(
      records.map((item) => [item.dentistId, dentistLabel(item)])
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "es"))
  const years = [...new Set(records.map((item) => item.date.slice(0, 4)))]
    .sort()
    .reverse()
  const filtered = useMemo(
    () =>
      records.filter(
        (item) =>
          (specialty === "all" || specialtyLabel(item) === specialty) &&
          (dentist === "all" || item.dentistId === dentist) &&
          (year === "all" || item.date.startsWith(year)) &&
          normalize(
            `${item.treatment?.name ?? ""} ${specialtyLabel(item)} ${dentistLabel(item)} ${item.clinicalRecord?.notes ?? ""}`
          ).includes(normalize(search.trim()))
      ),
    [records, specialty, dentist, year, search]
  )
  const pagination = usePagination(
    filtered,
    10,
    JSON.stringify([search, specialty, dentist, year])
  )
  const latest = records[0]
  const now = new Date()
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now)
  const next = appointments
    .filter(
      (item) =>
        (day(item.date) > today ||
          (day(item.date) === today && item.startTime > currentTime)) &&
        (item.status === "CONFIRMED" || item.status === "PENDING")
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    )[0]
  const hasFilters =
    !!search || specialty !== "all" || dentist !== "all" || year !== "all"
  const reset = () => {
    setSearch("")
    setSpecialty("all")
    setDentist("all")
    setYear("all")
  }

  if (isLoading)
    return (
      <div
        role="status"
        className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground"
      >
        Cargando tu historial clínico...
      </div>
    )
  if (error)
    return (
      <Card className="mx-auto max-w-5xl">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <FileText
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">
            No pudimos cargar tu historial
          </h2>
          <p className="text-sm text-muted-foreground">
            Vuelve a intentarlo en unos momentos.
          </p>
          <Button
            variant="outline"
            onPress={() => refetch()}
            isDisabled={isFetching}
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs tracking-wider text-muted-foreground uppercase">
            <span>Portal del paciente</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-foreground">
              Historial clínico
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              Historial clínico
            </h2>
            <Badge variant="secondary">
              {records.length}{" "}
              {records.length === 1 ? "atención" : "atenciones"}
            </Badge>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Revisa la información de cada atención y las indicaciones que tu
            odontólogo ha registrado para ti.
          </p>
        </div>
        <Badge variant="outline" className="max-w-full whitespace-normal">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Tu información está protegida
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Atenciones registradas",
            value: String(records.length),
            detail: "Desde tu primera visita",
            icon: FileText,
          },
          {
            label: "Última atención",
            value: latest
              ? dateLabel(latest.date, {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })
              : "Sin atenciones",
            detail: latest
              ? `${latest.date.slice(0, 4)} · ${latest.treatment?.name ?? "Atención odontológica"}`
              : "Aquí aparecerá tu primera atención",
            icon: Calendar,
          },
          {
            label: "Próxima cita",
            value: next
              ? dateLabel(next.date, {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })
              : "Por agendar",
            detail: next
              ? `${next.date.slice(0, 4)} · ${formatTime(next.startTime)} · ${next.status === "PENDING" ? "Pendiente de confirmación" : "Confirmada"}`
              : "Consulta tus citas para coordinar un control",
            icon: Bell,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {detail}
                </p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {records.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 basis-full">
              <Search
                className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar por servicio, notas clínicas u odontólogo"
                placeholder="Buscar por servicio, notas u odontólogo"
                className="pl-8"
              />
            </div>
            <Select
              aria-label="Especialidad"
              selectedKey={specialty}
              onSelectionChange={(key) => setSpecialty(String(key))}
              className="min-w-0 flex-1 sm:min-w-44"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">Todas las especialidades</SelectItem>
                {specialties.map((item) => (
                  <SelectItem key={item} id={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              aria-label="Odontólogo"
              selectedKey={dentist}
              onSelectionChange={(key) => setDentist(String(key))}
              className="min-w-0 flex-1 sm:min-w-44"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">Todos los odontólogos</SelectItem>
                {dentists.map(([id, name]) => (
                  <SelectItem key={id} id={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              aria-label="Año de atención"
              selectedKey={year}
              onSelectionChange={(key) => setYear(String(key))}
              className="w-full sm:w-36"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">Todos los años</SelectItem>
                {years.map((item) => (
                  <SelectItem key={item} id={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onPress={reset} isDisabled={!hasFilters}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Restablecer
            </Button>
          </CardContent>
        </Card>
      )}

      <p role="status" className="sr-only">
        {filtered.length}{" "}
        {filtered.length === 1
          ? "atención encontrada"
          : "atenciones encontradas"}
      </p>
      {filtered.length > 0 ? (
        pagination.pageItems.map((appointment) => (
          <HistoryCard
            key={appointment.id}
            appointment={appointment}
            initiallyOpen={appointment.id === latest?.id}
          />
        ))
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <FileText
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <h3 className="text-base font-semibold">
              {records.length
                ? "No encontramos atenciones con esos filtros"
                : "Tu historial comienza con tu primera atención"}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {records.length
                ? "Prueba con otra búsqueda o restablece los filtros."
                : "Cuando tu odontólogo registre una atención, podrás consultar aquí las notas y las indicaciones de tu visita."}
            </p>
            {records.length > 0 ? (
              <Button variant="outline" onPress={reset}>
                Restablecer filtros
              </Button>
            ) : (
              <Link
                href="/appointments"
                className="text-sm font-medium underline underline-offset-4"
              >
                Ir a mis citas
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {records.length > 0 && (
        <Card className="py-0">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            label="atenciones"
          />
        </Card>
      )}
      <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Esta información es confidencial. Si algo no te queda claro,
          comunícate con la clínica o consúltalo en tu próxima cita.
        </p>
      </div>
    </div>
  )
}
