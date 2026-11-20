import { ReminderRepository } from "./reminder.repository";
import { EmailOutboxService } from "./email-outbox.service";

export class ReminderService {
  constructor(private readonly repository = new ReminderRepository(), private readonly outbox = new EmailOutboxService()) {}
  async run() {
    const run = await this.repository.start();
    try {
      const scheduled = await this.repository.schedule();
      const result = await this.outbox.drain(undefined, 20);
      await this.repository.finish(run.id, result.failed === 0, result.processed, result.failed);
      return { scheduled, ...result };
    } catch (error) {
      await this.repository.finish(run.id, false, 0, 1);
      throw error;
    }
  }
}
