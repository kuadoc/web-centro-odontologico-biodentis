import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRegistrationPhone } from "@/lib/registration-form";
import { CreateUserSchema } from "@biodentis/shared-validators";

test("registro: pegar un número peruano conserva los nueve dígitos locales", () => {
  for (const input of ["987654321", "987 654 321", "+51 987 654 321", "51987654321", "+51 (987) 654-321"]) {
    assert.equal(normalizeRegistrationPhone(input), "987654321", input);
  }
  assert.equal(normalizeRegistrationPhone(""), "");
});

test("registro: una longitud inválida no se trunca a un teléfono aparentemente válido", () => {
  for (const input of ["9876543210", "519876543210", "98765", "5198765432"]) {
    const result = normalizeRegistrationPhone(input);
    assert.equal(result, input);
    assert.equal(/^[0-9]{9}$/.test(result), false);
  }
});

test("alta administrativa: no hereda la obligatoriedad de DNI del registro público", () => {
  const parsed = CreateUserSchema.parse({
    email: "admin@example.test", password: "test-password",
    firstName: "Ana", lastName: "Pérez", role: "ADMIN",
  });
  assert.equal(parsed.dni, undefined);
});
