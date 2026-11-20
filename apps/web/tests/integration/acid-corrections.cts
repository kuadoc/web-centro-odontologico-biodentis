import assert from "node:assert/strict";
import { randomUUID, randomInt } from "node:crypto";
import { test } from "node:test";
import { isLocalTestDatabase } from "./local-database-guard.cts";

if (!isLocalTestDatabase()) throw new Error("Se requiere la BD desechable de pruebas.");
process.env.JWT_ACCESS_SECRET = "acid-test-access-only";
process.env.JWT_REFRESH_SECRET = "acid-test-refresh-only";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar JWT antes de cargar servicios.
const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AuthService } = require("@/modules/auth/auth.service") as typeof import("@/modules/auth/auth.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AuthRepository } = require("@/modules/auth/auth.repository") as typeof import("@/modules/auth/auth.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PasswordResetRepository } = require("@/modules/auth/password-reset.repository") as typeof import("@/modules/auth/password-reset.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PatientService } = require("@/modules/patients/patient.service") as typeof import("@/modules/patients/patient.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AuditService } = require("@/modules/audit/audit.service") as typeof import("@/modules/audit/audit.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CatalogAdminService } = require("@/modules/service-catalog/catalog-admin.service") as typeof import("@/modules/service-catalog/catalog-admin.service");

const registration = () => ({ email: `${randomUUID()}@example.test`, password: "AcidTest2026!", firstName: "Prueba", lastName: "ACID", dni: String(randomInt(10000000, 99999999)), phone: "987654321" });

test("PostgreSQL real: atomicidad, concurrencia y auditoría", async (context) => {
  try {
    await context.test("si falla la sesión no queda una cuenta parcialmente creada", async (t) => {
      const input = registration();
      t.mock.method(AuthRepository.prototype, "createRefreshToken", async () => { throw new Error("Fallo de sesión simulado"); });
      await assert.rejects(new AuthService().register(input), /Fallo de sesión/);
      assert.equal(await prisma.user.count({ where: { email: input.email } }), 0);
    });

    await context.test("altas simultáneas reciben códigos diferentes", async () => {
      const results = await Promise.all(Array.from({ length: 6 }, () => new AuthService().register(registration())));
      const users = await prisma.user.findMany({ where: { id: { in: results.map((r) => r.user.id) } } });
      assert.equal(new Set(users.map((u) => u.patientCode)).size, 6);
    });

    const input = registration();
    const registered = await new AuthService().register(input);
    const userId = registered.user.id;

    await context.test("un refresh leído simultáneamente solo puede rotar una vez", async (t) => {
      const original = AuthRepository.prototype.findRefreshTokenByHash;
      let readers = 0;
      let release!: () => void;
      const barrier = new Promise<void>((done) => { release = done; });
      t.mock.method(AuthRepository.prototype, "findRefreshTokenByHash", async function (this: InstanceType<typeof AuthRepository>, hash: string) {
        const value = await original.call(this, hash);
        if (++readers === 2) release();
        await barrier;
        return value;
      });
      const outcomes = await Promise.allSettled([new AuthService().refresh(registered.refreshToken), new AuthService().refresh(registered.refreshToken)]);
      assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(await prisma.refreshToken.count({ where: { userId, revokedAt: null } }), 1);
    });

    await context.test("token de contraseña de un solo uso incluso con concurrencia", async () => {
      const token = await prisma.passwordResetToken.create({ data: { userId, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
      const repository = new PasswordResetRepository();
      const outcomes = await Promise.allSettled([repository.reset(token.id, userId, "hash-one"), repository.reset(token.id, userId, "hash-two")]);
      assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
      assert.ok((await repository.find(token.tokenHash))!.usedAt);
      assert.equal(await prisma.refreshToken.count({ where: { userId, revokedAt: null } }), 0);
    });

    await context.test("un fallo posterior al consumo revierte el token", async () => {
      const token = await prisma.passwordResetToken.create({ data: { userId, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
      const repository = new PasswordResetRepository();
      await assert.rejects(repository.reset(token.id, userId, null as unknown as string));
      assert.equal((await repository.find(token.tokenHash))!.usedAt, null);
    });

    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    await context.test("solicitudes simultáneas dejan solo un enlace de recuperación vigente", async () => {
      const repository = new PasswordResetRepository();
      const expiresAt = new Date(Date.now() + 60000);
      await Promise.all([repository.issue(userId, randomUUID(), expiresAt), repository.issue(userId, randomUUID(), expiresAt)]);
      assert.equal(await prisma.passwordResetToken.count({ where: { userId, usedAt: null } }), 1);
      const surviving = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId, usedAt: null } });
      const foreign = await prisma.passwordResetToken.create({ data: { userId: admin.id, tokenHash: randomUUID(), expiresAt } });
      await assert.rejects(repository.issue(userId, foreign.tokenHash, expiresAt));
      assert.ok(await repository.find(surviving.tokenHash), "Si falla el nuevo token se conserva el anterior");
    });

    await context.test("paciente: un fallo de auditoría revierte alta, edición y estado", async (t) => {
      t.mock.method(AuditService.prototype, "log", async () => { throw new Error("Fallo auditoría"); });
      const service = new PatientService();
      const contact = registration();
      await assert.rejects(service.create(contact, admin.id), /Fallo auditoría/);
      assert.equal(await prisma.user.count({ where: { email: contact.email } }), 0);
      await assert.rejects(service.update(userId, { firstName: "NoGuardar", auditReason: "Prueba de rollback de auditoría" }, admin.id), /Fallo auditoría/);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).firstName, input.firstName);
      await assert.rejects(service.setActive(userId, false, "Prueba de rollback", admin.id), /Fallo auditoría/);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).isActive, true);
    });

    await context.test("catálogo: no queda una especialidad sin su auditoría", async (t) => {
      t.mock.method(AuditService.prototype, "log", async () => { throw new Error("Fallo auditoría"); });
      const name = `ACID-${randomUUID()}`;
      await assert.rejects(new CatalogAdminService().saveSpecialty({ name, description: "Prueba de atomicidad" }, admin.id), /Fallo auditoría/);
      assert.equal(await prisma.specialty.count({ where: { name } }), 0);
    });
  } finally { await prisma.$disconnect(); }
});
