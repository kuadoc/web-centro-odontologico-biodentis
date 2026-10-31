import { lstat, mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { ImagenStorageClaveSchema } from "@biodentis/shared-validators";
import { InfrastructureError, NotFoundError, ValidationError } from "@/lib/errors";
import type { StorageDriver } from "./storage.driver";

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export class LocalStorageDriver implements StorageDriver {
  readonly baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = path.resolve(baseDirectory);
  }

  /** Defensa adicional al schema: nunca resolver una clave fuera de uploads/. */
  private resolver(clave: string): string {
    if (clave.includes("..") || clave.includes("\\")) {
      throw new ValidationError("La ruta de la imagen no es válida");
    }
    const archivo = path.resolve(this.baseDirectory, clave);
    if (!archivo.startsWith(this.baseDirectory + path.sep)) {
      throw new ValidationError("La imagen debe estar dentro de uploads");
    }
    ImagenStorageClaveSchema.parse(clave);
    return archivo;
  }

  private async verificarDirectorio(directorio: string): Promise<void> {
    const stat = await lstat(directorio);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new ValidationError("No se permiten enlaces en el almacenamiento de imágenes");
    }
  }

  private async prepararCarpeta(archivo: string): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true, mode: 0o700 });
    await this.verificarDirectorio(this.baseDirectory);
    let directorio = this.baseDirectory;
    const partes = path.relative(this.baseDirectory, path.dirname(archivo)).split(path.sep);
    for (const parte of partes) {
      directorio = path.join(directorio, parte);
      try { await mkdir(directorio, { mode: 0o700 }); }
      catch (error) { if (!hasCode(error, "EEXIST")) throw error; }
      await this.verificarDirectorio(directorio);
    }
  }

  private async verificarArchivo(archivo: string): Promise<boolean> {
    try {
      await this.verificarDirectorio(this.baseDirectory);
      let directorio = this.baseDirectory;
      for (const parte of path.relative(this.baseDirectory, path.dirname(archivo)).split(path.sep)) {
        directorio = path.join(directorio, parte);
        await this.verificarDirectorio(directorio);
      }
      const stat = await lstat(archivo);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new ValidationError("No se permiten enlaces ni directorios como imagen");
      }
      const [baseReal, archivoReal] = await Promise.all([realpath(this.baseDirectory), realpath(archivo)]);
      if (!archivoReal.startsWith(baseReal + path.sep)) {
        throw new ValidationError("La imagen está fuera del almacenamiento permitido");
      }
      return true;
    } catch (error) {
      if (hasCode(error, "ENOENT") || hasCode(error, "ENOTDIR")) return false;
      throw error;
    }
  }

  async guardar(clave: string, contenido: Uint8Array): Promise<void> {
    const archivo = this.resolver(clave);
    try {
      await this.prepararCarpeta(archivo);
      // wx evita sobrescribir un UUID existente o seguir un enlace en el destino.
      const handle = await open(archivo, "wx", 0o600);
      try {
        await handle.writeFile(contenido);
      } catch (error) {
        await handle.close();
        await unlink(archivo);
        throw error;
      }
      await handle.close();
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new InfrastructureError("No se pudo guardar la imagen en disco");
    }
  }

  async leer(clave: string): Promise<Uint8Array> {
    const archivo = this.resolver(clave);
    try {
      if (!(await this.verificarArchivo(archivo))) throw new NotFoundError("Imagen no encontrada");
      return await readFile(archivo);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      if (hasCode(error, "ENOENT")) throw new NotFoundError("Imagen no encontrada");
      throw new InfrastructureError("No se pudo leer la imagen");
    }
  }

  async eliminar(clave: string): Promise<void> {
    const archivo = this.resolver(clave);
    try {
      if (await this.verificarArchivo(archivo)) await unlink(archivo);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      if (hasCode(error, "ENOENT")) return;
      throw new InfrastructureError("No se pudo eliminar la imagen");
    }
  }
}
