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

  /** Persiste la ruta en BD solo después de guardar; compensa si falla la BD. */
  async conFotoPerfil<T>(
    valor: string | null | undefined, propietario: string, publica: boolean,
    persistir: (url: string | null | undefined) => Promise<T>,
    actual?: string | null,
  ): Promise<T> {
    if (valor?.startsWith("/api/uploads/")) {
      const clave = ImagenStorageClaveSchema.parse(valor.slice("/api/uploads/".length));
      if (clave.startsWith("avatares/") && (publica || clave.split("/")[1] !== propietario)) {
        throw new AuthorizationError("La imagen no pertenece a este perfil");
      }
    }
    if (!valor?.startsWith("data:")) return persistir(valor);
    const bytes = Buffer.from(valor.slice(valor.indexOf(",") + 1), "base64");
    const carpeta = publica ? "odontologos" : `avatares/${propietario}`;
    const preparada = await this.prepararImagen(new File([Uint8Array.from(bytes)], "perfil"), carpeta);
    // El llamador bloquea la fila del usuario hasta persistir. Un reintento,
    // incluso desde otra instancia, reutiliza la imagen ya confirmada en BD.
    if (actual?.startsWith(`/api/uploads/${carpeta}/`)) {
      const clave = ImagenStorageClaveSchema.parse(actual.slice("/api/uploads/".length));
      let existente: Uint8Array | undefined;
      try {
        existente = await this.repository.leer(clave);
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
      }
      if (existente && preparada.imagen.data.equals(Buffer.from(existente))) return persistir(actual);
    }
    const imagen = await this.guardarPreparada(preparada);
    try { return await persistir(`/api/uploads/${imagen.key}`); }
    catch (error) {
      await this.eliminarImagen(imagen.key);
      throw error;
    }
  }

  /** La carpeta de destino siempre la decide un service del servidor. */
  async guardarImagen(input: unknown, carpetaInput: unknown) {
    return this.guardarPreparada(await this.prepararImagen(input, carpetaInput));
  }

  private async prepararImagen(input: unknown, carpetaInput: unknown) {
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
    let imagen;
    try {
      const pipeline = sharp(contenido, { failOn: "warning", limitInputPixels: 40_000_000 });
      const metadata = await pipeline.metadata();
      if (metadata.format !== formato || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
        throw new ValidationError("La imagen debe ser una fotografía estática válida");
      }
      // autoOrient aplica EXIF antes de que la salida elimine todos los metadatos.
      pipeline.autoOrient();
      imagen = await pipeline.resize({ width: limite, height: limite, fit: "inside", withoutEnlargement: true })
        .webp(carpeta === "odontologos" ? { lossless: true, effort: 4 } : { quality: 80 }).toBuffer({ resolveWithObject: true });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError("No se pudo procesar la imagen; revisa su formato, integridad y dimensiones");
    }

    return { carpeta, imagen };
  }

  private async guardarPreparada({ carpeta, imagen }: Awaited<ReturnType<StorageService["prepararImagen"]>>) {
    const uuid = randomUUID();
    const key = `${carpeta}/${uuid}.webp`;
    await this.repository.guardar(key, imagen.data);
    return {
      key,
      width: imagen.info.width, height: imagen.info.height, bytes: imagen.info.size,
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
