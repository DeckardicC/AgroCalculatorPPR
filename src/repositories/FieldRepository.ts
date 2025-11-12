import SQLite from 'react-native-sqlite-storage';
import {Field, FieldCropHistory} from '../models/Field';
import Database from '../database/Database';

class FieldRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<Field[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM fields ORDER BY name');
    const fields: Field[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      fields.push(results.rows.item(i));
    }

    return fields;
  }

  async getById(id: number): Promise<Field | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM fields WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  async getCropHistory(fieldId: number): Promise<FieldCropHistory[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM field_crop_history WHERE field_id = ? ORDER BY year DESC, season',
      [fieldId],
    );
    const history: FieldCropHistory[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      history.push(results.rows.item(i));
    }

    return history;
  }

  async create(field: Field): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO fields (name, area, soil_type, latitude, longitude, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        field.name,
        field.area,
        field.soilType || null,
        field.latitude || null,
        field.longitude || null,
        field.description || null,
      ],
    );

    return result.insertId;
  }

  async update(field: Field): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!field.id) throw new Error('Field ID is required for update');

    await this.db.executeSql(
      `UPDATE fields 
       SET name = ?, area = ?, soil_type = ?, latitude = ?, longitude = ?, 
           description = ?, updated_at = strftime('%s', 'now')
       WHERE id = ?`,
      [
        field.name,
        field.area,
        field.soilType || null,
        field.latitude || null,
        field.longitude || null,
        field.description || null,
        field.id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM fields WHERE id = ?', [id]);
  }

  async addCropHistory(history: FieldCropHistory): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO field_crop_history (field_id, crop_id, year, season, area)
       VALUES (?, ?, ?, ?, ?)`,
      [
        history.fieldId,
        history.cropId,
        history.year,
        history.season || null,
        history.area || null,
      ],
    );

    return result.insertId;
  }
}

export default new FieldRepository();

