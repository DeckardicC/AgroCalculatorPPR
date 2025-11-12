import SQLite from 'react-native-sqlite-storage';
import Database from '../database/Database';
import {UserSettings} from '../models/UserSettings';

class SettingsRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  private async ensureDatabase(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  private mapRow(row: any): UserSettings {
    return {
      id: row.id,
      units: row.units,
      language: row.language,
      defaultArea: row.default_area ?? undefined,
      defaultSprayerCapacity: row.default_sprayer_capacity ?? undefined,
      notificationsEnabled: Boolean(row.notifications_enabled),
      remindersEnabled: Boolean(row.reminders_enabled),
      autoBackupEnabled: Boolean(row.auto_backup_enabled),
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    };
  }

  async getSettings(): Promise<UserSettings | null> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM user_settings WHERE id = 1 LIMIT 1');
    if (results.rows.length > 0) {
      return this.mapRow(results.rows.item(0));
    }
    return null;
  }

  async save(settings: UserSettings): Promise<void> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      `INSERT OR REPLACE INTO user_settings (
        id, units, language, default_area, default_sprayer_capacity,
        notifications_enabled, reminders_enabled, auto_backup_enabled,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
      [
        1,
        settings.units,
        settings.language,
        settings.defaultArea ?? null,
        settings.defaultSprayerCapacity ?? null,
        settings.notificationsEnabled ? 1 : 0,
        settings.remindersEnabled ? 1 : 0,
        settings.autoBackupEnabled ? 1 : 0,
      ],
    );
  }
}

export default new SettingsRepository();
