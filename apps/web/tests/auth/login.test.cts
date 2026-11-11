import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthenticationError } from "@/lib/errors";
import { clearFailedAttempts, isAccountLocked, recordFailedAttempt } from "@/lib/login-attempts";

// Evitar los temporizadores de limpieza al cargar la ruta; no se conecta a la BD.
const interval = mock.method(globalThis, "setInterval", () => undefined);
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de interceptar los temporizadores.
const { POST } = require("@/app/api/auth/login/route") as typeof import("@/app/api/auth/login/route");
interval.mock.restore();

const WINDOW = 15 * 60 * 1000;
const address = () => `${randomUUID()}@example.test`;
function request(email: string, ip: string) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email, password: "incorrect-password" }),
  });
}

test("cuenta: los primeros cuatro fallos no bloquean; el quinto bloquea 15 minutos", (context) => {
  let now = 1_000_000;
  context.mock.method(Date, "now", () => now);
  context.mock.method(console, "warn", () => {});
  const email = address();
  for (let attempt = 1; attempt <= 4; attempt++) {
    assert.equal(recordFailedAttempt(email, "test", "invalid_credentials"), false);
    assert.deepEqual(isAccountLocked(email), { locked: false, remainingMs: 0 });
    now += 1000;
  }
  assert.equal(recordFailedAttempt(email, "test", "invalid_credentials"), true);
  assert.deepEqual(isAccountLocked(email.toUpperCase()), { locked: true, remainingMs: WINDOW });
  now += WINDOW;
  assert.deepEqual(isAccountLocked(email), { locked: false, remainingMs: 0 });
  assert.equal(recordFailedAttempt(email, "test", "invalid_credentials"), false);
});

test("cuenta: los fallos caducan y una autenticación correcta puede limpiar el contador", (context) => {
  let now = 1_000_000;
  context.mock.method(Date, "now", () => now);
  context.mock.method(console, "warn", () => {});
  const email = address();
  for (let attempt = 0; attempt < 4; attempt++) recordFailedAttempt(email, "test", "invalid_credentials");
  now += WINDOW;
  assert.equal(recordFailedAttempt(email, "test", "invalid_credentials"), false);
  clearFailedAttempts(email.toUpperCase());
  assert.deepEqual(isAccountLocked(email), { locked: false, remainingMs: 0 });
});

test("login: cinco fallos por IP impiden autenticar otra cuenta hasta que expire la ventana", async (context) => {
  let now = 1_000_000;
  context.mock.method(Date, "now", () => now);
  context.mock.method(console, "warn", () => {});
  const login = context.mock.method(AuthService.prototype, "login", async () => { throw new AuthenticationError("Credenciales inválidas"); });
  const ip = randomUUID();
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await POST(request(address(), ip))).status, 401);
  assert.equal((await POST(request(address(), ip))).status, 429);
  assert.equal(login.mock.callCount(), 5);
  now += WINDOW;
  assert.equal((await POST(request(address(), ip))).status, 401);
  assert.equal(login.mock.callCount(), 6);
});

test("login: el bloqueo por correo persiste al cambiar de IP y vence a los 15 minutos", async (context) => {
  let now = 1_000_000;
  context.mock.method(Date, "now", () => now);
  context.mock.method(console, "warn", () => {});
  const login = context.mock.method(AuthService.prototype, "login", async () => { throw new AuthenticationError("Credenciales inválidas"); });
  const email = address();
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await POST(request(email, randomUUID()))).status, 401);
  const blocked = await POST(request(email.toUpperCase(), randomUUID()));
  assert.equal(blocked.status, 423);
  assert.match((await blocked.json()).error, /bloqueada temporalmente/);
  assert.equal(login.mock.callCount(), 5);
  now += WINDOW;
  assert.equal((await POST(request(email, randomUUID()))).status, 401);
});

test("login: un acceso correcto limpia los fallos y entrega el token y cookie", async (context) => {
  context.mock.method(console, "warn", () => {});
  const email = address();
  const ip = randomUUID();
  let valid = false;
  context.mock.method(AuthService.prototype, "login", async () => {
    if (!valid) throw new AuthenticationError("Credenciales inválidas");
    return { user: { id: "test", email, role: "PATIENT", firstName: "Test", lastName: "Test" }, accessToken: "access-fixture", refreshToken: "refresh-fixture" };
  });
  for (let attempt = 0; attempt < 4; attempt++) assert.equal((await POST(request(email, ip))).status, 401);
  valid = true;
  const response = await POST(request(email, ip));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).accessToken, "access-fixture");
  assert.match(response.headers.get("set-cookie") ?? "", /refresh_token=refresh-fixture.*HttpOnly/i);
  assert.deepEqual(isAccountLocked(email), { locked: false, remainingMs: 0 });
  valid = false;
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await POST(request(email, ip))).status, 401);
});

test("login: un fallo interno no se registra como contraseña incorrecta", async (context) => {
  context.mock.method(console, "error", () => {});
  const warnings = context.mock.method(console, "warn", () => {});
  const email = address();
  const ip = randomUUID();
  context.mock.method(AuthService.prototype, "login", async () => { throw new Error("Infraestructura no disponible"); });
  for (let attempt = 0; attempt < 6; attempt++) assert.equal((await POST(request(email, ip))).status, 500);
  assert.equal(warnings.mock.callCount(), 0);
  assert.deepEqual(isAccountLocked(email), { locked: false, remainingMs: 0 });
});
