import SQLite from 'react-native-sqlite-storage';
import {Crop, CropCategory} from '../models/Crop';
import Database from '../database/Database';

class CropRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<Crop[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM crops ORDER BY name');
    const crops: Crop[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      crops.push(results.rows.item(i));
    }

    return crops;
  }

  async getById(id: number): Promise<Crop | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM crops WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  async getByCategory(category: CropCategory): Promise<Crop[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM crops WHERE category = ? ORDER BY name',
      [category],
    );
    const crops: Crop[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      crops.push(results.rows.item(i));
    }

    return crops;
  }

  async search(query: string): Promise<Crop[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const searchQuery = `%${query}%`;
    const [results] = await this.db.executeSql(
      'SELECT * FROM crops WHERE name LIKE ? OR name_en LIKE ? ORDER BY name',
      [searchQuery, searchQuery],
    );
    const crops: Crop[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      crops.push(results.rows.item(i));
    }

    return crops;
  }

  async advancedSearch(params: {
    query?: string;
    category?: CropCategory;
    bbchMin?: number;
    bbchMax?: number;
  }): Promise<Crop[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const conditions: string[] = [];
    const values: any[] = [];

    if (params.query && params.query.trim().length > 0) {
      const searchQuery = `%${params.query.trim()}%`;
      conditions.push('(name LIKE ? OR name_en LIKE ?)');
      values.push(searchQuery, searchQuery);
    }

    if (params.category) {
      conditions.push('category = ?');
      values.push(params.category);
    }

    if (params.bbchMin !== undefined) {
      conditions.push('(bbh_min IS NULL OR bbh_min <= ?)');
      values.push(params.bbchMin);
    }

    if (params.bbchMax !== undefined) {
      conditions.push('(bbh_max IS NULL OR bbh_max >= ?)');
      values.push(params.bbchMax);
    }

    let query = 'SELECT * FROM crops';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY name';

    const [results] = await this.db.executeSql(query, values);
    const crops: Crop[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      crops.push(results.rows.item(i));
    }
    return crops;
  }

  async create(crop: Crop): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO crops (name, name_en, category, subcategory, variety, bbh_min, bbh_max)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crop.name,
        crop.nameEn || null,
        crop.category,
        crop.subcategory || null,
        crop.variety || null,
        crop.bbhMin || null,
        crop.bbhMax || null,
      ],
    );

    return result.insertId;
  }

  async update(crop: Crop): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!crop.id) throw new Error('Crop ID is required for update');

    await this.db.executeSql(
      `UPDATE crops 
       SET name = ?, name_en = ?, category = ?, subcategory = ?, variety = ?, 
           bbh_min = ?, bbh_max = ?, updated_at = strftime('%s', 'now')
       WHERE id = ?`,
      [
        crop.name,
        crop.nameEn || null,
        crop.category,
        crop.subcategory || null,
        crop.variety || null,
        crop.bbhMin || null,
        crop.bbhMax || null,
        crop.id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM crops WHERE id = ?', [id]);
  }
}

export default new CropRepository();

