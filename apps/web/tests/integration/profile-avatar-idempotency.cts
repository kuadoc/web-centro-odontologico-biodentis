import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";
import { NotFoundError } from "@/lib/errors";

test("avatar: concurrencia y reintentos reutilizan la imagen confirmada en PostgreSQL", {
  skip: process.env.E2E_PROFILE_AVATAR_DATABASE !== "1",
}, async (context) => {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/postgres");
  process.env.STORAGE_DRIVER = "local";
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar tras validar el destino local y fijar el driver.
  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProfileService } = require("@/modules/profile/profile.service") as typeof import("@/modules/profile/profile.service");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProfileRepository } = require("@/modules/profile/profile.repository") as typeof import("@/modules/profile/profile.repository");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { UserService } = require("@/modules/users/user.service") as typeof import("@/modules/users/user.service");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StorageRepository } = require("@/modules/storage/storage.repository") as typeof import("@/modules/storage/storage.repository");
  // Almacenamiento simulado: nunca escribe en Supabase ni en uploads/.
  const files = new Map<string, Uint8Array>();
  let writes = 0;
  context.mock.method(StorageRepository.prototype, "guardar", async (key: string, bytes: Uint8Array) => {
    writes++;
    files.set(key, Uint8Array.from(bytes));
  });
  context.mock.method(StorageRepository.prototype, "leer", async (key: string) => {
    const value = files.get(key);
    if (!value) throw new NotFoundError();
    return value;
  });
  context.mock.method(StorageRepository.prototype, "eliminar", async (key: string) => { files.delete(key); });
  const id = randomUUID();
  let dentistUserId: string | undefined;
  try {
    await prisma.user.create({ data: {
      id, email: `${id}@example.test`, firstName: "Prueba", lastName: "Avatar",
      role: "PATIENT", passwordHash: "not-a-login-credential",
    } });
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "red" } }).png().toBuffer();
    const avatarUrl = `data:image/png;base64,${png.toString("base64")}`;

    await context.test("dos instancias simultáneas guardan un solo avatar", async () => {
      const [first, second] = await Promise.all([
        new ProfileService().updateMyProfile(id, { avatarUrl, phone: "987654321" }),
        new ProfileService().updateMyProfile(id, { avatarUrl, phone: "987654321" }),
      ]);
      assert.equal(first.avatarUrl, second.avatarUrl);
      assert.equal(writes, 1);
      assert.equal(files.size, 1);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).avatarUrl, first.avatarUrl);
    });
    await context.test("reintento tras respuesta perdida y edición administrativa reutilizan el avatar", async () => {
      const before = (await prisma.user.findUniqueOrThrow({ where: { id } })).avatarUrl;
      const retry = await new ProfileService().updateMyProfile(id, { avatarUrl });
      assert.equal(retry.avatarUrl, before);
      const admin = await new UserService().update(id, { avatarUrl });
      assert.equal(admin.avatarUrl, before);
      assert.equal(writes, 1);
    });
    await context.test("un fallo al reutilizar el avatar no elimina la imagen existente", async (child) => {
      const originalFiles = [...files.keys()].sort();
      child.mock.method(ProfileRepository.prototype, "updateUser", async () => { throw new Error("Simulated DB failure"); });
      await assert.rejects(new ProfileService().updateMyProfile(id, { avatarUrl }), /Simulated DB failure/);
      assert.equal(writes, 1);
      assert.deepEqual([...files.keys()].sort(), originalFiles);
    });
    await context.test("fallo de BD conserva el avatar confirmado y limpia solo la nueva imagen", async (child) => {
      const before = (await prisma.user.findUniqueOrThrow({ where: { id } })).avatarUrl;
      const originalFiles = [...files.keys()].sort();
      child.mock.method(ProfileRepository.prototype, "updateUser", async () => { throw new Error("Simulated DB failure"); });
      const blue = await sharp({ create: { width: 64, height: 64, channels: 3, background: "blue" } }).png().toBuffer();
      await assert.rejects(new ProfileService().updateMyProfile(id, {
        avatarUrl: `data:image/png;base64,${blue.toString("base64")}`,
      }), /Simulated DB failure/);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).avatarUrl, before);
      assert.deepEqual([...files.keys()].sort(), originalFiles);
    });
    await context.test("guardar contacto sin foto y quitar foto no suben archivos", async () => {
      const before = writes;
      await new ProfileService().updateMyProfile(id, { phone: "987654322" });
      const removed = await new ProfileService().updateMyProfile(id, { avatarUrl: null });
      assert.equal(removed.avatarUrl, null);
      assert.equal(writes, before);
    });
    await context.test("crear odontólogo adjunta un único archivo externo y lo publica en el directorio", async () => {
      const before = writes;
      const user = await new UserService().create({
        role: "DENTIST", firstName: "Prueba", lastName: "Retrato externo",
        email: `${randomUUID()}@example.test`, password: randomUUID(),
        avatarUrl, specialty: "General",
      });
      dentistUserId = user.id;
      assert.equal(writes - before, 1);
      assert.match(user.avatarUrl!, /^\/api\/uploads\/odontologos\/[0-9a-f-]+\.webp$/);
      assert.equal(user.avatarUrl!.startsWith("data:"), false);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DentistRepository } = require("@/modules/dentists/dentist.repository") as typeof import("@/modules/dentists/dentist.repository");
      const dentist = await prisma.dentist.findUniqueOrThrow({ where: { userId: user.id } });
      const publicProfile = (await new DentistRepository().findPublicProfiles()).find((profile) => profile.id === dentist.id);
      assert.equal(publicProfile?.user.avatarUrl, user.avatarUrl);
      assert.ok(files.has(user.avatarUrl!.slice("/api/uploads/".length)));
      assert.equal([...files.keys()].some((key) => key.endsWith("-thumb.webp")), false);
    });
  } finally {
    if (dentistUserId) {
      await prisma.dentist.deleteMany({ where: { userId: dentistUserId } });
      await prisma.user.deleteMany({ where: { id: dentistUserId } });
    }
    await prisma.user.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
});
