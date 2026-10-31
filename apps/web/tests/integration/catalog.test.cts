import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import { prisma } from "@/lib/prisma"
import { AuditService } from "@/modules/audit/audit.service"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"
import { CatalogAdminRepository } from "@/modules/service-catalog/catalog-admin.repository"
import {
  CatalogIdSchema,
  SaveCatalogServiceSchema,
} from "@biodentis/shared-validators"
import { AvailabilityService } from "@/modules/availability/availability.service"
import { AvailabilityRepository } from "@/modules/availability/availability.repository"

test("valida duración, precio opcional y decimales", () => {
  const valid = { name: "Consulta", durationMinutes: 45, price: null }
  assert.equal(SaveCatalogServiceSchema.safeParse(valid).success, true)
  for (const durationMinutes of [0, -15, 16, 721, Infinity])
    assert.equal(
      SaveCatalogServiceSchema.safeParse({ ...valid, durationMinutes }).success,
      false
    )
  for (const price of [-1, 1.005, NaN, Infinity])
    assert.equal(
      SaveCatalogServiceSchema.safeParse({ ...valid, price }).success,
      false
    )
  assert.equal(
    SaveCatalogServiceSchema.safeParse({ ...valid, price: 0 }).success,
    true
  )
})

test("catálogo persistente: asignación, duplicados, disponibilidad y conservación de citas", async () => {
  const rollback = new Error("ROLLBACK_CATALOG_TEST")
  const marker = randomUUID()
  try {
    const actual = await new CatalogAdminService().list()
    for (const s of actual.specialties) {
      CatalogIdSchema.parse(s.id)
      for (const t of s.services) CatalogIdSchema.parse(t.id)
    }
    await assert.rejects(
      prisma.$transaction(
        async (tx) => {
          const admin = await tx.user.create({
            data: {
              email: `catalog-admin-${marker}@example.test`,
              passwordHash: "test",
              firstName: "Test",
              lastName: "Admin",
              role: "ADMIN",
            },
          })
          const patient = await tx.user.create({
            data: {
              email: `catalog-patient-${marker}@example.test`,
              passwordHash: "test",
              firstName: "Test",
              lastName: "Patient",
              role: "PATIENT",
            },
          })
          const user = await tx.user.create({
            data: {
              email: `catalog-dentist-${marker}@example.test`,
              passwordHash: "test",
              firstName: "Test",
              lastName: "Dentist",
              role: "DENTIST",
            },
          })
          const dentist = await tx.dentist.create({
            data: { userId: user.id, specialty: "Test" },
          })
          const audit = new AuditService()
          audit.log = (userId, action, resourceType, resourceId, details) =>
            tx.auditLog.create({
              data: { userId, action, resourceType, resourceId, details },
            })
          const service = new CatalogAdminService(
            new CatalogAdminRepository(tx),
            audit
          )
          const specialty = await service.saveSpecialty(
            { name: `Test ${marker}`, description: "Descripción" },
            admin.id
          )
          await assert.rejects(
            service.saveSpecialty(
              { name: specialty.name.toUpperCase() },
              admin.id
            ),
            /Ya existe/
          )
          const treatment = await service.saveService(
            specialty.id,
            { name: "Consulta", durationMinutes: 45, price: null },
            admin.id
          )
          assert.equal(treatment.price, null)
          assert.equal(
            (await service.bookingCatalog()).some((s) => s.id === specialty.id),
            false
          )
          await assert.rejects(
            service.assign(
              specialty.id,
              { dentistIds: [patient.id] },
              admin.id
            ),
            /odontólogos activos/
          )
          await service.assign(
            specialty.id,
            { dentistIds: [dentist.id] },
            admin.id
          )
          assert.equal(
            (await service.bookingCatalog()).find((s) => s.id === specialty.id)
              ?.services[0]?.durationMinutes,
            45
          )
          assert.equal(
            (await service.requireBookable(treatment.id, dentist.id)).id,
            treatment.id
          )
          await assert.rejects(
            service.saveService(
              specialty.id,
              { name: "CONSULTA", durationMinutes: 30, price: 10 },
              admin.id
            ),
            /Ya existe/
          )
          await service.serviceState(
            treatment.id,
            { isActive: false },
            admin.id
          )
          await assert.rejects(
            service.requireBookable(treatment.id, dentist.id),
            /ya no está disponible/
          )
          await service.serviceState(treatment.id, { isActive: true }, admin.id)
          const appointment = await tx.appointment.create({
            data: {
              patientId: patient.id,
              dentistId: dentist.id,
              treatmentId: treatment.id,
              date: new Date("2099-10-28"),
              startTime: "09:00",
              endTime: "09:45",
            },
          })
          await tx.availability.create({
            data: {
              dentistId: dentist.id,
              dayOfWeek: new Date("2099-10-28").getUTCDay(),
              startTime: "08:00",
              endTime: "12:00",
            },
          })
          const slots = await new AvailabilityService(
            new AvailabilityRepository(tx),
            service
          ).getAvailableSlots(dentist.id, "2099-10-28", treatment.id)
          assert.ok(
            slots.some((s) => s.startTime === "08:00" && s.endTime === "08:45")
          )
          assert.ok(
            slots.some((s) => s.startTime === "09:45" && s.endTime === "10:30")
          )
          assert.equal(
            slots.some((s) => s.startTime < "09:45" && s.endTime > "09:00"),
            false,
            "Ningún bloque puede solaparse con una cita"
          )
          await assert.rejects(
            service.state(specialty.id, { isActive: false }, admin.id),
            /citas futuras/
          )
          await service.state(
            specialty.id,
            { isActive: false, confirm: true },
            admin.id
          )
          assert.equal(
            (await service.bookingCatalog()).some((s) => s.id === specialty.id),
            false
          )
          assert.equal(
            (
              await tx.appointment.findUniqueOrThrow({
                where: { id: appointment.id },
              })
            ).status,
            "PENDING"
          )
          assert.ok(
            (await tx.auditLog.count({ where: { userId: admin.id } })) >= 6
          )
          throw rollback
        },
        { timeout: 30_000 }
      ),
      (error) => error === rollback
    )
    assert.equal(
      await prisma.user.findUnique({
        where: { email: `catalog-admin-${marker}@example.test` },
      }),
      null
    )
  } finally {
    await prisma.$disconnect()
  }
})
