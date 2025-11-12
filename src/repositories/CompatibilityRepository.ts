import SQLite from 'react-native-sqlite-storage';
import Database from '../database/Database';

export interface CompatibilityRecord {
  productId1: number;
  productId2: number;
  chemicalCompatible: boolean;
  physicalCompatible: boolean;
  biologicalCompatible: boolean;
  notes?: string | null;
}

class CompatibilityRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  private async ensureDatabase(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  private normalize(productId1: number, productId2: number): [number, number] {
    return productId1 < productId2 ? [productId1, productId2] : [productId2, productId1];
  }

  async getCompatibility(productId1: number, productId2: number): Promise<CompatibilityRecord | null> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');

    const [id1, id2] = this.normalize(productId1, productId2);
    const [results] = await this.db.executeSql(
      `SELECT * FROM product_compatibility WHERE product_id_1 = ? AND product_id_2 = ? LIMIT 1`,
      [id1, id2],
    );

    if (results.rows.length > 0) {
      const row = results.rows.item(0);
      return {
        productId1: row.product_id_1,
        productId2: row.product_id_2,
        chemicalCompatible: Boolean(row.chemical_compatible),
        physicalCompatible: Boolean(row.physical_compatible),
        biologicalCompatible: Boolean(row.biological_compatible),
        notes: row.notes ?? null,
      };
    }
    return null;
  }

  async upsert(record: CompatibilityRecord): Promise<void> {
    await this.ensureDatabase();
    if (!this.db) throw new Error('Database not initialized');

    const [id1, id2] = this.normalize(record.productId1, record.productId2);

    await this.db.executeSql(
      `INSERT OR REPLACE INTO product_compatibility
        (id, product_id_1, product_id_2, chemical_compatible, physical_compatible, biological_compatible, notes)
       VALUES (
         (SELECT id FROM product_compatibility WHERE product_id_1 = ? AND product_id_2 = ?),
         ?, ?, ?, ?, ?, ?
       )`,
      [
        id1,
        id2,
        id1,
        id2,
        record.chemicalCompatible ? 1 : 0,
        record.physicalCompatible ? 1 : 0,
        record.biologicalCompatible ? 1 : 0,
        record.notes ?? null,
      ],
    );
  }

  async bulkInsert(records: CompatibilityRecord[]): Promise<void> {
    for (const record of records) {
      await this.upsert(record);
    }
  }
}

export default new CompatibilityRepository();
