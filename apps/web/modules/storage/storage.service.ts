import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { GuardarImagenArchivoSchema, GuardarImagenCarpetaSchema, ImagenStorageClaveSchema } from "@biodentis/shared-validators";
import { AuthenticationError, AuthorizationError, InfrastructureError, NotFoundError, ValidationError } from "@/lib/errors";
import { StorageRepository } from "./storage.repository";

/** No confía en extensión ni en File.type; comprueba firma y decodificación real. */
function detectarFormato(data: Buffer): "jpeg" | "png" | "webp" | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export class StorageService {
  constructor(private readonly repository = new StorageRepository()) {}

  /** La carpeta de destino siempre la decide un service del servidor. */
  async guardarImagen(input: unknown, carpetaInput: unknown) {
    const file = GuardarImagenArchivoSchema.parse(input);
    const carpeta = GuardarImagenCarpetaSchema.parse(carpetaInput);
    const contenido = Buffer.from(await file.arrayBuffer());
    // Repetir límite sobre los bytes, además de File.size.
    if (contenido.length === 0 || contenido.length > 5 * 1024 * 1024) {
      throw new ValidationError("La imagen debe ocupar entre 1 byte y 5 MB");
    }
    const formato = detectarFormato(contenido);
    if (!formato) throw new ValidationError("Solo se permiten imágenes JPEG, PNG o WebP válidas");

    const limite = carpeta === "odontologos" ? 1600 : 512;
    let procesadas;
    try {
      const pipeline = sharp(contenido, { failOn: "warning", limitInputPixels: 40_000_000 });
      const metadata = await pipeline.metadata();
      if (metadata.format !== formato || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
        throw new ValidationError("La imagen debe ser una fotografía estática válida");
      }
      // autoOrient aplica EXIF antes de que la salida elimine todos los metadatos.
      pipeline.autoOrient();
      procesadas = await Promise.all([
        pipeline.clone().resize({ width: limite, height: limite, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true }),
        pipeline.clone().resize({ width: 300, height: 300, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer({ resolveWithObject: true }),
      ]);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError("No se pudo procesar la imagen; revisa su formato, integridad y dimensiones");
    }

    const [imagen, thumbnail] = procesadas;
    const uuid = randomUUID();
    const key = `${carpeta}/${uuid}.webp`;
    const thumbKey = `${carpeta}/${uuid}-thumb.webp`;
    await this.repository.guardar(key, imagen.data);
    try {
      await this.repository.guardar(thumbKey, thumbnail.data);
    } catch (error) {
      try { await this.repository.eliminar(key); }
      catch { throw new InfrastructureError("No se pudo completar ni limpiar el guardado de la imagen"); }
      throw error;
    }
    return {
      key, thumbKey,
      width: imagen.info.width, height: imagen.info.height, bytes: imagen.info.size,
      thumbWidth: thumbnail.info.width, thumbHeight: thumbnail.info.height, thumbBytes: thumbnail.info.size,
    };
  }

  requiereSesion(claveInput: unknown): boolean {
    return ImagenStorageClaveSchema.parse(claveInput).startsWith("avatares/");
  }

  async leerImagen(claveInput: unknown, actorId?: string) {
    const clave = ImagenStorageClaveSchema.parse(claveInput);
    const privada = clave.startsWith("avatares/");
    if (privada) {
      if (!actorId) throw new AuthenticationError();
      const actor = await this.repository.buscarActor(actorId);
      if (!actor || !actor.isActive) throw new AuthenticationError("La sesión no está activa");
      const propietario = clave.split("/")[1];
      if (actor.id !== propietario && actor.role !== "ADMIN") {
        throw new AuthorizationError("No tienes permiso para ver esta imagen");
      }
    }
    const contenido = await this.repository.leer(clave);
    if (detectarFormato(Buffer.from(contenido)) !== "webp") throw new NotFoundError("Imagen no encontrada");
    return {
      contenido,
      cacheControl: privada ? "private, no-store" : "public, max-age=31536000, immutable",
      privada,
    };
  }

  /** Elimina la imagen grande y su thumbnail; repetir la operación es seguro. */
  async eliminarImagen(claveInput: unknown): Promise<void> {
    const clave = ImagenStorageClaveSchema.parse(claveInput);
    const original = clave.replace(/-thumb\.webp$/, ".webp");
    const thumb = original.replace(/\.webp$/, "-thumb.webp");
    const resultados = await Promise.allSettled([this.repository.eliminar(original), this.repository.eliminar(thumb)]);
    if (resultados.some((resultado) => resultado.status === "rejected")) {
      throw new InfrastructureError("No se pudieron eliminar todos los archivos de la imagen");
    }
  }
}
