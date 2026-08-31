export class DomainError extends Error {
  constructor(message: string, public code: string = "DOMAIN_ERROR") {
    super(message);
    this.name = "DomainError";
  }
}
