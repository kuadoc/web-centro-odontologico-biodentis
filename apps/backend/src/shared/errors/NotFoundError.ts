export class NotFoundError extends Error {
  constructor(resource = "Recurso") {
    super(`${resource} no encontrado`);
    this.name = "NotFoundError";
  }
}
