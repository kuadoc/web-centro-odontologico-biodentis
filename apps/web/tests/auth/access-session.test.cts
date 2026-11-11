import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";

process.env.JWT_ACCESS_SECRET = "access-session-test-secret";
process.env.JWT_REFRESH_SECRET = "refresh-session-test-secret";
// Prisma expone delegados dinámicos. Inyectar el cliente falso antes de importar
// los módulos permite simularlos sin conexiones ni depender de esos proxies.
const unmocked = async () => { throw new Error("Operación de base de datos sin simular"); };
const prisma = {
  user: { findUnique: unmocked, update: unmocked },
  refreshToken: { create: unmocked, findUnique: unmocked, update: unmocked, updateMany: unmocked },
  $transaction: unmocked,
};
(globalThis as unknown as { prisma: unknown }).prisma = prisma;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Inyectar BD antes de cargar repositorios.
const { AccessSessionRepository } = require("@/modules/auth/access-session.repository") as typeof import("@/modules/auth/access-session.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte la BD simulada.
const { UserRepository } = require("@/modules/users/user.repository") as typeof import("@/modules/users/user.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte la BD simulada.
const { PatientRepository } = require("@/modules/patients/patient.repository") as typeof import("@/modules/patients/patient.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte la BD simulada.
const { UserService } = require("@/modules/users/user.service") as typeof import("@/modules/users/user.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar secretos antes de cargar JWT.
const { generateAccessToken, verifyAccessToken, verifyRefreshToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte los secretos de fixtures.
const { authenticate, requireRole } = require("@/lib/middleware") as typeof import("@/lib/middleware");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte los secretos de fixtures.
const { AuthService } = require("@/modules/auth/auth.service") as typeof import("@/modules/auth/auth.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar rutas con JWT ya configurado.
const me = require("@/app/api/users/me/route") as typeof import("@/app/api/users/me/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar rutas con JWT ya configurado.
const users = require("@/app/api/users/route") as typeof import("@/app/api/users/route");

function request(token?: string) {
  return new NextRequest("http://localhost/api/users/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function fixture(context: TestContext) {
  const user = { id: "user-id", role: Role.ADMIN, isActive: true };
  const session = { userId: user.id, revokedAt: null as Date | null, expiresAt: new Date(Date.now() + 86_400_000), user };
  const lookup = context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => session);
  const token = generateAccessToken(user.id, "session-jti");
  return { user, session, lookup, token };
}

test("cada petición consulta la sesión actual; desactivar bloquea un JWT aún vigente", async (context) => {
  const { user, token, lookup } = fixture(context);
  const profile = context.mock.method(UserService.prototype, "getProfile", async () => ({ id: user.id }));
  assert.equal((await me.GET(request(token))).status, 200);
  user.isActive = false;
  assert.equal((await me.GET(request(token))).status, 401);
  assert.equal(profile.mock.callCount(), 1, "No se consulta el perfil después de desactivar");
  assert.equal(lookup.mock.callCount(), 2, "No se reutiliza una autorización en caché");
  assert.equal(verifyAccessToken(token).sub, user.id, "El JWT sigue firmado y no ha vencido");
});

test("revocar una sesión bloquea lecturas y mutaciones antes de ejecutar el servicio", async (context) => {
  const { session, token } = fixture(context);
  const create = context.mock.method(UserService.prototype, "create", async () => ({ id: "created" }));
  const profile = context.mock.method(UserService.prototype, "getProfile", async () => ({ id: "user-id" }));
  session.revokedAt = new Date();
  assert.equal((await me.GET(request(token))).status, 401);
  const mutation = new NextRequest("http://localhost/api/users", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "invalid-json",
  });
  assert.equal((await users.POST(mutation)).status, 401, "Autoriza antes de leer el body");
  assert.equal(create.mock.callCount(), 0);
  assert.equal(profile.mock.callCount(), 0);
});

test("sesiones inexistentes, vencidas o pertenecientes a otra cuenta no autorizan", async (context) => {
  const { session, lookup, token } = fixture(context);
  lookup.mock.mockImplementation(async () => null);
  await assert.rejects(authenticate(request(token)), AuthenticationError);
  lookup.mock.mockImplementation(async () => session);
  session.expiresAt = new Date(0);
  await assert.rejects(authenticate(request(token)), AuthenticationError);
  session.expiresAt = new Date(Date.now() + 86_400_000);
  session.userId = "another-user";
  await assert.rejects(authenticate(request(token)), AuthenticationError);
});

test("los permisos usan el rol actual, además de exigir una cuenta y sesión activas", async (context) => {
  const { user, token } = fixture(context);
  assert.equal((await requireRole(request(token), [Role.ADMIN])).role, Role.ADMIN);
  user.role = Role.PATIENT;
  await assert.rejects(requireRole(request(token), [Role.ADMIN]), AuthorizationError);
  user.isActive = false;
  await assert.rejects(requireRole(request(token), [Role.PATIENT]), AuthenticationError);
});

test("tokens anteriores sin sid y JWT inválidos nunca evitan la comprobación de sesión", async (context) => {
  const { lookup } = fixture(context);
  const legacy = jwt.sign({ sub: "user-id", jti: "legacy" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
  await assert.rejects(authenticate(request(legacy)), AuthenticationError);
  await assert.rejects(authenticate(request()), AuthenticationError);
  await assert.rejects(authenticate(request("invalid")));
  const expired = jwt.sign({ sub: "user-id", jti: "expired", sid: "session-jti" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -1 });
  await assert.rejects(authenticate(request(expired)));
  assert.equal(lookup.mock.callCount(), 0);
});

test("una falla de BD bloquea el acceso sin ejecutar la operación ni convertirla en 401", async (context) => {
  const { lookup, token } = fixture(context);
  context.mock.method(console, "error", () => {});
  lookup.mock.mockImplementation(async () => { throw new Error("Database unavailable"); });
  const profile = context.mock.method(UserService.prototype, "getProfile", async () => ({}));
  assert.equal((await me.GET(request(token))).status, 500);
  assert.equal(profile.mock.callCount(), 0);
});

test("login y renovación vinculan el acceso a la sesión; logout y reutilización invalidan el acceso inmediatamente", async (context) => {
  const user = { id: "user-id", email: "user@example.test", firstName: "Test", lastName: "User", role: Role.PATIENT, isActive: true, passwordHash: "hash" };
  type Stored = { jti: string; tokenHash: string; userId: string; expiresAt: Date; revokedAt: Date | null; replacedByToken?: string };
  const sessions = new Map<string, Stored>();
  context.mock.method(bcrypt, "compare", async () => true);
  context.mock.method(prisma.user, "findUnique", async () => user);
  context.mock.method(prisma.refreshToken, "create", async ({ data }: { data: Omit<Stored, "revokedAt"> }) => {
    const session = { ...data, revokedAt: null };
    sessions.set(data.jti, session);
    return session;
  });
  context.mock.method(prisma.refreshToken, "findUnique", async ({ where }: { where: { tokenHash: string } }) => [...sessions.values()].find((s) => s.tokenHash === where.tokenHash) ?? null);
  context.mock.method(prisma.refreshToken, "update", async ({ where, data }: { where: { tokenHash: string }; data: Partial<Stored> }) => {
    const session = [...sessions.values()].find((s) => s.tokenHash === where.tokenHash)!;
    Object.assign(session, data);
    return session;
  });
  context.mock.method(prisma.refreshToken, "updateMany", async ({ where, data }: { where: { userId?: string; tokenHash?: string }; data: Partial<Stored> }) => {
    let count = 0;
    for (const session of sessions.values()) {
      if ((!where.userId || session.userId === where.userId) && (!where.tokenHash || session.tokenHash === where.tokenHash) && !session.revokedAt) {
        Object.assign(session, data); count++;
      }
    }
    return { count };
  });
  context.mock.method(prisma, "$transaction", async (operations: Promise<unknown>[]) => Promise.all(operations));
  context.mock.method(AccessSessionRepository.prototype, "findByJti", async (jti: string) => {
    const session = sessions.get(jti);
    return session ? { ...session, user } : null;
  });
  const service = new AuthService();
  const credentials = { email: user.email, password: "valid-password" };
  const first = await service.login(credentials);
  assert.equal(verifyAccessToken(first.accessToken).sid, verifyRefreshToken(first.refreshToken).jti);
  await authenticate(request(first.accessToken));
  const rotated = await service.refresh(first.refreshToken);
  assert.equal(verifyAccessToken(rotated.accessToken).sid, verifyRefreshToken(rotated.refreshToken).jti);
  await assert.rejects(authenticate(request(first.accessToken)), AuthenticationError);
  await authenticate(request(rotated.accessToken));
  const another = await service.login(credentials);
  await service.logout(another.refreshToken);
  await assert.rejects(authenticate(request(another.accessToken)), AuthenticationError);
  await authenticate(request(rotated.accessToken));
  await assert.rejects(service.refresh(first.refreshToken), AuthenticationError);
  await assert.rejects(authenticate(request(rotated.accessToken)), AuthenticationError);
});

for (const Repository of [UserRepository, PatientRepository]) {
  test(`${Repository.name}: desactivar y revocar se envían en una sola escritura; reactivar no revive sesiones`, async (context) => {
    const { user, session, token } = fixture(context);
    const writes: unknown[] = [];
    context.mock.method(prisma.user, "update", async ({ data }: { data: { isActive: boolean; refreshTokens?: { updateMany: { data: { revokedAt: Date } } } } }) => {
      writes.push(data);
      user.isActive = data.isActive;
      if (data.refreshTokens) session.revokedAt = data.refreshTokens.updateMany.data.revokedAt;
      return user;
    });
    const repository = new Repository();
    await repository.update(user.id, { isActive: false });
    assert.equal(writes.length, 1);
    assert.ok(session.revokedAt instanceof Date);
    await assert.rejects(authenticate(request(token)), AuthenticationError);
    await repository.update(user.id, { isActive: true });
    await assert.rejects(authenticate(request(token)), AuthenticationError);
  });
}
