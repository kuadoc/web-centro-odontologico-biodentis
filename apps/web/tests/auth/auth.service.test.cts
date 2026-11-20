import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import { AuthenticationError, DomainError, NotFoundError } from "@/lib/errors";

// Fixtures locales: configurar JWT y sustituir Prisma antes de cargar el servicio.
process.env.JWT_ACCESS_SECRET = "auth-refactor-access-test-secret";
process.env.JWT_REFRESH_SECRET = "auth-refactor-refresh-test-secret";
const unmocked = async () => { throw new Error("Operación de BD sin simular"); };
const prisma = {
  user: { findUnique: unmocked, findFirst: unmocked, create: unmocked },
  refreshToken: { findUnique: unmocked, create: unmocked, update: unmocked, updateMany: unmocked },
  $transaction: unmocked,
  $queryRaw: unmocked,
};
(globalThis as unknown as { prisma: unknown }).prisma = prisma;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de inyectar BD y secretos de prueba.
const { AuthService } = require("@/modules/auth/auth.service") as typeof import("@/modules/auth/auth.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- JWT debe leer los secretos de fixtures.
const { generateRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken } = require("@/lib/auth") as typeof import("@/lib/auth");

type User = {
  id: string; email: string; firstName: string; lastName: string;
  role: string; isActive: boolean; passwordHash: string;
};
type Session = {
  jti: string; tokenHash: string; userId: string; expiresAt: Date;
  revokedAt: Date | null; replacedByToken?: string;
};
const credentials = { email: "patient@example.test", password: "valid-password" };
const registration = { ...credentials, firstName: "Ana", lastName: "Pérez", dni: "01234567", phone: "999888777" };

function setup(context: TestContext) {
  context.mock.timers.enable({ apis: ["Date"], now: new Date("2030-01-07T15:00:00Z") });
  const state = {
    user: { id: "patient-id", ...registration, role: "PATIENT", isActive: true, passwordHash: "hashed-password" } as User | null,
    sessions: [] as Session[],
    events: [] as string[],
  };
  const findUser = context.mock.method(prisma.user, "findUnique", async ({ where }: { where: { patientCode?: string } }) => {
    state.events.push(where.patientCode ? "patient-code" : "find-user");
    return where.patientCode ? null : state.user;
  });
  context.mock.method(prisma.user, "findFirst", async (query?: { where?: { email?: unknown } }) => {
    if (query?.where?.email) return state.user;
    state.events.push("last-patient-code");
    return { patientCode: "#PAC-0007" };
  });
  const createUser = context.mock.method(prisma.user, "create", async ({ data }: { data: Omit<User, "id" | "isActive"> }) => {
    state.events.push("create-user");
    state.user = { id: "patient-id", isActive: true, ...data };
    return state.user;
  });
  const findToken = context.mock.method(prisma.refreshToken, "findUnique", async ({ where }: { where: { tokenHash: string } }) => {
    state.events.push("find-token");
    return state.sessions.find((session) => session.tokenHash === where.tokenHash) ?? null;
  });
  const createToken = context.mock.method(prisma.refreshToken, "create", async ({ data }: { data: Omit<Session, "revokedAt"> }) => {
    state.events.push("create-token");
    const session = { ...data, revokedAt: null };
    state.sessions.push(session);
    return session;
  });
  const updateToken = context.mock.method(prisma.refreshToken, "update", async ({ where, data }: { where: { tokenHash: string }; data: Partial<Session> }) => {
    state.events.push("update-token");
    const session = state.sessions.find((entry) => entry.tokenHash === where.tokenHash);
    assert.ok(session);
    Object.assign(session, data);
    return session;
  });
  const revoke = context.mock.method(prisma.refreshToken, "updateMany", async ({ where, data }: { where: { userId?: string; tokenHash?: string; revokedAt: null }; data: { revokedAt: Date } }) => {
    state.events.push("revoke");
    let count = 0;
    for (const session of state.sessions) {
      if ((!where.userId || where.userId === session.userId) && (!where.tokenHash || where.tokenHash === session.tokenHash) && session.revokedAt === null) {
        session.revokedAt = data.revokedAt;
        count++;
      }
    }
    return { count };
  });
  context.mock.method(prisma, "$queryRaw", async () => {
    state.events.push("patient-sequence");
    return [{ value: 8n }];
  });
  const transaction = context.mock.method(prisma, "$transaction", async (operations: Promise<unknown>[] | ((tx: typeof prisma) => Promise<unknown>)) => {
    state.events.push("transaction");
    if (typeof operations === "function") {
      const snapshot = structuredClone({ user: state.user, sessions: state.sessions });
      try { return await operations(prisma); }
      catch (error) { state.user = snapshot.user; state.sessions = snapshot.sessions; throw error; }
    }
    return Promise.all(operations);
  });
  const hash = context.mock.method(bcrypt, "hash", async () => "hashed-password");
  const compare = context.mock.method(bcrypt, "compare", async () => true);
  return { service: new AuthService(), state, findUser, findToken, createUser, createToken, updateToken, revoke, transaction, hash, compare };
}

function assertSession(result: { accessToken: string; refreshToken: string }, stored: Session) {
  const refresh = verifyRefreshToken(result.refreshToken);
  const access = verifyAccessToken(result.accessToken);
  assert.equal(access.sub, "patient-id");
  assert.equal(refresh.sub, access.sub);
  assert.equal(access.sid, refresh.jti);
  assert.equal(stored.jti, refresh.jti);
  assert.equal(stored.tokenHash, hashToken(result.refreshToken));
  assert.equal(stored.userId, access.sub);
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7);
  assert.deepEqual(stored.expiresAt, expiration);
  assert.notEqual(stored.tokenHash, result.refreshToken);
}

test("AUTH-01 | registro: fija PATIENT, genera código y devuelve usuario público y sesión", async (context) => {
  const { service, state, createUser, hash } = setup(context);
  state.user = null;
  const result = await service.register({ ...registration, role: "ADMIN" });
  assert.deepEqual(result.user, { id: "patient-id", email: registration.email, firstName: "Ana", lastName: "Pérez", role: "PATIENT" });
  assert.deepEqual(createUser.mock.calls[0]?.arguments, [{ data: {
    email: registration.email, passwordHash: "hashed-password", role: "PATIENT", patientCode: "#PAC-0008",
    firstName: "Ana", lastName: "Pérez", dni: registration.dni, phone: registration.phone,
  } }]);
  assert.deepEqual(hash.mock.calls[0]?.arguments, [registration.password, 12]);
  assert.deepEqual(state.events, ["find-user", "transaction", "patient-sequence", "patient-code", "create-user", "create-token"]);
  assert.equal(state.sessions.length, 1);
  assertSession(result, state.sessions[0]!);
});

for (const dni of [undefined, null, "", "1234567", "123456789", "ABCDEFGH", 12345678]) {
  test(`registro: DNI ${JSON.stringify(dni)} se rechaza antes de consultar BD`, async (context) => {
    const { service, state, createUser, hash } = setup(context);
    await assert.rejects(service.register({ ...registration, dni }), ZodError);
    assert.deepEqual(state.events, []);
    assert.equal(createUser.mock.callCount(), 0);
    assert.equal(hash.mock.callCount(), 0);
  });
}

test("registro: normaliza el DNI y conserva sus ceros iniciales al persistir", async (context) => {
  const { service, state, createUser } = setup(context);
  state.user = null;
  await service.register({ ...registration, dni: " 01234567 " });
  const args = createUser.mock.calls[0]!.arguments[0] as { data: { dni: string } };
  assert.equal(args.data.dni, "01234567");
});

test("AUTH-02 | registro: email duplicado conserva conflicto 409 sin escrituras", async (context) => {
  const { service, state, hash } = setup(context);
  await assert.rejects(service.register(registration), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.equal(error.message, "El email ya está registrado");
    return true;
  });
  assert.deepEqual(state.events, ["find-user"]);
  assert.equal(hash.mock.callCount(), 0);
});

for (const method of ["register", "login"] as const) {
  test(`AUTH-03 | ${method}: valida antes de consultar BD`, async (context) => {
    const { service, state } = setup(context);
    await assert.rejects(service[method]({ email: "invalid", password: "short" }), ZodError);
    assert.deepEqual(state.events, []);
  });
}

test("AUTH-04 | login: conserva respuesta pública, contraseña comparada y sesión de siete días", async (context) => {
  const { service, state, compare } = setup(context);
  const result = await service.login(credentials);
  assert.deepEqual(result.user, { id: "patient-id", email: registration.email, firstName: "Ana", lastName: "Pérez", role: "PATIENT" });
  assert.deepEqual(compare.mock.calls[0]?.arguments, [credentials.password, "hashed-password"]);
  assert.deepEqual(state.events, ["find-user", "create-token"]);
  assert.equal(state.sessions.length, 1);
  assertSession(result, state.sessions[0]!);
});

for (const reason of ["missing", "inactive", "password"] as const) {
  test(`AUTH-05 | login rechazado (${reason}): conserva error y no crea sesión`, async (context) => {
    const { service, state, compare } = setup(context);
    if (reason === "missing") state.user = null;
    if (reason === "inactive") state.user!.isActive = false;
    if (reason === "password") compare.mock.mockImplementation(async () => false);
    await assert.rejects(service.login(credentials), {
      name: AuthenticationError.name,
      message: reason === "inactive" ? "Cuenta desactivada. Contacte al administrador." : "Credenciales inválidas",
    });
    assert.deepEqual(state.events, ["find-user"]);
    assert.equal(compare.mock.callCount(), reason === "password" ? 1 : 0);
  });
}

test("AUTH-06 | renovación: revoca el anterior y crea su reemplazo en la misma transacción", async (context) => {
  const { service, state, transaction, updateToken, createToken } = setup(context);
  const first = await service.login(credentials);
  state.events.length = 0;
  const result = await service.refresh(first.refreshToken);
  assert.deepEqual(Object.keys(result).sort(), ["accessToken", "refreshToken"]);
  assertSession(result, state.sessions[1]!);
  assert.deepEqual(state.sessions[0]!.revokedAt, new Date());
  assert.equal(state.sessions[0]!.replacedByToken, verifyRefreshToken(result.refreshToken).jti);
  assert.deepEqual(state.events, ["find-token", "find-user", "update-token", "create-token", "transaction"]);
  assert.deepEqual(transaction.mock.calls[0]?.arguments, [[
    updateToken.mock.calls[0]!.result, createToken.mock.calls[1]!.result,
  ]]);
});

test("AUTH-07 | firma inválida: rechaza antes de consultar BD", async (context) => {
  const { service, state } = setup(context);
  await assert.rejects(service.refresh("invalid-token"), { name: "JsonWebTokenError" });
  assert.deepEqual(state.events, []);
});

const refreshErrors = [
  ["missing-token", "Refresh token inválido"],
  ["expired", "Refresh token expirado"],
  ["owner", "Refresh token no pertenece a este usuario"],
  ["missing-user", "Usuario no encontrado"],
  ["inactive", "Cuenta desactivada"],
] as const;
for (const [reason, message] of refreshErrors) {
  test(`AUTH-08 | renovación rechazada (${reason}): no rota ni escribe`, async (context) => {
    const { service, state, transaction } = setup(context);
    const first = await service.login(credentials);
    if (reason === "missing-token") state.sessions.length = 0;
    if (reason === "expired") state.sessions[0]!.expiresAt = new Date(Date.now() - 1);
    if (reason === "owner") state.sessions[0]!.userId = "other-user";
    if (reason === "missing-user") state.user = null;
    if (reason === "inactive") state.user!.isActive = false;
    state.events.length = 0;
    await assert.rejects(service.refresh(first.refreshToken), {
      name: reason === "missing-user" ? NotFoundError.name : AuthenticationError.name, message,
    });
    assert.deepEqual(state.events, reason === "missing-user" || reason === "inactive" ? ["find-token", "find-user"] : ["find-token"]);
    assert.equal(transaction.mock.callCount(), 0);
  });
}

test("AUTH-09 | reutilización: revoca todas las sesiones del usuario antes de rechazar", async (context) => {
  const { service, state, revoke } = setup(context);
  const first = await service.login(credentials);
  await service.login(credentials);
  state.sessions[0]!.revokedAt = new Date(Date.now() - 1000);
  const previousRevocation = state.sessions[0]!.revokedAt;
  state.sessions.push({ ...state.sessions[1]!, userId: "other-user", tokenHash: "other-hash" });
  state.events.length = 0;
  await assert.rejects(service.refresh(first.refreshToken), {
    name: AuthenticationError.name, message: "Refresh token revocado — sesión cerrada por seguridad",
  });
  assert.deepEqual(state.events, ["find-token", "revoke"]);
  assert.deepEqual(revoke.mock.calls[0]?.arguments, [{ where: { userId: "patient-id", revokedAt: null }, data: { revokedAt: new Date() } }]);
  assert.deepEqual(state.sessions[0]!.revokedAt, previousRevocation);
  assert.deepEqual(state.sessions[1]!.revokedAt, new Date());
  assert.equal(state.sessions[2]!.revokedAt, null);
});

test("AUTH-10 | logout: solo revoca el token indicado y es idempotente", async (context) => {
  const { service, state, revoke } = setup(context);
  const first = await service.login(credentials);
  await service.login(credentials);
  assert.equal(await service.logout(first.refreshToken), undefined);
  const firstRevocation = state.sessions[0]!.revokedAt;
  assert.equal(await service.logout(first.refreshToken), undefined);
  assert.deepEqual(state.sessions[0]!.revokedAt, firstRevocation);
  assert.equal(state.sessions[1]!.revokedAt, null);
  assert.deepEqual(revoke.mock.calls[0]?.arguments, [{ where: { tokenHash: hashToken(first.refreshToken), revokedAt: null }, data: { revokedAt: new Date() } }]);
  assert.equal(await service.logout("unknown-token"), undefined);
});

test("AUTH-11 | revocación global: conserva filtro, alcance y retorno vacío", async (context) => {
  const { service, state } = setup(context);
  await service.login(credentials);
  await service.login(credentials);
  state.sessions.push({ ...state.sessions[0]!, userId: "other-user" });
  assert.equal(await service.revokeAllUserTokens("patient-id"), undefined);
  assert.deepEqual(state.sessions.slice(0, 2).map((entry) => entry.revokedAt), [new Date(), new Date()]);
  assert.equal(state.sessions[2]!.revokedAt, null);
});

for (const stage of ["read", "write", "transaction"] as const) {
  test(`AUTH-12 | fallo de infraestructura (${stage}): propaga el mismo error`, async (context) => {
    const { service, state, findUser, createToken, transaction } = setup(context);
    const failure = new Error("BD no disponible (fixture)");
    if (stage === "transaction") {
      const first = await service.login(credentials);
      transaction.mock.mockImplementation(async () => { throw failure; });
      await assert.rejects(service.refresh(first.refreshToken), (error) => error === failure);
    } else {
      const operation = stage === "read" ? findUser : createToken;
      operation.mock.mockImplementation(async () => { throw failure; });
      await assert.rejects(service.login(credentials), (error) => error === failure);
      assert.equal(state.sessions.length, 0);
    }
  });
}

test("AUTH-13 | renovación: acepta expiración de BD exactamente igual a ahora", async (context) => {
  const { service, state } = setup(context);
  const first = await service.login(credentials);
  state.sessions[0]!.expiresAt = new Date();
  const result = await service.refresh(first.refreshToken);
  assertSession(result, state.sessions[1]!);
});

test("AUTH-14 | token firmado sin registro persistido: rechaza la renovación", async (context) => {
  const { service, state } = setup(context);
  await assert.rejects(service.refresh(generateRefreshToken("patient-id").token), {
    name: AuthenticationError.name, message: "Refresh token inválido",
  });
  assert.deepEqual(state.events, ["find-token"]);
});
