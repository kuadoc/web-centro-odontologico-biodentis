import {
  AssignSpecialtyDentistsSchema,
  CatalogIdSchema,
  CatalogStateSchema,
  SaveCatalogServiceSchema,
  SaveSpecialtySchema,
} from "@biodentis/shared-validators"
import type { AdminServiceCatalog } from "@biodentis/shared-types"
import { DomainError, NotFoundError } from "@/lib/errors"
import { CatalogAdminRepository } from "./catalog-admin.repository"

const dentistName = (d: {
  id: string
  user: { firstName: string; lastName: string }
}) => ({ id: d.id, name: `Dr. ${d.user.firstName} ${d.user.lastName}` })

export class CatalogAdminService {
  constructor(
    private readonly repository = new CatalogAdminRepository()
  ) {}

  async list(): Promise<AdminServiceCatalog> {
    const [specialties, dentists] = await Promise.all([
      this.repository.list(),
      this.repository.dentists(),
    ])
    return {
      dentists: dentists.map(dentistName),
      specialties: await Promise.all(
        specialties.map(async (s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          isActive: s.isActive,
          dentists: s.dentists.map(dentistName),
          services: s.treatments.map((t) => ({
            id: t.id,
            name: t.name,
            durationMinutes: t.durationMinutes,
            price: t.price === null ? null : Number(t.price),
            isActive: t.isActive,
          })),
          futureAppointments: await this.repository.futureAppointments(s.id),
        }))
      ),
    }
  }

  async bookingCatalog() {
    return (await this.repository.bookingCatalog()).map((s) => ({
      id: s.id,
      name: s.name,
      dentists: s.dentists.map(dentistName),
      services: s.treatments.map((t) => ({
        ...t,
        price: t.price === null ? null : Number(t.price),
      })),
    }))
  }

  async specialty(id: string) {
    CatalogIdSchema.parse(id)
    const specialty = await this.repository.find(id)
    if (!specialty) throw new NotFoundError("Especialidad no encontrada.")
    return specialty
  }

  async saveSpecialty(data: unknown, actorId: string, id?: string) {
    const parsed = SaveSpecialtySchema.parse(data)
    if (id) await this.specialty(id)
    if (await this.repository.duplicateName(parsed.name, id))
      throw new DomainError("Ya existe una especialidad con ese nombre.", 409)
    return this.repository.withTransaction(async (repository, audit) => {
      const saved = await repository.saveSpecialty(parsed, id)
      await audit.log(
        actorId,
        id ? "UPDATE" : "CREATE",
        "Specialty",
        saved.id,
        JSON.stringify(parsed)
      )
      return saved
    })
  }

  async state(id: string, data: unknown, actorId: string) {
    await this.specialty(id)
    const parsed = CatalogStateSchema.parse(data)
    if (
      !parsed.isActive &&
      !parsed.confirm &&
      (await this.repository.futureAppointments(id)) > 0
    ) {
      throw new DomainError(
        "La especialidad tiene citas futuras. Confirma la desactivación; las citas existentes se mantienen.",
        409
      )
    }
    return this.repository.withTransaction(async (repository, audit) => {
      const saved = await repository.state(id, parsed.isActive)
      await audit.log(
        actorId,
        parsed.isActive ? "ACTIVATE" : "DEACTIVATE",
        "Specialty",
        id
      )
      return saved
    })
  }

  async assign(id: string, data: unknown, actorId: string) {
    await this.specialty(id)
    const { dentistIds } = AssignSpecialtyDentistsSchema.parse(data)
    const eligible = new Set(
      (await this.repository.dentists()).map((d) => d.id)
    )
    if (dentistIds.some((id) => !eligible.has(id)))
      throw new DomainError("Selecciona odontólogos activos del sistema.")
    return this.repository.withTransaction(async (repository, audit) => {
      await repository.assign(id, dentistIds)
      await audit.log(
        actorId,
        "ASSIGN_DENTISTS",
        "Specialty",
        id,
        JSON.stringify({ dentistIds })
      )
      return { success: true }
    })
  }

  async saveService(
    specialtyId: string,
    data: unknown,
    actorId: string,
    id?: string
  ) {
    const specialty = await this.specialty(specialtyId)
    const parsed = SaveCatalogServiceSchema.parse(data)
    if (id) {
      CatalogIdSchema.parse(id)
      if ((await this.repository.findService(id))?.specialtyId !== specialtyId)
        throw new NotFoundError("Servicio no encontrado.")
    }
    if (await this.repository.duplicateService(specialtyId, parsed.name, id))
      throw new DomainError(
        "Ya existe un servicio con ese nombre en esta especialidad.",
        409
      )
    return this.repository.withTransaction(async (repository, audit) => {
      const saved = await repository.saveService(
        { ...parsed, specialtyId, category: specialty.name },
        id
      )
      await audit.log(
        actorId,
        id ? "UPDATE" : "CREATE",
        "Treatment",
        saved.id,
        JSON.stringify(parsed)
      )
      return {
        ...saved,
        price: saved.price === null ? null : Number(saved.price),
      }
    })
  }

  async serviceState(id: string, data: unknown, actorId: string) {
    CatalogIdSchema.parse(id)
    const { isActive } = CatalogStateSchema.parse(data)
    if (!(await this.repository.findService(id)))
      throw new NotFoundError("Servicio no encontrado.")
    return this.repository.withTransaction(async (repository, audit) => {
      await repository.serviceState(id, isActive)
      await audit.log(
        actorId,
        isActive ? "ACTIVATE" : "DEACTIVATE",
        "Treatment",
        id
      )
      return { success: true }
    })
  }

  async requireBookable(id: string, dentistId: string) {
    CatalogIdSchema.parse(id)
    CatalogIdSchema.parse(dentistId)
    const service = await this.repository.bookableService(id, dentistId)
    if (!service)
      throw new DomainError(
        "El servicio ya no está disponible con este odontólogo. Selecciona otro servicio u odontólogo."
      )
    return service
  }
}
