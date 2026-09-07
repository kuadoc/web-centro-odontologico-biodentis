import { EmailTemplateRepository } from "./email-template.repository";
import { CreateEmailTemplateSchema, UpdateEmailTemplateSchema } from "@biodentis/shared-validators";
import { NotFoundError } from "@/lib/errors";

const emailTemplateRepository = new EmailTemplateRepository();

export class EmailTemplateService {
  async getAll() {
    return emailTemplateRepository.findAll();
  }

  async getActive() {
    return emailTemplateRepository.findActive();
  }

  async getById(id: string) {
    const template = await emailTemplateRepository.findById(id);
    if (!template) throw new NotFoundError("Plantilla no encontrada");
    return template;
  }

  async getByKey(key: string) {
    const template = await emailTemplateRepository.findByKey(key);
    if (!template) throw new NotFoundError("Plantilla no encontrada");
    return template;
  }

  async create(data: unknown) {
    const parsed = CreateEmailTemplateSchema.parse(data);
    const existing = await emailTemplateRepository.findByKey(parsed.key);
    if (existing) throw new Error("Ya existe una plantilla con esa clave");
    return emailTemplateRepository.create(parsed);
  }

  async update(id: string, data: unknown) {
    await this.getById(id);
    const parsed = UpdateEmailTemplateSchema.parse(data);
    return emailTemplateRepository.update(id, parsed);
  }

  async toggleActive(id: string) {
    const template = await this.getById(id);
    return emailTemplateRepository.update(id, { isActive: !template.isActive });
  }

  async delete(id: string) {
    await this.getById(id);
    return emailTemplateRepository.delete(id);
  }

  async renderTemplate(key: string, variables: Record<string, string>) {
    const template = await this.getByKey(key);
    let body = template.body;
    let subject = template.subject;
    for (const [varKey, varValue] of Object.entries(variables)) {
      const placeholder = `{${varKey}}`;
      body = body.replaceAll(placeholder, varValue);
      subject = subject.replaceAll(placeholder, varValue);
    }
    return { subject, body };
  }
}
