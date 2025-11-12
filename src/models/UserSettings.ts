export type UnitsSystem = 'metric' | 'imperial';
export type AppLanguage = 'ru' | 'en';

export interface UserSettings {
  id?: number;
  units: UnitsSystem;
  language: AppLanguage;
  defaultArea?: number;
  defaultSprayerCapacity?: number;
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  autoBackupEnabled: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export const defaultSettings: UserSettings = {
  id: 1,
  units: 'metric',
  language: 'ru',
  defaultArea: 50,
  defaultSprayerCapacity: 300,
  notificationsEnabled: true,
  remindersEnabled: true,
  autoBackupEnabled: true,
};
