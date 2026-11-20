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

test("odontólogo: guarda un solo WebP hasta 1600px con clave aleatoria", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  // El nombre y MIME declarados no determinan el formato real.
  const result = await service.guardarImagen(asFile(await png(3200, 1600), "../../archivo.exe", "text/html"), "odontologos");
  assert.match(result.key, /^odontologos\/[0-9a-f-]{36}\.webp$/);
  assert.equal("thumbKey" in result, false);
  assert.deepEqual([result.width, result.height], [1600, 800]);
  const main = await sharp(Buffer.from(await driver.leer(result.key))).metadata();
  assert.equal(main.format, "webp");
  assert.deepEqual(await readdir(path.join(directory, "odontologos")), [path.basename(result.key)]);
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
  assert.deepEqual([result.width, result.height], [256, 512]);
  const small = await service.guardarImagen(asFile(await png(64, 32)), "odontologos");
  assert.deepEqual([small.width, small.height], [64, 32]);
});

test("retrato público: WebP sin pérdida conserva exactamente los píxeles sin redimensionado", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const pixels = Buffer.alloc(180 * 120 * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 47 + Math.floor(i / 19)) % 256;
  const input = await sharp(pixels, { raw: { width: 180, height: 120, channels: 3 } }).png().toBuffer();
  const image = await new StorageService(new StorageRepository(driver)).guardarImagen(asFile(input), "odontologos");
  const decoded = await sharp(Buffer.from(await driver.leer(image.key))).removeAlpha().raw().toBuffer();
  assert.deepEqual([image.width, image.height], [180, 120]);
  assert.deepEqual(decoded, pixels);
  assert.deepEqual(await readdir(path.join(directory, "odontologos")), [path.basename(image.key)]);
});

test("aplica orientación EXIF y elimina EXIF/GPS y demás metadatos", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  const jpeg = await sharp(await png(400, 800)).jpeg().toBuffer();
  const input = jpegWithGpsAndOrientation(jpeg);
  const original = await sharp(input).metadata();
  assert.equal(original.orientation, 6);
  assert.ok(original.exif && original.exif.length >= 90, "El fixture contiene orientación y el IFD GPS");
  const result = await service.guardarImagen(asFile(input, "foto.jpeg", "image/jpeg"), "odontologos");
  assert.deepEqual([result.width, result.height], [800, 400]);
  for (const key of [result.key]) {
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

test("eliminarImagen conserva compatibilidad con miniaturas antiguas y es idempotente", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  const image = await service.guardarImagen(asFile(await png(80, 80)), "odontologos");
  const thumbKey = image.key.replace(".webp", "-thumb.webp");
  await driver.guardar(thumbKey, await driver.leer(image.key));
  await service.eliminarImagen(thumbKey);
  await assert.rejects(driver.leer(image.key), NotFoundError);
  await assert.rejects(driver.leer(thumbKey), NotFoundError);
  await service.eliminarImagen(image.key);
});

test("una subida realiza una sola escritura; propaga el fallo de almacenamiento", async () => {
  let writes = 0;
  const repository = new StorageRepository({
    async guardar() { writes++; throw new InfrastructureError("Fallo de escritura simulado"); },
    async leer() { throw new NotFoundError(); }, async eliminar() {},
  });
  await assert.rejects(new StorageService(repository).guardarImagen(asFile(await png(10, 10)), "odontologos"), InfrastructureError);
  assert.equal(writes, 1);
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

test("S3 sin configuración no cae silenciosamente a disco", async (context) => {
  const previousBucket = process.env.S3_BUCKET;
  delete process.env.S3_BUCKET;
  context.after(() => { if (previousBucket === undefined) delete process.env.S3_BUCKET; else process.env.S3_BUCKET = previousBucket; });
  const previous = process.env.STORAGE_DRIVER;
  context.after(() => { if (previous === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = previous; });
  process.env.STORAGE_DRIVER = "s3";
  const driver = crearStorageDriver();
  assert.ok(driver instanceof S3StorageDriver);
  const key = `odontologos/${randomUUID()}.webp`;
  await assert.rejects(driver.guardar(key, new Uint8Array([1])), InfrastructureError);
  await assert.rejects(driver.leer(key), InfrastructureError);
  await assert.rejects(driver.eliminar(key), InfrastructureError);
  process.env.STORAGE_DRIVER = "otro";
  assert.throws(() => crearStorageDriver(), InfrastructureError);
});

test("perfil: guarda una ruta, protege propietario y limpia archivos si falla la BD", async (context) => {
  const directory = await temporaryDirectory(context);
  const driver = new LocalStorageDriver(directory);
  const service = new StorageService(new StorageRepository(driver));
  const owner = randomUUID();
  const data = `data:image/png;base64,${(await png(80, 80)).toString("base64")}`;
  const url = await service.conFotoPerfil(data, owner, false, async (value) => value);
  assert.match(url!, new RegExp(`^/api/uploads/avatares/${owner}/`));
  await assert.rejects(service.conFotoPerfil(url, randomUUID(), false, async () => null));
  await assert.rejects(service.conFotoPerfil(url, owner, true, async () => null));
  const before = await readdir(path.join(directory, "avatares", owner));
  const failure = new Error("Fallo de BD simulado");
  await assert.rejects(service.conFotoPerfil(data, owner, false, async () => { throw failure; }), failure);
  assert.deepEqual(await readdir(path.join(directory, "avatares", owner)), before);
  assert.equal(await service.conFotoPerfil(null, owner, false, async (value) => value), null);
});
