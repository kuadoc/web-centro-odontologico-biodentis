import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { StorageService } from "@/modules/storage/storage.service";
import { ValidationError } from "@/lib/errors";

/** Prueba manual de fases 1/2; no lee ni escribe perfiles en la base de datos. */
async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  if (!args.length || args[0] === "--help") {
    console.log("Crear: pnpm --filter web storage:probar -- <archivo> [--propietario <UUID>]");
    console.log("Borrar las dos versiones: pnpm --filter web storage:probar -- --eliminar <clave>");
    return;
  }
  const storage = new StorageService();
  if (args[0] === "--eliminar") {
    await storage.eliminarImagen(args[1]);
    console.log("Imagen y thumbnail eliminados.");
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
  console.log(JSON.stringify({ ...result, fotoUrl: `/api/uploads/${result.key}`, fotoThumbUrl: `/api/uploads/${result.thumbKey}` }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar la prueba");
  process.exitCode = 1;
});
