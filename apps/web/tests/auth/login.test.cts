import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthenticationError } from "@/lib/errors";
import { LoginThrottleService } from "@/modules/auth/login-throttle.service";
import { LoginThrottleRepository } from "@/modules/auth/login-throttle.repository";

function request(email: string, ip?: string) {
  return new NextRequest("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", ...(ip ? { "x-forwarded-for": ip } : {}) }, body: JSON.stringify({ email, password: "valid-password" }) });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Se prueba el handler con almacenamiento inyectado.
const { POST } = require("@/app/api/auth/login/route") as typeof import("@/app/api/auth/login/route");

test("login: cinco fallos de otra cuenta no bloquean una contraseña válida en la misma IP", async (context) => {
  context.mock.method(LoginThrottleService.prototype, "admit", async () => ({ blocked: false, retryAfter: 60 }));
  context.mock.method(LoginThrottleService.prototype, "failed", async () => ({ blocked: true, retryAfter: 900 }));
  const clear = context.mock.method(LoginThrottleService.prototype, "clear", async () => 1);
  context.mock.method(AuthService.prototype, "login", async (data: unknown) => {
    const email = (data as { email: string }).email;
    if (email.startsWith("wrong")) throw new AuthenticationError("Credenciales inválidas");
    return { user: { id: "test", email, role: "PATIENT", firstName: "Ana", lastName: "Demo" }, accessToken: "access", refreshToken: "refresh" };
  });
  for (let index = 0; index < 5; index++) assert.equal((await POST(request("wrong@example.test", "127.0.0.1"))).status, 429);
  assert.equal((await POST(request("new-user@example.test", "127.0.0.1"))).status, 200);
  assert.equal(clear.mock.callCount(), 1);
});

test("login: registro, salida y reingresos válidos no acumulan fallos; funciona sin IP", async (context) => {
  context.mock.method(LoginThrottleService.prototype, "admit", async () => ({ blocked: false, retryAfter: 60 }));
  const failed = context.mock.method(LoginThrottleService.prototype, "failed", async () => { throw new Error("No debe contar un acceso correcto"); });
  context.mock.method(LoginThrottleService.prototype, "clear", async () => 1);
  context.mock.method(AuthService.prototype, "login", async () => ({ user: { id: "test", email: "user@example.test", role: "PATIENT", firstName: "Ana", lastName: "Demo" }, accessToken: "access", refreshToken: "refresh" }));
  for (let index = 0; index < 8; index++) {
    const response = await POST(request("user@example.test"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
  }
  assert.equal(failed.mock.callCount(), 0);
});

test("login: rechaza volumen abusivo antes de consultar contraseñas e informa Retry-After", async (context) => {
  context.mock.method(LoginThrottleService.prototype, "admit", async () => ({ blocked: true, retryAfter: 30 }));
  const login = context.mock.method(AuthService.prototype, "login", async () => { throw new Error("No debe autenticar"); });
  const response = await POST(request("user@example.test", "127.0.0.1"));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "30");
  assert.equal(login.mock.callCount(), 0);
});

test("login: los fallos internos no incrementan errores de contraseña", async (context) => {
  context.mock.method(console, "error", () => {});
  context.mock.method(LoginThrottleService.prototype, "admit", async () => ({ blocked: false, retryAfter: 60 }));
  context.mock.method(AuthService.prototype, "login", async () => { throw new Error("Infraestructura"); });
  const failed = context.mock.method(LoginThrottleService.prototype, "failed", async () => ({ blocked: true, retryAfter: 900 }));
  assert.equal((await POST(request("user@example.test"))).status, 500);
  assert.equal(failed.mock.callCount(), 0);
});

test("contadores: faltas de IP se separan por correo; claves no contienen datos personales", async (context) => {
  const keys: string[] = [];
  context.mock.method(LoginThrottleRepository.prototype, "increment", async (key: string) => { keys.push(key); return { count: 1, expiresAt: new Date(Date.now() + 900000) }; });
  const service = new LoginThrottleService();
  const email = `${randomUUID()}@example.test`;
  await service.admit(email, null);
  await service.admit("other@example.test", null);
  await service.failed(email, "127.0.0.1");
  assert.notEqual(keys[0], keys[1]);
  assert.ok(keys.every((key) => !key.includes("@") && !key.includes("127.0.0.1")));
});
