import SQLite from 'react-native-sqlite-storage';
import {Pest, PestType} from '../models/Pest';
import Database from '../database/Database';

class PestRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<Pest[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM pests ORDER BY name');
    const pests: Pest[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      pests.push(results.rows.item(i));
    }

    return pests;
  }

  async getById(id: number): Promise<Pest | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM pests WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  async getByType(type: PestType): Promise<Pest[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM pests WHERE type = ? ORDER BY name',
      [type],
    );
    const pests: Pest[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      pests.push(results.rows.item(i));
    }

    return pests;
  }

  async search(query: string): Promise<Pest[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const searchQuery = `%${query}%`;
    const [results] = await this.db.executeSql(
      'SELECT * FROM pests WHERE name LIKE ? OR name_en LIKE ? ORDER BY name',
      [searchQuery, searchQuery],
    );
    const pests: Pest[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      pests.push(results.rows.item(i));
    }

    return pests;
  }

  async advancedSearch(params: {
    query?: string;
    type?: PestType | null;
    category?: string | null;
  }): Promise<Pest[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const conditions: string[] = [];
    const values: any[] = [];

    if (params.query && params.query.trim().length > 0) {
      const searchQuery = `%${params.query.trim()}%`;
      conditions.push('(name LIKE ? OR name_en LIKE ?)');
      values.push(searchQuery, searchQuery);
    }

    if (params.type) {
      conditions.push('type = ?');
      values.push(params.type);
    }

    if (params.category) {
      conditions.push('(category = ?)');
      values.push(params.category);
    }

    let query = 'SELECT * FROM pests';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY name';

    const [results] = await this.db.executeSql(query, values);
    const pests: Pest[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      pests.push(results.rows.item(i));
    }
    return pests;
  }

  async create(pest: Pest): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO pests (name, name_en, type, category, description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        pest.name,
        pest.nameEn || null,
        pest.type,
        pest.category || null,
        pest.description || null,
      ],
    );

    return result.insertId;
  }

  async update(pest: Pest): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!pest.id) throw new Error('Pest ID is required for update');

    await this.db.executeSql(
      `UPDATE pests 
       SET name = ?, name_en = ?, type = ?, category = ?, description = ?, 
           updated_at = strftime('%s', 'now')
       WHERE id = ?`,
      [
        pest.name,
        pest.nameEn || null,
        pest.type,
        pest.category || null,
        pest.description || null,
        pest.id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM pests WHERE id = ?', [id]);
  }
}

export default new PestRepository();

