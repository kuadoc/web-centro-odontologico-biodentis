import assert from "node:assert/strict";
import { test } from "node:test";
import { ClinicRepository } from "@/modules/clinic/clinic.repository";
import { ClinicService } from "@/modules/clinic/clinic.service";
import { UpdateClinicSchema } from "@biodentis/shared-validators";

const original = {
  id: "clinic-id", name: "BIODENTIS", address: "Dirección anterior",
  phone: "954 917 425", email: "contacto@example.com", generalHours: null,
  rut: "dato-administrativo", website: null, logoUrl: null,
};

test("guarda el formulario institucional con sitio web y correo opcionales vacíos", async (context) => {
  const repository = new ClinicRepository();
  context.mock.method(repository, "findFirst", async () => original);
  const update = context.mock.method(repository, "update", async (_id: string, data: unknown) => data);
  const form = {
    name: "Biodentis Lima Centro", address: "Av. Larco 123, Miraflores",
    phone: "954917425", email: "", rut: "", website: "",
  };
  await new ClinicService(repository).update(form);
  assert.deepEqual(update.mock.calls[0]?.arguments, [original.id, form]);
});

test("normaliza espacios, permite limpiar los opcionales y conserva los campos omitidos", () => {
  assert.deepEqual(UpdateClinicSchema.parse({ website: "   ", email: "   " }), { website: "", email: "" });
  assert.deepEqual(UpdateClinicSchema.parse({ website: " https://biodentis.com ", email: " sede@example.com " }), {
    website: "https://biodentis.com", email: "sede@example.com",
  });
  assert.deepEqual(UpdateClinicSchema.parse({ name: "Otra sede" }), { name: "Otra sede" });
});

test("sigue rechazando sitios web y correos mal escritos con mensajes en español", () => {
  for (const [field, value, message] of [
    ["website", "biodentis", "Ingresa una URL válida"],
    ["email", "correo-invalido", "Ingresa un correo electrónico válido"],
  ] as const) {
    const result = UpdateClinicSchema.safeParse({ [field]: value });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.issues[0]?.path[0], field);
      assert.ok(result.error.issues[0]?.message.includes(message));
    }
  }
});

test("la lectura pública refleja lo guardado sin conservar datos anteriores", async (context) => {
  let stored = { ...original };
  const repository = new ClinicRepository();
  context.mock.method(repository, "findFirst", async () => ({ ...stored }));
  context.mock.method(repository, "update", async (_id: string, data: { name?: string; address?: string }) => {
    stored = { ...stored, ...data };
    return stored;
  });
  const service = new ClinicService(repository);
  assert.equal((await service.getPublic()).address, original.address);
  await service.update({ name: "Biodentis Lima Centro", address: "Av. Larco 123, Miraflores" });
  const published = await service.getPublic();
  assert.equal(published.name, "Biodentis Lima Centro");
  assert.equal(published.address, "Av. Larco 123, Miraflores");
  assert.equal(new URL(published.maps).searchParams.get("query"), published.address);
  assert.equal("rut" in published, false);
  assert.equal("id" in published, false);
  assert.equal("generalHours" in published, false);
});

test("teléfono y enlaces públicos utilizan el contacto institucional guardado", async (context) => {
  const repository = new ClinicRepository();
  context.mock.method(repository, "findFirst", async () => ({ ...original, phone: "+51 999 888 777", email: "sede@example.com" }));
  const published = await new ClinicService(repository).getPublic();
  assert.equal(published.email, "sede@example.com");
  assert.equal(published.phoneHref, "tel:+51999888777");
  assert.equal(published.whatsapp, "https://wa.me/51999888777");
});

test("los campos vacíos no recuperan direcciones ni contactos hardcodeados", async (context) => {
  const repository = new ClinicRepository();
  context.mock.method(repository, "findFirst", async () => ({ ...original, phone: null, email: null, address: null }));
  const published = await new ClinicService(repository).getPublic();
  for (const key of ["phone", "email", "address", "phoneHref", "whatsapp", "maps"] as const) {
    assert.equal(published[key], "");
  }
});

test("un error de persistencia se propaga y no se presenta como un guardado exitoso", async (context) => {
  const repository = new ClinicRepository();
  context.mock.method(repository, "findFirst", async () => original);
  const failure = new Error("Fallo simulado");
  context.mock.method(repository, "update", async () => { throw failure; });
  await assert.rejects(new ClinicService(repository).update({ name: "Nuevo nombre" }), (error) => error === failure);
});
