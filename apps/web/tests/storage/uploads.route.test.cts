import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { StorageRepository } from "@/modules/storage/storage.repository";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { LocalStorageDriver } from "@/modules/storage/drivers/local.driver";
import { temporaryDirectory } from "./helpers.cts";

// Solo firma de fixtures. Las pruebas no cargan .env ni consultan la BD.
process.env.JWT_ACCESS_SECRET = "biodentis-storage-tests-only-not-a-production-secret";
process.env.STORAGE_DRIVER = "local";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar auth después de fijar la clave de fixtures que captura al importar.
const { GET } = require("@/app/api/uploads/[...path]/route") as typeof import("@/app/api/uploads/[...path]/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Compartir el módulo auth ya inicializado con esa clave de prueba.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");

async function setup(context: TestContext) {
  context.mock.method(AccessSessionRepository.prototype, "findByJti", async (jti: string) => ({
    userId: jti, revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000),
    user: { id: jti, isActive: true, role: "PATIENT" },
  }));
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).webp().toBuffer();
  let reads = 0;
  context.mock.method(StorageRepository.prototype, "leer", async (key: string) => { reads++; return driver.leer(key); });
  return { driver, bytes, reads: () => reads };
}

function request(key: string, token?: string) {
  return new NextRequest(`http://localhost:3000/api/uploads/${key}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

function params(key: string) { return { params: Promise.resolve({ path: key.split("/") }) }; }

test("GET público: WebP, nosniff y caché inmutable de un año sin sesión", async (context) => {
  const { driver, bytes } = await setup(context);
  const key = `odontologos/${randomUUID()}.webp`;
  await driver.guardar(key, bytes);
  context.mock.method(StorageRepository.prototype, "buscarActor", () => { throw new Error("Un archivo público no consulta sesión"); });
  const response = await GET(request(key), params(key));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/webp");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=31536000, immutable");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Content-Length"), String(bytes.length));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
});

test("GET ausente devuelve 404 y no cachea el error", async (context) => {
  await setup(context);
  const key = `odontologos/${randomUUID()}.webp`;
  const response = await GET(request(key), params(key));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("GET bloquea traversal y codificaciones maliciosas antes de leer disco", async (context) => {
  const fixture = await setup(context);
  for (const key of ["odontologos/../secret.webp", "odontologos/../../secret.webp", "odontologos/%2e%2e/secret.webp", "odontologos/%252e%252e/secret.webp", "odontologos/..\\secret.webp", "C:\\Windows\\secret.webp", "/etc/passwd", "otros/archivo.webp", `odontologos/${randomUUID()}.svg`]) {
    const response = await GET(request("odontologos/invalid.webp"), params(key));
    assert.equal(response.status, 400, key);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
  assert.equal(fixture.reads(), 0);
});

test("avatar sin token o con token inválido: 401 antes de leer el archivo", async (context) => {
  const fixture = await setup(context);
  const key = `avatares/${randomUUID()}/${randomUUID()}.webp`;
  for (const token of [undefined, "token-invalido"]) {
    const response = await GET(request(key, token), params(key));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
  assert.equal(fixture.reads(), 0);
});

test("avatar privado: propietario y ADMIN activos pueden leer; otros reciben 403", async (context) => {
  const fixture = await setup(context);
  const owner = randomUUID(); const admin = randomUUID(); const other = randomUUID();
  const key = `avatares/${owner}/${randomUUID()}-thumb.webp`;
  await fixture.driver.guardar(key, fixture.bytes);
  context.mock.method(StorageRepository.prototype, "buscarActor", async (id: string) => ({ id, isActive: true, role: id === admin ? "ADMIN" : "PATIENT" }));
  for (const actor of [owner, admin]) {
    const response = await GET(request(key, generateAccessToken(actor, actor)), params(key));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("Vary"), "Authorization");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fixture.bytes);
  }
  const denied = await GET(request(key, generateAccessToken(other, other)), params(key));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("Cache-Control"), "private, no-store");
  assert.equal(fixture.reads(), 2);
});

test("un usuario desactivado o eliminado no puede leer avatares con un JWT aún vigente", async (context) => {
  const fixture = await setup(context);
  const owner = randomUUID(); const key = `avatares/${owner}/${randomUUID()}.webp`;
  const actorMock = context.mock.method(StorageRepository.prototype, "buscarActor", async () => ({ id: owner, role: "ADMIN", isActive: false }));
  const inactive = await GET(request(key, generateAccessToken(owner, owner)), params(key));
  assert.equal(inactive.status, 401);
  actorMock.mock.mockImplementation(async () => null);
  const missing = await GET(request(key, generateAccessToken(owner, owner)), params(key));
  assert.equal(missing.status, 401);
  assert.equal(fixture.reads(), 0);
});
