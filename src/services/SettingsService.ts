import SettingsRepository from '../repositories/SettingsRepository';
import {UserSettings, defaultSettings, UnitsSystem, AppLanguage} from '../models/UserSettings';
import {validateArea} from '../utils/validation';

class SettingsService {
  private cache: UserSettings | null = null;

  async getSettings(): Promise<UserSettings> {
    if (this.cache) {
      return this.cache;
    }
    const stored = await SettingsRepository.getSettings();
    if (stored) {
      this.cache = {...defaultSettings, ...stored};
      return this.cache;
    }
    await SettingsRepository.save(defaultSettings);
    this.cache = defaultSettings;
    return this.cache;
  }

  async updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const next: UserSettings = {
      ...current,
      ...partial,
    };

    if (next.defaultArea !== undefined) {
      const areaError = validateArea(next.defaultArea);
      if (areaError) {
        throw new Error(areaError);
      }
    }

    if (next.defaultSprayerCapacity !== undefined && next.defaultSprayerCapacity <= 0) {
      throw new Error('Вместимость опрыскивателя должна быть больше 0');
    }

    await SettingsRepository.save(next);
    this.cache = next;
    return next;
  }

  async setUnits(units: UnitsSystem): Promise<UserSettings> {
    return this.updateSettings({units});
  }

  async setLanguage(language: AppLanguage): Promise<UserSettings> {
    return this.updateSettings({language});
  }
}

export default new SettingsService();
