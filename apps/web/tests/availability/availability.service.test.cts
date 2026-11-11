import assert from "node:assert/strict"
import { test, type TestContext } from "node:test"
import { DomainError } from "@/lib/errors"
import { AvailabilityRepository } from "@/modules/availability/availability.repository"
import { AvailabilityService } from "@/modules/availability/availability.service"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

const DENTIST = "test-dentist"
const TREATMENT = "test-treatment"
const DATE = "2030-01-07" // Lunes, independientemente de la zona horaria del proceso.
const range = (startTime: string, endTime: string) => ({ startTime, endTime })

function setup(context: TestContext, now = "2030-01-06T12:00:00Z") {
  context.mock.timers.enable({ apis: ["Date"], now: new Date(now) })
  const repository = new AvailabilityRepository()
  const catalog = new CatalogAdminService()
  const weekly = context.mock.method(repository, "findByDentistAndDay", async () => [
    { id: "weekly", dentistId: DENTIST, dayOfWeek: 1, ...range("08:00", "10:00") },
  ])
  const exception = context.mock.method(repository, "findException", async () => null)
  const bookings = context.mock.method(repository, "findBookedAppointments", async () => [])
  const treatment = context.mock.method(catalog, "requireBookable", async () => ({
    id: TREATMENT, durationMinutes: 45,
  }))
  // Todas las lecturas usadas por getAvailableSlots están simuladas; no se consulta la BD.
  return { service: new AvailabilityService(repository, catalog), weekly, exception, bookings, treatment }
}

test("DISP-01 | HU-02/HU-03: sin tratamiento devuelve bloques de 30 minutos", async (context) => {
  const { service } = setup(context)
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE), [
    range("08:00", "08:30"), range("08:30", "09:00"),
    range("09:00", "09:30"), range("09:30", "10:00"),
  ])
})

test("DISP-02 | HU-03: tratamiento de 45 minutos ofrece inicios cada 15 minutos", async (context) => {
  const { service, treatment } = setup(context)
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE, TREATMENT), [
    range("08:00", "08:45"), range("08:15", "09:00"),
    range("08:30", "09:15"), range("08:45", "09:30"),
    range("09:00", "09:45"), range("09:15", "10:00"),
  ])
  assert.deepEqual(treatment.mock.calls[0]?.arguments, [TREATMENT, DENTIST])
})

test("DISP-03 | HU-03: admite un tratamiento que termina exactamente al cierre", async (context) => {
  const { service, weekly } = setup(context)
  weekly.mock.mockImplementation(async () => [range("09:15", "10:00")])
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE, TREATMENT), [range("09:15", "10:00")])
})

test("DISP-04 | HU-03: no ofrece tratamientos que exceden el tiempo restante", async (context) => {
  const { service, weekly } = setup(context)
  weekly.mock.mockImplementation(async () => [range("09:30", "10:00")])
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE, TREATMENT), [])
})

test("DISP-05 | HU-02/HU-03: elimina cruces parciales y conserva bloques contiguos", async (context) => {
  const { service, weekly, bookings } = setup(context)
  weekly.mock.mockImplementation(async () => [range("08:00", "11:00")])
  bookings.mock.mockImplementation(async () => [range("08:45", "09:30")])
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE), [
    range("08:00", "08:30"), range("09:30", "10:00"),
    range("10:00", "10:30"), range("10:30", "11:00"),
  ])
})

test("DISP-06 | HU-02/HU-03: sin jornada configurada devuelve una lista vacía", async (context) => {
  const { service, weekly } = setup(context)
  weekly.mock.mockImplementation(async () => [])
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE), [])
})

test("DISP-07 | HU-09: una excepción encontrada bloquea actualmente el día completo", async (context) => {
  const { service, exception } = setup(context)
  // TODO(bug?): caracteriza el bloqueo del día completo incluso ante una excepción parcial.
  // Confirmar el requisito de intervalos parciales antes de corregirlo en un cambio separado.
  for (const scope of ["DENTIST", "CLINIC"]) {
    exception.mock.mockImplementation(async () => ({
      scope, startDate: new Date(`${DATE}T09:00:00-05:00`), endDate: new Date(`${DATE}T09:30:00-05:00`),
    }))
    assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE), [], scope)
  }
})

test("DISP-08 | HU-03: descarta inicios pasados y el inicio igual a ahora en horario de Lima", async (context) => {
  const { service } = setup(context, "2030-01-07T14:00:00Z") // 09:00 en Lima.
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE), [range("09:30", "10:00")])
  assert.deepEqual(await service.getAvailableSlots(DENTIST, "2030-01-06"), [])
})

test("DISP-09 | HU-02/HU-03: consulta el día UTC de la fecha civil solicitada", async (context) => {
  const { service, weekly, exception } = setup(context, "2030-01-07T04:45:00Z") // Domingo en Lima.
  assert.equal((await service.getAvailableSlots(DENTIST, DATE)).length, 4)
  assert.deepEqual(weekly.mock.calls[0]?.arguments, [DENTIST, 1])
  assert.deepEqual(exception.mock.calls[0]?.arguments, [DENTIST, new Date("2030-01-07T00:00:00Z")])
})

test("DISP-10 | HU-03: propaga el rechazo de un tratamiento no reservable", async (context) => {
  const { service, treatment } = setup(context)
  const failure = new DomainError("El servicio ya no está disponible")
  treatment.mock.mockImplementation(async () => { throw failure })
  await assert.rejects(service.getAvailableSlots(DENTIST, DATE, TREATMENT), (error) => error === failure)
})

test("DISP-11 | HU-02/HU-03: conserva los períodos de atención sin generar bloques en el receso", async (context) => {
  const { service, weekly } = setup(context)
  weekly.mock.mockImplementation(async () => [range("08:00", "09:00"), range("14:00", "15:00")])
  assert.deepEqual(await service.getAvailableSlots(DENTIST, DATE), [
    range("08:00", "08:30"), range("08:30", "09:00"),
    range("14:00", "14:30"), range("14:30", "15:00"),
  ])
})
