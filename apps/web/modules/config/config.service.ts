import { ClinicService } from "../clinic/clinic.service";
import { DentalUnitService } from "../dental-units/dental-unit.service";
import { EmailTemplateService } from "../email-templates/email-template.service";
import { SystemSettingService } from "../system-settings/system-setting.service";

const clinicService = new ClinicService();
const dentalUnitService = new DentalUnitService();
const emailTemplateService = new EmailTemplateService();
const systemSettingService = new SystemSettingService();

export class ConfigService {
  async getFullConfig() {
    const [clinic, dentalUnits, emailTemplates, settings] = await Promise.all([
      clinicService.get(),
      dentalUnitService.getAll(),
      emailTemplateService.getAll(),
      systemSettingService.getAll(),
    ]);
    return { clinic, dentalUnits, emailTemplates, settings };
  }

  async getGeneralConfig() {
    const [clinic, dentalUnits] = await Promise.all([
      clinicService.get(),
      dentalUnitService.getStats(),
    ]);
    return { clinic, dentalUnits };
  }

  async updateClinic(data: unknown) {
    return clinicService.update(data);
  }

  async getDentalUnits(type?: string, status?: string) {
    return dentalUnitService.getAll(type, status);
  }

  async createDentalUnit(data: unknown) {
    return dentalUnitService.create(data);
  }

  async updateDentalUnit(id: string, data: unknown) {
    return dentalUnitService.update(id, data);
  }

  async deleteDentalUnit(id: string) {
    return dentalUnitService.delete(id);
  }

  async getEmailTemplates() {
    return emailTemplateService.getAll();
  }

  async createEmailTemplate(data: unknown) {
    return emailTemplateService.create(data);
  }

  async updateEmailTemplate(id: string, data: unknown) {
    return emailTemplateService.update(id, data);
  }

  async toggleEmailTemplate(id: string) {
    return emailTemplateService.toggleActive(id);
  }

  async deleteEmailTemplate(id: string) {
    return emailTemplateService.delete(id);
  }

  async getSecuritySettings() {
    return systemSettingService.getSecuritySettings();
  }

  async getJwtSettings() {
    return systemSettingService.getJwtSettings();
  }

  async getNotificationSettings() {
    return systemSettingService.getNotificationSettings();
  }

  async updateSetting(data: unknown) {
    return systemSettingService.update(data);
  }

  async bulkUpdateSettings(data: unknown) {
    return systemSettingService.bulkUpdate(data);
  }
}
