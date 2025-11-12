import SQLite from 'react-native-sqlite-storage';
import Database from '../database/Database';
import {TreatmentPlan, TreatmentPlanStatus} from '../models/TreatmentPlan';

class TreatmentPlanRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  private async ensureDatabase(): Promise<void> {
    this.db = Database.getDatabase();
    if (!this.db) {
      await Database.initDatabase();
      this.db = Database.getDatabase();
    }
  }

  async getAll(): Promise<TreatmentPlan[]> {
    await this.ensureDatabase();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      `SELECT * FROM treatment_plans ORDER BY planned_date ASC, priority ASC`,
    );

    const plans: TreatmentPlan[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      plans.push(this.mapRowToPlan(results.rows.item(i)));
    }

    return plans;
  }

  async getUpcoming(daysAhead: number = 90): Promise<TreatmentPlan[]> {
    await this.ensureDatabase();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = Math.floor(Date.now() / 1000);
    const end = now + daysAhead * 24 * 60 * 60;

    const [results] = await this.db.executeSql(
      `SELECT * FROM treatment_plans 
       WHERE planned_date BETWEEN ? AND ?
       ORDER BY planned_date ASC, priority ASC`,
      [now, end],
    );

    const plans: TreatmentPlan[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      plans.push(this.mapRowToPlan(results.rows.item(i)));
    }

    return plans;
  }

  async getById(id: number): Promise<TreatmentPlan | null> {
    await this.ensureDatabase();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      `SELECT * FROM treatment_plans WHERE id = ? LIMIT 1`,
      [id],
    );

    if (results.rows.length > 0) {
      return this.mapRowToPlan(results.rows.item(0));
    }

    return null;
  }

  async save(plan: TreatmentPlan): Promise<number> {
    await this.ensureDatabase();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (plan.id) {
      await this.db.executeSql(
        `UPDATE treatment_plans 
         SET field_id = ?, crop_id = ?, planned_date = ?, window_start = ?, window_end = ?,
             status = ?, priority = ?, reason = ?, recommended_products = ?, warehouse_status = ?,
             updated_at = strftime('%s', 'now')
         WHERE id = ?`,
        [
          plan.fieldId,
          plan.cropId || null,
          plan.plannedDate,
          plan.windowStart || null,
          plan.windowEnd || null,
          plan.status,
          plan.priority,
          plan.reason || null,
          plan.recommendedProducts ? JSON.stringify(plan.recommendedProducts) : null,
          plan.warehouseStatus || null,
          plan.id,
        ],
      );
      return plan.id;
    }

    const [result] = await this.db.executeSql(
      `INSERT INTO treatment_plans 
       (field_id, crop_id, planned_date, window_start, window_end, status, priority, reason, recommended_products, warehouse_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.fieldId,
        plan.cropId || null,
        plan.plannedDate,
        plan.windowStart || null,
        plan.windowEnd || null,
        plan.status,
        plan.priority,
        plan.reason || null,
        plan.recommendedProducts ? JSON.stringify(plan.recommendedProducts) : null,
        plan.warehouseStatus || null,
      ],
    );

    return result.insertId ?? 0;
  }

  async updateStatus(id: number, status: TreatmentPlanStatus): Promise<void> {
    await this.ensureDatabase();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.executeSql(
      `UPDATE treatment_plans 
       SET status = ?, updated_at = strftime('%s', 'now') 
       WHERE id = ?`,
      [status, id],
    );
  }

  async delete(id: number): Promise<void> {
    await this.ensureDatabase();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.executeSql('DELETE FROM treatment_plans WHERE id = ?', [id]);
  }

  private mapRowToPlan(row: any): TreatmentPlan {
    return {
      id: row.id,
      fieldId: row.field_id,
      cropId: row.crop_id ?? undefined,
      plannedDate: row.planned_date,
      windowStart: row.window_start ?? undefined,
      windowEnd: row.window_end ?? undefined,
      status: row.status || 'planned',
      priority: (row.priority ?? 2) as 1 | 2 | 3,
      reason: row.reason ?? undefined,
      recommendedProducts: row.recommended_products
        ? JSON.parse(row.recommended_products)
        : undefined,
      warehouseStatus: row.warehouse_status ?? undefined,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    };
  }
}

export default new TreatmentPlanRepository();
