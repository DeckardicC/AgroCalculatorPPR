import SQLite from 'react-native-sqlite-storage';
import {Product, ProductType, ProductEfficacy} from '../models/Product';
import Database from '../database/Database';

class ProductRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  private mapRow(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      nameEn: row.name_en ?? undefined,
      activeIngredient: row.active_ingredient ?? undefined,
      concentration: row.concentration ?? undefined,
      type: row.type,
      category: row.category ?? undefined,
      manufacturer: row.manufacturer ?? undefined,
      pricePerUnit: row.price_per_unit ?? undefined,
      unit: row.unit ?? undefined,
      minDosage: row.min_dosage ?? 0,
      maxDosage: row.max_dosage ?? 0,
      unitDosage: row.unit_dosage ?? undefined,
      waitingPeriod: row.waiting_period ?? undefined,
      efficacyData: row.efficacy_data ?? undefined,
    };
  }

  async initialize(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<Product[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM products ORDER BY name');
    const products: Product[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      products.push(this.mapRow(results.rows.item(i)));
    }

    return products;
  }

  async getById(id: number): Promise<Product | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM products WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return this.mapRow(results.rows.item(0));
    }
    return null;
  }

  async getByType(type: ProductType): Promise<Product[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM products WHERE type = ? ORDER BY name',
      [type],
    );
    const products: Product[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      products.push(this.mapRow(results.rows.item(i)));
      products.push(this.mapRow(results.rows.item(i)));
    }

    return products;
  }

  async getEffectiveAgainstPest(
    pestId: number,
    minEfficacy: number = 90,
  ): Promise<Product[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT DISTINCT p.*, e.efficacy_percent 
       FROM products p
       INNER JOIN product_pest_efficacy e ON p.id = e.product_id
       WHERE e.pest_id = ? AND e.efficacy_percent >= ?
       ORDER BY e.efficacy_percent DESC`,
      [pestId, minEfficacy],
    );
    const products: Product[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      products.push(this.mapRow(results.rows.item(i)));
    }

    return products;
  }

  async getEfficacyAgainstPest(
    productId: number,
    pestId: number,
  ): Promise<number | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT efficacy_percent FROM product_pest_efficacy 
       WHERE product_id = ? AND pest_id = ?`,
      [productId, pestId],
    );

    if (results.rows.length > 0) {
      return results.rows.item(0).efficacy_percent;
    }
    return null;
  }

  async getCompatibleWithCrop(cropId: number, phase?: number): Promise<Product[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    let query = `SELECT DISTINCT p.* FROM products p
                 INNER JOIN product_crop_compatibility c ON p.id = c.product_id
                 WHERE c.crop_id = ?`;
    const params: any[] = [cropId];

    if (phase !== undefined) {
      query += ` AND (c.phase_min IS NULL OR c.phase_min <= ?) 
                 AND (c.phase_max IS NULL OR c.phase_max >= ?)`;
      params.push(phase, phase);
    }

    query += ' ORDER BY p.name';

    const [results] = await this.db.executeSql(query, params);
    const products: Product[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      products.push(this.mapRow(results.rows.item(i)));
    }

    return products;
  }

  async search(query: string): Promise<Product[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const searchQuery = `%${query}%`;
    const [results] = await this.db.executeSql(
      'SELECT * FROM products WHERE name LIKE ? OR name_en LIKE ? OR active_ingredient LIKE ? ORDER BY name',
      [searchQuery, searchQuery, searchQuery],
    );
    const products: Product[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      products.push(this.mapRow(results.rows.item(i)));
    }

    return products;
  }

  async advancedSearch(params: {
    query?: string;
    type?: ProductType | null;
    cropId?: number;
    pestId?: number;
    minEfficacy?: number;
  }): Promise<Product[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const conditions: string[] = [];
    const values: any[] = [];
    let select = 'SELECT DISTINCT p.*';
    let from = ' FROM products p';
    let joins = '';

    if (params.cropId !== undefined) {
      joins += ' INNER JOIN product_crop_compatibility cc ON cc.product_id = p.id';
      conditions.push('cc.crop_id = ?');
      values.push(params.cropId);
    }

    if (params.pestId !== undefined || params.minEfficacy !== undefined) {
      joins += ' INNER JOIN product_pest_efficacy e ON e.product_id = p.id';
      if (params.pestId !== undefined) {
        conditions.push('e.pest_id = ?');
        values.push(params.pestId);
      }
      if (params.minEfficacy !== undefined) {
        conditions.push('e.efficacy_percent >= ?');
        values.push(params.minEfficacy);
      }
    }

    if (params.type) {
      conditions.push('p.type = ?');
      values.push(params.type);
    }

    if (params.query && params.query.trim().length > 0) {
      const searchQuery = `%${params.query.trim()}%`;
      conditions.push('(p.name LIKE ? OR p.name_en LIKE ? OR p.active_ingredient LIKE ?)');
      values.push(searchQuery, searchQuery, searchQuery);
    }

    let query = `${select}${from}${joins}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY p.name';

    const [results] = await this.db.executeSql(query, values);
    const products: Product[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      products.push(this.mapRow(results.rows.item(i)));
    }
    return products;
  }

  async getAverageEfficacy(productId: number): Promise<number | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT AVG(efficacy_percent) as avg_eff FROM product_pest_efficacy WHERE product_id = ?`,
      [productId],
    );

    if (results.rows.length > 0) {
      const value = results.rows.item(0).avg_eff;
      return value !== null && value !== undefined ? value : null;
    }

    return null;
  }

  async getAverageEfficacyBulk(productIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (productIds.length === 0) {
      return map;
    }

    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const placeholders = productIds.map(() => '?').join(', ');
    const [results] = await this.db.executeSql(
      `SELECT product_id, AVG(efficacy_percent) as avg_eff 
       FROM product_pest_efficacy 
       WHERE product_id IN (${placeholders})
       GROUP BY product_id`,
      productIds,
    );

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      if (row.avg_eff !== null && row.avg_eff !== undefined) {
        map.set(row.product_id, row.avg_eff);
      }
    }

    return map;
  }

  async getPestEfficacyForProduct(
    productId: number,
  ): Promise<Array<{pestId: number; pestName: string; pestType: string; efficacy: number}>> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT e.pest_id, p.name, p.type, e.efficacy_percent 
       FROM product_pest_efficacy e
       INNER JOIN pests p ON p.id = e.pest_id
       WHERE e.product_id = ?`,
      [productId],
    );

    const list: Array<{pestId: number; pestName: string; pestType: string; efficacy: number}> = [];

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      list.push({
        pestId: row.pest_id,
        pestName: row.name,
        pestType: row.type,
        efficacy: row.efficacy_percent,
      });
    }

    return list;
  }

  async create(product: Product): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO products (name, name_en, active_ingredient, concentration, type, category, 
                            manufacturer, price_per_unit, unit, min_dosage, max_dosage, 
                            unit_dosage, waiting_period, efficacy_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.name,
        product.nameEn || null,
        product.activeIngredient,
        product.concentration || null,
        product.type,
        product.category || null,
        product.manufacturer || null,
        product.pricePerUnit || null,
        product.unit || null,
        product.minDosage,
        product.maxDosage,
        product.unitDosage,
        product.waitingPeriod || null,
        product.efficacyData || null,
      ],
    );

    return result.insertId;
  }

  async update(product: Product): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!product.id) throw new Error('Product ID is required for update');

    await this.db.executeSql(
      `UPDATE products 
       SET name = ?, name_en = ?, active_ingredient = ?, concentration = ?, type = ?, 
           category = ?, manufacturer = ?, price_per_unit = ?, unit = ?, min_dosage = ?, 
           max_dosage = ?, unit_dosage = ?, waiting_period = ?, efficacy_data = ?, 
           updated_at = strftime('%s', 'now')
       WHERE id = ?`,
      [
        product.name,
        product.nameEn || null,
        product.activeIngredient,
        product.concentration || null,
        product.type,
        product.category || null,
        product.manufacturer || null,
        product.pricePerUnit || null,
        product.unit || null,
        product.minDosage,
        product.maxDosage,
        product.unitDosage,
        product.waitingPeriod || null,
        product.efficacyData || null,
        product.id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM products WHERE id = ?', [id]);
  }

  async addEfficacy(efficacy: ProductEfficacy): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO product_pest_efficacy 
       (product_id, pest_id, efficacy_percent, crop_id, phase_min, phase_max)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        efficacy.productId,
        efficacy.pestId,
        efficacy.efficacyPercent,
        efficacy.cropId || null,
        efficacy.phaseMin || null,
        efficacy.phaseMax || null,
      ],
    );

    return result.insertId;
  }
}

export default new ProductRepository();

