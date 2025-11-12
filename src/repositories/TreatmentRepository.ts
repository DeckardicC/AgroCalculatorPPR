import SQLite from 'react-native-sqlite-storage';
import {Treatment, TreatmentProduct} from '../models/Treatment';
import Database from '../database/Database';

class TreatmentRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<Treatment[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM treatments ORDER BY treatment_date DESC',
    );
    const treatments: Treatment[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      const treatment = results.rows.item(i);
      treatment.products = await this.getTreatmentProducts(treatment.id);
      treatments.push(treatment);
    }

    return treatments;
  }

  async getById(id: number): Promise<Treatment | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql('SELECT * FROM treatments WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      const treatment = results.rows.item(0);
      treatment.products = await this.getTreatmentProducts(treatment.id);
      return treatment;
    }
    return null;
  }

  async getByField(fieldId: number): Promise<Treatment[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM treatments WHERE field_id = ? ORDER BY treatment_date DESC',
      [fieldId],
    );
    const treatments: Treatment[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      const treatment = results.rows.item(i);
      treatment.products = await this.getTreatmentProducts(treatment.id);
      treatments.push(treatment);
    }

    return treatments;
  }

  async getTreatmentProducts(treatmentId: number): Promise<TreatmentProduct[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM treatment_products WHERE treatment_id = ?',
      [treatmentId],
    );
    const products: TreatmentProduct[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      products.push(results.rows.item(i));
    }

    return products;
  }

  async create(treatment: Treatment): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO treatments 
       (field_id, crop_id, treatment_date, area, weather_temperature, weather_humidity, 
        weather_wind_speed, operator_name, equipment_type, total_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        treatment.fieldId,
        treatment.cropId,
        treatment.treatmentDate,
        treatment.area,
        treatment.weatherTemperature || null,
        treatment.weatherHumidity || null,
        treatment.weatherWindSpeed || null,
        treatment.operatorName || null,
        treatment.equipmentType || null,
        treatment.totalCost || null,
        treatment.notes || null,
      ],
    );

    const treatmentId = result.insertId;

    // Add treatment products
    if (treatment.products && treatment.products.length > 0) {
      for (const product of treatment.products) {
        await this.addTreatmentProduct({
          ...product,
          treatmentId,
        });
      }
    }

    return treatmentId;
  }

  async addTreatmentProduct(product: TreatmentProduct): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!product.treatmentId) throw new Error('Treatment ID is required');

    const [result] = await this.db.executeSql(
      `INSERT INTO treatment_products 
       (treatment_id, product_id, dosage, working_solution_volume, cost)
       VALUES (?, ?, ?, ?, ?)`,
      [
        product.treatmentId,
        product.productId,
        product.dosage,
        product.workingSolutionVolume || null,
        product.cost || null,
      ],
    );

    return result.insertId;
  }

  async update(treatment: Treatment): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (!treatment.id) throw new Error('Treatment ID is required for update');

    await this.db.executeSql(
      `UPDATE treatments 
       SET field_id = ?, crop_id = ?, treatment_date = ?, area = ?, 
           weather_temperature = ?, weather_humidity = ?, weather_wind_speed = ?,
           operator_name = ?, equipment_type = ?, total_cost = ?, notes = ?,
           updated_at = strftime('%s', 'now')
       WHERE id = ?`,
      [
        treatment.fieldId,
        treatment.cropId,
        treatment.treatmentDate,
        treatment.area,
        treatment.weatherTemperature || null,
        treatment.weatherHumidity || null,
        treatment.weatherWindSpeed || null,
        treatment.operatorName || null,
        treatment.equipmentType || null,
        treatment.totalCost || null,
        treatment.notes || null,
        treatment.id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Delete treatment products first
    await this.db.executeSql('DELETE FROM treatment_products WHERE treatment_id = ?', [id]);
    // Delete treatment
    await this.db.executeSql('DELETE FROM treatments WHERE id = ?', [id]);
  }
}

export default new TreatmentRepository();

