import SQLite from 'react-native-sqlite-storage';
import Database from '../database/Database';

export interface ResistanceRecord {
  fieldId: number;
  activeIngredient: string;
  usageCount: number;
  lastTreatmentDate?: number;
  riskLevel: 'low' | 'medium' | 'high';
  notes?: string;
}

class ResistanceRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  private async ensureDatabase(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async clear(): Promise<void> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');
    await this.db.executeSql('DELETE FROM resistance_records');
  }

  async save(records: ResistanceRecord[]): Promise<void> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.transaction(tx => {
      records.forEach(record => {
        tx.executeSql(
          `INSERT INTO resistance_records (field_id, active_ingredient, usage_count, last_treatment_date, risk_level, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            record.fieldId,
            record.activeIngredient,
            record.usageCount,
            record.lastTreatmentDate ?? null,
            record.riskLevel,
            record.notes ?? null,
          ],
        );
      });
    });
  }

  async getAll(): Promise<ResistanceRecord[]> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM resistance_records ORDER BY COALESCE(last_treatment_date, 0) DESC',
    );
    const records: ResistanceRecord[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      records.push({
        fieldId: row.field_id,
        activeIngredient: row.active_ingredient,
        usageCount: row.usage_count,
        lastTreatmentDate: row.last_treatment_date ?? undefined,
        riskLevel: row.risk_level,
        notes: row.notes ?? undefined,
      });
    }
    return records;
  }
}

export default new ResistanceRepository();
