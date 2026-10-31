import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "@/lib/prisma";
import { UserRepository } from "@/modules/users/user.repository";
import { UserService } from "@/modules/users/user.service";
import { DentistRepository } from "@/modules/dentists/dentist.repository";
import { AvatarSchema, CreateUserSchema, UpdateUserSchema } from "@biodentis/shared-validators";

test("validación de fotos y creación administrativa", () => {
  assert.equal(AvatarSchema.safeParse("/images/angel.jpg").success, true);
  assert.equal(AvatarSchema.safeParse("data:image/jpeg;base64,YWJj").success, true);
  for (const value of ["javascript:alert(1)", "/images/../private.jpg", "data:image/svg+xml;base64,YWJj", "x".repeat(512 * 1024 + 1)]) {
    assert.equal(AvatarSchema.safeParse(value).success, false);
  }
  assert.equal(CreateUserSchema.safeParse({ role: "DENTIST", firstName: "Ana", lastName: "Prueba", email: "ana@example.test", password: "short" }).success, false);
  assert.equal(UpdateUserSchema.safeParse({}).success, false);
});

test("crear, editar y desactivar un odontólogo se refleja en el directorio público", async () => {
  const rollback = new Error("ROLLBACK_VERIFICATION");
  const email = `landing-${randomUUID()}@example.test`;
  try {
    await assert.rejects(prisma.$transaction(async (tx) => {
      const service = new UserService(new UserRepository(tx));
      const directory = new DentistRepository(tx);
      const user = await service.create({ role: "DENTIST", firstName: "Verificación", lastName: "Landing", email, password: randomUUID(), avatarUrl: "/images/angel.jpg", specialty: "Ortodoncia", licenseNumber: "TEST-REG", university: "Universidad de prueba" });
      assert.equal("passwordHash" in user, false);

      const publicProfile = (await directory.findPublicProfiles()).find((profile) => profile.user.firstName === user.firstName && profile.user.lastName === user.lastName);
      assert.ok(publicProfile, "La creación debe crear usuario y ficha profesional juntos");
      assert.equal(publicProfile.user.avatarUrl, "/images/angel.jpg");
      assert.equal(publicProfile.specialty, "Ortodoncia");
      assert.deepEqual(Object.keys(publicProfile.user).sort(), ["avatarUrl", "firstName", "lastName"]);
      assert.deepEqual(Object.keys(publicProfile).sort(), ["id", "licenseNumber", "specialty", "university", "user"]);

      const updated = await service.update(user.id, { firstName: "Actualizado", avatarUrl: "/images/cielo.jpg", specialty: "Endodoncia", licenseNumber: null });
      assert.equal("passwordHash" in updated, false);
      const editedProfile = (await directory.findPublicProfiles()).find((profile) => profile.id === publicProfile.id);
      assert.equal(editedProfile?.user.firstName, "Actualizado");
      assert.equal(editedProfile?.user.avatarUrl, "/images/cielo.jpg");
      assert.equal(editedProfile?.specialty, "Endodoncia");
      assert.equal(editedProfile?.licenseNumber, null);

      await service.update(user.id, { avatarUrl: null });
      assert.equal((await directory.findPublicProfiles()).find((profile) => profile.id === publicProfile.id)?.user.avatarUrl, null);
      await service.update(user.id, { isActive: false });
      assert.equal((await directory.findPublicProfiles()).some((profile) => profile.id === publicProfile.id), false);
      assert.equal((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).role, "DENTIST");

      await service.update(user.id, { isActive: true, role: "RECEPTIONIST" });
      assert.equal((await directory.findPublicProfiles()).some((profile) => profile.id === publicProfile.id), false);
      throw rollback;
    }, { timeout: 20_000 }), (error) => error === rollback);
    assert.equal(await prisma.user.findUnique({ where: { email } }), null, "Las pruebas no deben dejar cuentas en la base");
  } finally {
    await prisma.$disconnect();
  }
});
