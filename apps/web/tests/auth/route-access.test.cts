import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { Role } from "@biodentis/shared-types";
import { canAccessRoute, getDefaultRoute, isProtectedPath } from "@/lib/route-access";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { PageSessionRepository } from "@/modules/auth/page-session.repository";

process.env.JWT_REFRESH_SECRET = "route-access-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar el secreto antes de cargar auth.
const { PageSessionService } = require("@/modules/auth/page-session.service") as typeof import("@/modules/auth/page-session.service");

const expectedRoutes: Record<Role, string[]> = {
  ADMIN: ["/dashboard", "/appointments", "/patients", "/dentists", "/clinical-records", "/users", "/config", "/profile", "/reports/reassignments"],
  RECEPTIONIST: ["/dashboard", "/appointments", "/patients", "/profile"],
  DENTIST: ["/dashboard", "/appointments", "/patients", "/clinical-records", "/profile"],
  PATIENT: ["/appointments", "/clinical-records", "/profile"],
};

for (const role of Object.values(Role)) {
  test(`rutas y subrutas autorizadas para ${role}`, () => {
    for (const route of expectedRoutes.ADMIN) {
      const expected = expectedRoutes[role].includes(route);
      assert.equal(canAccessRoute(role, route), expected, route);
      assert.equal(canAccessRoute(role, `${route}/detalle`), expected, `${route}/detalle`);
    }
    assert.equal(canAccessRoute(role, "/users-other"), false);
    assert.equal(canAccessRoute(role, "//external.test/users"), false);
    assert.equal(canAccessRoute(role, "/unknown"), false);
    assert.equal(canAccessRoute(role, getDefaultRoute(role)), true);
  });
}

test("sin identidad no hay acceso; profile también requiere sesión", () => {
  assert.equal(canAccessRoute(undefined, "/users"), false);
  assert.equal(isProtectedPath("/profile"), true);
  assert.equal(isProtectedPath("/patients/123"), true);
  assert.equal(isProtectedPath("/login"), false);
  assert.equal(isProtectedPath("/api/users"), false);
});

const token = (options: jwt.SignOptions = {}) => jwt.sign(
  { sub: "user-id", jti: "session-id" }, process.env.JWT_REFRESH_SECRET!,
  { expiresIn: "1h", ...options },
);

function storedSession(role: Role = Role.PATIENT) {
  return {
    userId: "user-id", jti: "session-id", revokedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 3_600_000),
    user: { id: "user-id", role, isActive: true },
  };
}

test("PACIENTE no puede autorizar /users ni /users/create; ADMIN sí", async (context) => {
  let session = storedSession();
  context.mock.method(PageSessionRepository.prototype, "findByTokenHash", async () => session);
  const service = new PageSessionService();
  await assert.rejects(service.authorize(token(), "/users"), AuthorizationError);
  await assert.rejects(service.authorize(token(), "/users/create"), AuthorizationError);
  session = storedSession(Role.ADMIN);
  assert.deepEqual(await service.authorize(token(), "/users"), { id: "user-id", role: Role.ADMIN });
  // Un cambio de rol se aplica al siguiente acceso, sin esperar a que venza el JWT.
  session = storedSession(Role.PATIENT);
  await assert.rejects(service.authorize(token(), "/users"), AuthorizationError);
});

test("cookie ausente, inventada, con firma inválida o JWT expirado no autoriza", async (context) => {
  const lookup = context.mock.method(PageSessionRepository.prototype, "findByTokenHash", async () => storedSession());
  const service = new PageSessionService();
  for (const invalid of [undefined, "fake-cookie", jwt.sign({ sub: "user-id" }, "wrong-secret"), token({ expiresIn: -1 })]) {
    await assert.rejects(service.authorize(invalid, "/appointments"), AuthenticationError);
  }
  assert.equal(lookup.mock.callCount(), 0);
});

test("sesiones inexistentes, revocadas, vencidas o con cuenta desactivada no autorizan", async (context) => {
  const active = storedSession();
  let session: ReturnType<typeof storedSession> | null = null;
  context.mock.method(PageSessionRepository.prototype, "findByTokenHash", async () => session);
  const service = new PageSessionService();
  for (const invalid of [
    null,
    { ...active, revokedAt: new Date() },
    { ...active, expiresAt: new Date(0) },
    { ...active, userId: "other-user" },
    { ...active, jti: "other-session" },
    { ...active, user: { ...active.user, isActive: false } },
  ]) {
    session = invalid;
    await assert.rejects(service.authorize(token(), "/appointments"), AuthenticationError);
  }
});

test("un error de base de datos se propaga sin permitir el acceso", async (context) => {
  const failure = new Error("Database unavailable");
  context.mock.method(PageSessionRepository.prototype, "findByTokenHash", async () => { throw failure; });
  await assert.rejects(new PageSessionService().authorize(token(), "/appointments"), failure);
});
