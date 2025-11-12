import SQLite from 'react-native-sqlite-storage';
import {WarehouseInventory} from '../models/Warehouse';
import Database from '../database/Database';

class WarehouseRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<WarehouseInventory[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT w.*, p.name, p.name_en, p.type, p.unit 
       FROM warehouse_inventory w
       LEFT JOIN products p ON w.product_id = p.id
       ORDER BY p.name`,
    );
    const inventory: WarehouseInventory[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      inventory.push(results.rows.item(i));
    }

    return inventory;
  }

  async getById(id: number): Promise<WarehouseInventory | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT w.*, p.name, p.name_en, p.type, p.unit 
       FROM warehouse_inventory w
       LEFT JOIN products p ON w.product_id = p.id
       WHERE w.id = ?`,
      [id],
    );
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  async getByProduct(productId: number): Promise<WarehouseInventory[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT w.*, p.name, p.name_en, p.type, p.unit 
       FROM warehouse_inventory w
       LEFT JOIN products p ON w.product_id = p.id
       WHERE w.product_id = ?`,
      [productId],
    );
    const inventory: WarehouseInventory[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      inventory.push(results.rows.item(i));
    }

    return inventory;
  }

  async getExpiringSoon(days: number = 30): Promise<WarehouseInventory[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const expirationDate = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
    const [results] = await this.db.executeSql(
      `SELECT w.*, p.name, p.name_en, p.type, p.unit 
       FROM warehouse_inventory w
       LEFT JOIN products p ON w.product_id = p.id
       WHERE w.expiration_date IS NOT NULL 
       AND w.expiration_date <= ? 
       AND w.expiration_date >= strftime('%s', 'now')
       ORDER BY w.expiration_date ASC`,
      [expirationDate],
    );
    const inventory: WarehouseInventory[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      inventory.push(results.rows.item(i));
    }

    return inventory;
  }

  async create(inventory: WarehouseInventory): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO warehouse_inventory 
       (product_id, quantity, unit, purchase_date, expiration_date, purchase_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        inventory.productId,
        inventory.quantity,
        inventory.unit,
        inventory.purchaseDate || null,
        inventory.expirationDate || null,
        inventory.purchasePrice || null,
      ],
    );

    return result.insertId;
  }

  async update(inventory: WarehouseInventory): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!inventory.id) throw new Error('Inventory ID is required for update');

    await this.db.executeSql(
      `UPDATE warehouse_inventory 
       SET product_id = ?, quantity = ?, unit = ?, purchase_date = ?, 
           expiration_date = ?, purchase_price = ?
       WHERE id = ?`,
      [
        inventory.productId,
        inventory.quantity,
        inventory.unit,
        inventory.purchaseDate || null,
        inventory.expirationDate || null,
        inventory.purchasePrice || null,
        inventory.id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM warehouse_inventory WHERE id = ?', [id]);
  }

  async updateQuantity(id: number, quantity: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('UPDATE warehouse_inventory SET quantity = ? WHERE id = ?', [
      quantity,
      id,
    ]);
  }
}

export default new WarehouseRepository();

