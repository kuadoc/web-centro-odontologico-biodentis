"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  AdminServiceCatalog,
  CatalogService,
} from "@biodentis/shared-types"
import {
  SaveCatalogServiceSchema,
  SaveSpecialtySchema,
} from "@biodentis/shared-validators"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@workspace/ui/components/table"
import { AlertTriangle, CheckCircle, Plus, ShieldCheck, X } from "lucide-react"
import { api } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"

type Editor = {
  kind: "specialty" | "service" | "dentists" | "deactivate"
  id?: string
}
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

function StateBadge({
  active,
  feminine = false,
}: {
  active: boolean
  feminine?: boolean
}) {
  return (
    <Badge
      variant="outline"
      className="shrink-0 rounded-full text-xs font-medium"
    >
      <span
        className={`mr-1.5 size-1.5 rounded-full ${active ? "bg-green-500" : "bg-muted-foreground"}`}
      />
      {active
        ? feminine
          ? "Activa"
          : "Activo"
        : feminine
          ? "Inactiva"
          : "Inactivo"}
    </Badge>
  )
}

export default function DentistsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const catalog = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => api.get<AdminServiceCatalog>("/api/catalog"),
    enabled: user?.role === "ADMIN",
  })
  const [selectedId, setSelectedId] = useState("")
  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("30")
  const [price, setPrice] = useState("")
  const [dentistIds, setDentistIds] = useState<string[]>([])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const specialties = catalog.data?.specialties ?? []
  const selected =
    specialties.find((s) => s.id === selectedId) ??
    specialties.find(
      (s) => s.name.toLocaleLowerCase("es") === "odontología general"
    ) ??
    specialties[0]

  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      data,
    }: {
      path: string
      method: "post" | "patch" | "put"
      data: unknown
      message: string
    }) => api[method]<{ id?: string }>(path, data),
    onSuccess: async (result, variables) => {
      if (editor?.kind === "specialty" && !editor.id && result.id)
        setSelectedId(result.id)
      setEditor(null)
      setError("")
      setMessage(variables.message)
      await Promise.all(
        ["admin-catalog", "booking-catalog", "public-services"].map((key) =>
          qc.invalidateQueries({ queryKey: [key] })
        )
      )
    },
    onError: (e) => setError(e.message),
  })

  function open(next: Editor, service?: CatalogService) {
    setError("")
    setFields({})
    setEditor(next)
    setName(
      next.kind === "specialty"
        ? next.id
          ? (selected?.name ?? "")
          : ""
        : (service?.name ?? "")
    )
    setDescription(next.id ? (selected?.description ?? "") : "")
    setDuration(String(service?.durationMinutes ?? 30))
    setPrice(service?.price == null ? "" : String(service.price))
    setDentistIds(selected?.dentists.map((d) => d.id) ?? [])
  }

  function toggleSpecialty(confirm = false) {
    if (!selected) return
    if (selected.isActive && selected.futureAppointments > 0 && !confirm) {
      open({ kind: "deactivate" })
      return
    }
    setError("")
    mutation.mutate({
      path: `/api/catalog/specialties/${selected.id}/state`,
      method: "patch",
      data: { isActive: !selected.isActive, confirm },
      message: `Especialidad «${selected.name}» ${selected.isActive ? "desactivada: ya no aparece al agendar. Las citas existentes se mantienen." : "activada."}`,
    })
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editor) return
    if (editor.kind === "deactivate") {
      toggleSpecialty(true)
      return
    }
    if (editor.kind === "dentists" && selected) {
      mutation.mutate({
        path: `/api/catalog/specialties/${selected.id}/dentists`,
        method: "put",
        data: { dentistIds },
        message: `Odontólogos de «${selected.name}» actualizados: ${plural(dentistIds.length, "asignado", "asignados")}.`,
      })
      return
    }
    const parsed =
      editor.kind === "specialty"
        ? SaveSpecialtySchema.safeParse({ name, description })
        : SaveCatalogServiceSchema.safeParse({
            name,
            durationMinutes: Number(duration),
            price: price.trim() === "" ? null : Number(price),
          })
    if (!parsed.success) {
      setFields(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message])
        )
      )
      return
    }
    const duplicate =
      editor.kind === "specialty" ? specialties : (selected?.services ?? [])
    if (
      duplicate.some(
        (s) =>
          s.id !== editor.id &&
          s.name.trim().toLocaleLowerCase("es") ===
            name.trim().toLocaleLowerCase("es")
      )
    ) {
      setFields({ name: "Ya existe uno con ese nombre." })
      return
    }
    setFields({})
    setError("")
    if (editor.kind === "specialty") {
      mutation.mutate({
        path: `/api/catalog/specialties${editor.id ? `/${editor.id}` : ""}`,
        method: editor.id ? "patch" : "post",
        data: parsed.data,
        message: editor.id
          ? `Especialidad «${name.trim()}» actualizada.`
          : `Especialidad «${name.trim()}» creada. Ahora agrega sus servicios y asigna odontólogos.`,
      })
    } else if (selected) {
      mutation.mutate({
        path: editor.id
          ? `/api/catalog/services/${editor.id}`
          : `/api/catalog/specialties/${selected.id}/services`,
        method: editor.id ? "patch" : "post",
        data: { ...parsed.data, specialtyId: selected.id },
        message: editor.id
          ? `Servicio «${name.trim()}» actualizado.`
          : `Servicio «${name.trim()}» agregado a ${selected.name}. ${selected.isActive && selected.dentists.length ? "Ya aparece en el formulario de citas del paciente." : "No aparecerá al agendar hasta que la especialidad esté activa y tenga odontólogos asignados."}`,
      })
    }
  }

  const title =
    editor?.kind === "specialty"
      ? editor.id
        ? "Editar especialidad"
        : "Nueva especialidad"
      : editor?.kind === "service"
        ? editor.id
          ? "Editar servicio"
          : `Agregar servicio a ${selected?.name}`
        : editor?.kind === "dentists"
          ? `Odontólogos de ${selected?.name}`
          : "Desactivar especialidad"
  if (user?.role !== "ADMIN")
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        Solo el administrador puede acceder al catálogo.
      </p>
    )
  if (catalog.isPending)
    return (
      <p role="status" className="py-12 text-center text-muted-foreground">
        Cargando catálogo de servicios...
      </p>
    )
  if (catalog.isError)
    return (
      <div role="alert" className="space-y-3">
        <p>No se pudo cargar el catálogo: {catalog.error.message}</p>
        <Button variant="outline" onPress={() => void catalog.refetch()}>
          Reintentar
        </Button>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs tracking-wider text-muted-foreground uppercase">
            <span>Administración del sistema</span>
            <span aria-hidden="true">•</span>
            <span className="font-medium text-foreground">
              Catálogo de servicios
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Especialidades y servicios
            </h1>
            <Badge variant="secondary" className="rounded-full text-xs">
              {plural(specialties.length, "especialidad", "especialidades")} ·{" "}
              {plural(
                specialties.reduce((n, s) => n + s.services.length, 0),
                "servicio",
                "servicios"
              )}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lo que defines aquí es lo que el paciente ve al agendar una cita y
            lo que se guarda en su historial clínico.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1.5 rounded-full">
            <ShieldCheck className="size-3" />
            Solo administrador
          </Badge>
          <Button onPress={() => open({ kind: "specialty" })}>
            <Plus className="size-4" />
            Nueva especialidad
          </Button>
        </div>
      </div>
      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
        >
          <CheckCircle className="size-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Cambios guardados</p>
            <p>{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar mensaje"
            onPress={() => setMessage("")}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      {error && !editor && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <nav
          aria-label="Especialidades"
          className="space-y-0.5 rounded-xl bg-card p-2 ring-1 ring-foreground/10"
        >
          {!specialties.length && (
            <p className="p-4 text-sm text-muted-foreground">
              Aún no hay especialidades. Crea la primera para organizar tus
              servicios.
            </p>
          )}
          {specialties.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={selected?.id === s.id}
              onClick={() => setSelectedId(s.id)}
              className={`flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${selected?.id === s.id ? "border-border bg-muted" : "border-transparent"}`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{s.name}</span>
                <StateBadge active={s.isActive} feminine />
              </span>
              <span className="text-xs text-muted-foreground">
                {plural(s.services.length, "servicio", "servicios")} ·{" "}
                {plural(s.dentists.length, "odontólogo", "odontólogos")}
              </span>
            </button>
          ))}
        </nav>
        {selected ? (
          <section
            aria-label={`Servicios de ${selected.name}`}
            className="min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
          >
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                    <StateBadge active={selected.isActive} feminine />
                  </div>
                  {selected.description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {selected.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onPress={() => open({ kind: "specialty", id: selected.id })}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    isDisabled={mutation.isPending}
                    onPress={() => toggleSpecialty()}
                  >
                    {selected.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">
                    Odontólogos que la atienden
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => open({ kind: "dentists" })}
                  >
                    Asignar odontólogos
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.dentists.map((d) => (
                    <Badge
                      key={d.id}
                      variant="outline"
                      className="rounded-full bg-background"
                    >
                      {d.name}
                    </Badge>
                  ))}
                </div>
                {!selected.dentists.length && (
                  <p className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    Sin odontólogos asignados: esta especialidad no aparece al
                    agendar.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Servicios</h3>
                <Button onPress={() => open({ kind: "service" })}>
                  <Plus className="size-4" />
                  Agregar servicio
                </Button>
              </div>
            </div>
            <div className="border-t">
              <Table aria-label="Servicios de la especialidad">
                <TableHeader>
                  {["Servicio", "Duración", "Precio", "Estado", "Acciones"].map(
                    (label, i) => (
                      <TableHead
                        key={label}
                        isRowHeader={i === 0}
                        className={`px-4 text-xs tracking-wider text-muted-foreground uppercase ${i === 4 ? "text-right" : ""}`}
                      >
                        {label}
                      </TableHead>
                    )
                  )}
                </TableHeader>
                <TableBody
                  renderEmptyState={() => (
                    <p className="p-6 text-sm text-muted-foreground">
                      Aún no hay servicios. Usa «Agregar servicio» para crear el
                      primero.
                    </p>
                  )}
                >
                  {selected.services.map((s) => (
                    <TableRow
                      key={s.id}
                      id={s.id}
                      className={
                        s.isActive ? "" : "[&>td:not(:last-child)]:opacity-55"
                      }
                    >
                      <TableCell className="min-w-48 px-4 py-2.5 font-medium whitespace-normal">
                        {s.name}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        {s.durationMinutes} min
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        {s.price === null ? "—" : `S/ ${s.price.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <StateBadge active={s.isActive} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Editar ${s.name}`}
                            onPress={() =>
                              open({ kind: "service", id: s.id }, s)
                            }
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            isDisabled={mutation.isPending}
                            aria-label={`${s.isActive ? "Desactivar" : "Activar"} ${s.name}`}
                            onPress={() => {
                              setError("")
                              mutation.mutate({
                                path: `/api/catalog/services/${s.id}/state`,
                                method: "patch",
                                data: { isActive: !s.isActive },
                                message: `Servicio «${s.name}» ${s.isActive ? "desactivado" : "activado"}.`,
                              })
                            }}
                          >
                            {s.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="border-t bg-muted p-4 text-xs text-muted-foreground">
              {plural(selected.services.length, "servicio", "servicios")} en
              esta especialidad
            </p>
          </section>
        ) : (
          <div className="rounded-xl p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
            Crea una especialidad para agregar servicios y asignar odontólogos.
          </div>
        )}
      </div>
      <Dialog
        isOpen={!!editor}
        onOpenChange={(isOpen) => {
          if (!isOpen && !mutation.isPending) setEditor(null)
        }}
        isDismissable={!mutation.isPending}
        showCloseButton={!mutation.isPending}
        className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} noValidate className="space-y-4">
          {editor?.kind === "deactivate" && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              «{selected?.name}» tiene{" "}
              {plural(
                selected?.futureAppointments ?? 0,
                "cita futura",
                "citas futuras"
              )}
              . Si la desactivas, los pacientes no podrán agendar nuevas citas,
              pero las existentes se mantienen.
            </p>
          )}
          {(editor?.kind === "specialty" || editor?.kind === "service") && (
            <div>
              <label
                htmlFor="catalog-name"
                className="mb-1.5 block text-sm font-medium"
              >
                {editor.kind === "specialty"
                  ? "Nombre de la especialidad"
                  : "Nombre del servicio"}{" "}
                *
              </label>
              <Input
                id="catalog-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!fields.name}
                aria-describedby={
                  fields.name ? "catalog-name-error" : undefined
                }
                maxLength={editor.kind === "specialty" ? 120 : 200}
              />
              {fields.name && (
                <p
                  id="catalog-name-error"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {fields.name}
                </p>
              )}
            </div>
          )}
          {editor?.kind === "specialty" && (
            <div>
              <label
                htmlFor="catalog-description"
                className="mb-1.5 block text-sm font-medium"
              >
                Descripción (opcional)
              </label>
              <Input
                id="catalog-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>
          )}
          {editor?.kind === "service" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="catalog-duration"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Duración (min) *
                  </label>
                  <Input
                    id="catalog-duration"
                    type="number"
                    min={15}
                    max={720}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    aria-invalid={!!fields.durationMinutes}
                    aria-describedby="catalog-duration-help"
                  />
                  {fields.durationMinutes && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {fields.durationMinutes}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="catalog-price"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Precio en S/ (opcional)
                  </label>
                  <Input
                    id="catalog-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    aria-invalid={!!fields.price}
                  />
                  {fields.price && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {fields.price}
                    </p>
                  )}
                </div>
              </div>
              <p
                id="catalog-duration-help"
                className="text-xs text-muted-foreground"
              >
                La duración define los bloques de horario que verá el paciente.
              </p>
            </>
          )}
          {editor?.kind === "dentists" && (
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {!catalog.data?.dentists.length && (
                <p className="text-sm text-muted-foreground">
                  No hay odontólogos activos. Regístralos desde Usuarios para
                  poder asignarlos.
                </p>
              )}
              {catalog.data?.dentists.map((d) => (
                <label key={d.id} className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={dentistIds.includes(d.id)}
                    onChange={(e) =>
                      setDentistIds((ids) =>
                        e.target.checked
                          ? [...ids, d.id]
                          : ids.filter((id) => id !== d.id)
                      )
                    }
                  />
                  {d.name}
                </label>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              isDisabled={mutation.isPending}
              onPress={() => setEditor(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={
                editor?.kind === "deactivate" ? "destructive" : "default"
              }
              isDisabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Guardando..."
                : editor?.kind === "deactivate"
                  ? "Desactivar"
                  : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
