export class ScheduleConflictError extends Error {
  constructor(message = "Conflicto de horario") {
    super(message);
    this.name = "ScheduleConflictError";
  }
}
