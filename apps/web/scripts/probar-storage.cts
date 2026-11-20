import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { StorageService } from "@/modules/storage/storage.service";
import { ValidationError } from "@/lib/errors";

/** Prueba manual de fases 1/2; no lee ni escribe perfiles en la base de datos. */
async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  if (!args.length || args[0] === "--help") {
    console.log("Crear: pnpm --filter web storage:probar -- <archivo> [--propietario <UUID>]");
    console.log("Borrar una imagen: pnpm --filter web storage:probar -- --eliminar <clave>");
    console.log("Verificar conexión (sube, lee y elimina una imagen de prueba): pnpm --filter web storage:probar -- --verificar");
    return;
  }
  const storage = new StorageService();
  if (args[0] === "--verificar") {
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#24857a" } }).png().toBuffer();
    const result = await storage.guardarImagen(new File([Uint8Array.from(bytes)], "prueba.png"), "odontologos");
    try {
      for (const key of [result.key]) {
        const image = await storage.leerImagen(key);
        const metadata = await sharp(image.contenido).metadata();
        assert.equal(metadata.format, "webp");
        assert.equal(metadata.width, 32);
        assert.equal(metadata.height, 32);
      }
      console.log("Subida y lectura de una imagen optimizada verificadas.");
    } finally {
      await storage.eliminarImagen(result.key);
    }
    console.log("Archivos de prueba eliminados; no se modificaron perfiles ni la base de datos.");
    return;
  }
  if (args[0] === "--eliminar") {
    await storage.eliminarImagen(args[1]);
    console.log("Imagen eliminada, incluida su miniatura antigua si existía.");
    return;
  }
  const archivo = path.resolve(args[0]!);
  const info = await stat(archivo);
  if (!info.isFile() || info.size > 5 * 1024 * 1024) throw new ValidationError("Usa un archivo de imagen de hasta 5 MB");
  const ownerIndex = args.indexOf("--propietario");
  if (ownerIndex !== -1 && !args[ownerIndex + 1]) throw new ValidationError("Indica el UUID del propietario");
  const carpeta = ownerIndex === -1 ? "odontologos" : `avatares/${args[ownerIndex + 1]}`;
  const file = new File([Uint8Array.from(await readFile(archivo))], path.basename(archivo));
  const result = await storage.guardarImagen(file, carpeta);
  console.log(JSON.stringify({ ...result, fotoUrl: `/api/uploads/${result.key}` }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar la prueba");
  process.exitCode = 1;
});
