import { SystemSettingRepository } from "./system-setting.repository";
import { UpdateSystemSettingSchema, BulkUpdateSettingsSchema } from "@biodentis/shared-validators";
import type { SettingType } from "@biodentis/shared-types";

const systemSettingRepository = new SystemSettingRepository();

const DEFAULT_SETTINGS = [
  { key: "password_min_length", value: "8" },
  { key: "password_require_uppercase", value: "true" },
  { key: "password_require_numbers", value: "true" },
  { key: "password_require_special", value: "true" },
  { key: "jwt_access_minutes", value: "15" },
  { key: "jwt_refresh_days", value: "7" },
  { key: "reminder_hours_before", value: "3" },
  { key: "reminder_channels", value: "email,whatsapp" },
];

export class SystemSettingService {
  async getAll() {
    let settings = await systemSettingRepository.findAll();
    if (settings.length === 0) {
      await this.seedDefaults();
      settings = await systemSettingRepository.findAll();
    }
    return settings;
  }

  async getByKey(key: string) {
    return systemSettingRepository.findByKey(key);
  }

  async getSecuritySettings() {
    const keys = ["password_min_length", "password_require_uppercase", "password_require_numbers", "password_require_special"];
    return systemSettingRepository.findByKeys(keys);
  }

  async getJwtSettings() {
    const keys = ["jwt_access_minutes", "jwt_refresh_days"];
    return systemSettingRepository.findByKeys(keys);
  }

  async getNotificationSettings() {
    const keys = ["reminder_hours_before", "reminder_channels"];
    return systemSettingRepository.findByKeys(keys);
  }

  async getValue(key: string): Promise<string | null> {
    const setting = await systemSettingRepository.findByKey(key);
    return setting?.value ?? null;
  }

  async update(data: unknown) {
    const parsed = UpdateSystemSettingSchema.parse(data);
    return systemSettingRepository.upsert(parsed.key, parsed.value, parsed.type as SettingType);
  }

  async bulkUpdate(data: unknown) {
    const parsed = BulkUpdateSettingsSchema.parse(data);
    return systemSettingRepository.bulkUpsert(parsed.settings);
  }

  async seedDefaults() {
    return systemSettingRepository.bulkUpsert(DEFAULT_SETTINGS);
  }

  async delete(key: string) {
    return systemSettingRepository.delete(key);
  }
}
