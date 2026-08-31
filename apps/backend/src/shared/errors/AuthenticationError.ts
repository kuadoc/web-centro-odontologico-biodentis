export class AuthenticationError extends Error {
  constructor(message = "No autenticado") {
    super(message);
    this.name = "AuthenticationError";
  }
}
