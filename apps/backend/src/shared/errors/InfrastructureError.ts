export class InfrastructureError extends Error {
  constructor(message = "Error interno del servidor") {
    super(message);
    this.name = "InfrastructureError";
  }
}
