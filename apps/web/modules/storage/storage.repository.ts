import { prisma } from "@/lib/prisma";
import { crearStorageDriver } from "./storage.config";
import type { StorageDriver } from "./drivers/storage.driver";

/** Persistencia del storage y consulta mínima de la identidad que pide un avatar. */
export class StorageRepository {
  constructor(private readonly driver: StorageDriver = crearStorageDriver()) {}

  guardar(clave: string, contenido: Uint8Array) { return this.driver.guardar(clave, contenido); }
  leer(clave: string) { return this.driver.leer(clave); }
  eliminar(clave: string) { return this.driver.eliminar(clave); }

  buscarActor(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
  }
}
