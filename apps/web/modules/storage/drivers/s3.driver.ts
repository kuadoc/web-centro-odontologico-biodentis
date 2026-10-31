import { InfrastructureError } from "@/lib/errors";
import type { StorageDriver } from "./storage.driver";

/**
 * Punto de extensión S3/R2. Implementar el contrato con PutObject/GetObject/
 * DeleteObject y endpoint configurable; usar creación condicional para no
 * sobrescribir claves. No contiene credenciales ni simula almacenamiento local.
 */
export class S3StorageDriver implements StorageDriver {
  async guardar(): Promise<void> {
    throw new InfrastructureError("El almacenamiento S3/R2 todavía no está implementado");
  }

  async leer(): Promise<Uint8Array> {
    throw new InfrastructureError("El almacenamiento S3/R2 todavía no está implementado");
  }

  async eliminar(): Promise<void> {
    throw new InfrastructureError("El almacenamiento S3/R2 todavía no está implementado");
  }
}
