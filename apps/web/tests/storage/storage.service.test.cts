import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { LocalStorageDriver } from "@/modules/storage/drivers/local.driver";
import { S3StorageDriver } from "@/modules/storage/drivers/s3.driver";
import { StorageRepository } from "@/modules/storage/storage.repository";
import { StorageService } from "@/modules/storage/storage.service";
import { InfrastructureError, NotFoundError, ValidationError } from "@/lib/errors";
import { crearStorageDriver } from "@/modules/storage/storage.config";
import { jpegWithGpsAndOrientation, temporaryDirectory } from "./helpers.cts";

function asFile(bytes: Uint8Array, name = "foto.png", type = "image/png"): File {
  return new File([Uint8Array.from(bytes)], name, { type });
}

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: { r: 40, g: 80, b: 120, alpha: 0.5 } } }).png().toBuffer();
}

test("odontólogo: WebP hasta 1600px, thumbnail hasta 300px y claves aleatorias", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  // El nombre y MIME declarados no determinan el formato real.
  const result = await service.guardarImagen(asFile(await png(3200, 1600), "../../archivo.exe", "text/html"), "odontologos");
  assert.match(result.key, /^odontologos\/[0-9a-f-]{36}\.webp$/);
  assert.equal(result.thumbKey, result.key.replace(".webp", "-thumb.webp"));
  assert.deepEqual([result.width, result.height, result.thumbWidth, result.thumbHeight], [1600, 800, 300, 150]);
  const main = await sharp(Buffer.from(await driver.leer(result.key))).metadata();
  const thumb = await sharp(Buffer.from(await driver.leer(result.thumbKey))).metadata();
  assert.equal(main.format, "webp"); assert.equal(thumb.format, "webp");
  assert.equal(main.hasAlpha, true);
  assert.equal(result.bytes, (await driver.leer(result.key)).byteLength);
  const second = await service.guardarImagen(asFile(await png(32, 16)), "odontologos");
  assert.notEqual(second.key, result.key);
});

test("avatar: límite de 512px; las imágenes pequeñas no se amplían", async (context) => {
  const directory = await temporaryDirectory(context);
  const service = new StorageService(new StorageRepository(new LocalStorageDriver(directory)));
  const owner = randomUUID();
  const result = await service.guardarImagen(asFile(await png(700, 1400)), `avatares/${owner}`);
  assert.ok(result.key.startsWith(`avatares/${owner}/`));
  assert.deepEqual([result.width, result.height, result.thumbWidth, result.thumbHeight], [256, 512, 150, 300]);
  const small = await service.guardarImagen(asFile(await png(64, 32)), "odontologos");
  assert.deepEqual([small.width, small.height, small.thumbWidth, small.thumbHeight], [64, 32, 64, 32]);
});

test("aplica orientación EXIF y elimina EXIF/GPS y demás metadatos en ambas versiones", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  const jpeg = await sharp(await png(400, 800)).jpeg().toBuffer();
  const input = jpegWithGpsAndOrientation(jpeg);
  const original = await sharp(input).metadata();
  assert.equal(original.orientation, 6);
  assert.ok(original.exif && original.exif.length >= 90, "El fixture contiene orientación y el IFD GPS");
  const result = await service.guardarImagen(asFile(input, "foto.jpeg", "image/jpeg"), "odontologos");
  assert.deepEqual([result.width, result.height, result.thumbWidth, result.thumbHeight], [800, 400, 300, 150]);
  for (const key of [result.key, result.thumbKey]) {
    const metadata = await sharp(Buffer.from(await driver.leer(key))).metadata();
    assert.equal(metadata.orientation, undefined);
    assert.equal(metadata.exif, undefined); assert.equal(metadata.xmp, undefined);
    assert.equal(metadata.iptc, undefined); assert.equal(metadata.icc, undefined);
  }
});

test("acepta WebP real como entrada", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  const webp = await sharp(await png(100, 50)).webp().toBuffer();
  const result = await service.guardarImagen(asFile(webp, "foto.webp", "image/webp"), "odontologos");
  assert.equal((await sharp(Buffer.from(await driver.leer(result.key))).metadata()).format, "webp");
});

test("rechaza archivos vacíos, mayores de 5MB, falsos JPEG, SVG y datos corruptos sin escribir", async (context) => {
  const directory = await temporaryDirectory(context);
  const service = new StorageService(new StorageRepository(new LocalStorageDriver(directory)));
  const invalid = [Buffer.alloc(0), Buffer.alloc(5 * 1024 * 1024 + 1), Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), Buffer.from("<html>no es una foto</html>"), Buffer.from("GIF89a"), Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3])];
  for (const bytes of invalid) {
    await assert.rejects(service.guardarImagen(asFile(bytes, "foto.jpg", "image/jpeg"), "odontologos"));
  }
  await assert.rejects(service.guardarImagen("data:image/jpeg;base64,YWJj", "odontologos"));
  assert.deepEqual(await readdir(directory), []);
});

test("eliminarImagen borra ambas versiones y es idempotente", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  const image = await service.guardarImagen(asFile(await png(80, 80)), "odontologos");
  await service.eliminarImagen(image.thumbKey);
  await assert.rejects(driver.leer(image.key), NotFoundError);
  await assert.rejects(driver.leer(image.thumbKey), NotFoundError);
  await service.eliminarImagen(image.key);
});

test("si falla el thumbnail, limpia el archivo grande que acaba de crear", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  let writtenKey = "";
  const repository = new StorageRepository({
    async guardar(key, bytes) {
      if (key.endsWith("-thumb.webp")) throw new InfrastructureError("Fallo de escritura simulado");
      writtenKey = key; await driver.guardar(key, bytes);
    },
    leer: (key) => driver.leer(key), eliminar: (key) => driver.eliminar(key),
  });
  await assert.rejects(new StorageService(repository).guardarImagen(asFile(await png(10, 10)), "odontologos"), InfrastructureError);
  assert.ok(writtenKey);
  await assert.rejects(driver.leer(writtenKey), NotFoundError);
});

test("el driver nunca sobrescribe una clave existente", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const key = `odontologos/${randomUUID()}.webp`;
  await driver.guardar(key, Buffer.from("original"));
  await assert.rejects(driver.guardar(key, Buffer.from("reemplazo")), InfrastructureError);
  assert.equal(Buffer.from(await driver.leer(key)).toString(), "original");
});

test("el driver bloquea traversal, prefijos parecidos, rutas absolutas y carpetas no permitidas", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  for (const key of ["../secret.webp", "odontologos/../../secret.webp", "..\\secret.webp", "C:\\Windows\\secret.webp", "/etc/passwd", "\\\\server\\share", `${directory}-otro/foto.webp`, "public/foto.webp", `avatares/${randomUUID()}.webp`]) {
    await assert.rejects(driver.leer(key));
    await assert.rejects(driver.guardar(key, Buffer.from("no")));
    await assert.rejects(driver.eliminar(key));
  }
  assert.deepEqual(await readdir(directory), []);
});

test("bloquea enlaces de directorio que salgan de uploads", async (context) => {
  const directory = await temporaryDirectory(context);
  const outside = await temporaryDirectory(context);
  const filename = `${randomUUID()}.webp`;
  const outsideFile = path.join(outside, filename);
  await writeFile(outsideFile, "no tocar");
  try { await symlink(outside, path.join(directory, "odontologos"), process.platform === "win32" ? "junction" : "dir"); }
  catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "EPERM" || error.code === "ENOSYS")) {
      context.skip("El sistema no permite crear enlaces para esta prueba"); return;
    }
    throw error;
  }
  const driver = new LocalStorageDriver(directory);
  await assert.rejects(driver.leer(`odontologos/${filename}`), ValidationError);
  await assert.rejects(driver.guardar(`odontologos/${filename}`, Buffer.from("cambio")), ValidationError);
  await assert.rejects(driver.eliminar(`odontologos/${filename}`), ValidationError);
  assert.equal(await readFile(outsideFile, "utf8"), "no tocar");
});

test("no sirve un archivo que no sea WebP aunque tenga extensión webp", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const key = `odontologos/${randomUUID()}.webp`;
  await mkdir(path.join(directory, "odontologos"));
  await writeFile(path.join(directory, key), "<html>contenido incorrecto</html>");
  await assert.rejects(new StorageService(new StorageRepository(driver)).leerImagen(key), NotFoundError);
});

test("S3/R2 es un esqueleto explícito y no cae silenciosamente a disco", async (context) => {
  const previous = process.env.STORAGE_DRIVER;
  context.after(() => { if (previous === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = previous; });
  process.env.STORAGE_DRIVER = "s3";
  const driver = crearStorageDriver();
  assert.ok(driver instanceof S3StorageDriver);
  await assert.rejects(driver.guardar("odontologos/fixture.webp", new Uint8Array()), InfrastructureError);
  await assert.rejects(driver.leer("odontologos/fixture.webp"), InfrastructureError);
  await assert.rejects(driver.eliminar("odontologos/fixture.webp"), InfrastructureError);
  process.env.STORAGE_DRIVER = "otro";
  assert.throws(() => crearStorageDriver(), InfrastructureError);
});
