import { ZodError } from "zod";

export class ValidationError extends Error {
  public errors: Record<string, string>;

  constructor(zodError: ZodError) {
    super("Error de validación");
    this.name = "ValidationError";
    this.errors = {};
    for (const issue of zodError.issues) {
      const path = issue.path.join(".");
      this.errors[path] = issue.message;
    }
  }
}
