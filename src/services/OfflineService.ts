import Database from '../database/Database';
import CropRepository from '../repositories/CropRepository';
import PestRepository from '../repositories/PestRepository';
import ProductRepository from '../repositories/ProductRepository';
import FieldRepository from '../repositories/FieldRepository';
import WarehouseRepository from '../repositories/WarehouseRepository';
import TreatmentRepository from '../repositories/TreatmentRepository';
import ResistanceRepository from '../repositories/ResistanceRepository';
import SettingsRepository from '../repositories/SettingsRepository';
import {validateArea, validateHumidity, validateTemperature} from '../utils/validation';
import SeedEfficacyService from './SeedEfficacyService';
import {UserSettings, defaultSettings} from '../models/UserSettings';

interface ExportedField {
  field: any;
  history: any[];
}

interface ExportPayload {
  version: string;
  generatedAt: number;
  crops: any[];
  pests: any[];
  products: any[];
  productPestEfficacy: any[];
  productCropCompatibility: any[];
  productCompatibility: any[];
  fields: ExportedField[];
  treatments: any[];
  treatmentProducts: any[];
  treatmentPlans: any[];
  warehouse: any[];
  resistance: any[];
  userSettings: UserSettings;
}

export interface ExportResult {
  json: string;
  issues: string[];
}

export interface ImportResult {
  issues: string[];
}

class OfflineService {
  private async ensureDatabase() {
    const db = Database.getDatabase();
    if (!db) {
      await Database.initDatabase();
    }
    return Database.getDatabase();
  }

  private async fetchAll(query: string, params: any[] = []): Promise<any[]> {
    const db = await this.ensureDatabase();
    if (!db) throw new Error('Database not initialized');
    const [results] = await db.executeSql(query, params);
    const rows: any[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(results.rows.item(i));
    }
    return rows;
  }

  async exportData(): Promise<ExportResult> {
    await this.ensureDatabase();
    const [crops, pests, products] = await Promise.all([
      CropRepository.getAll(),
      PestRepository.getAll(),
      ProductRepository.getAll(),
    ]);

    const [productPestEfficacy, productCropCompatibility, productCompatibility, treatmentPlans] =
      await Promise.all([
        this.fetchAll('SELECT * FROM product_pest_efficacy'),
        this.fetchAll('SELECT * FROM product_crop_compatibility'),
        this.fetchAll('SELECT * FROM product_compatibility'),
        this.fetchAll('SELECT * FROM treatment_plans'),
      ]);

    const fieldsRaw = await FieldRepository.getAll();
    const fields: ExportedField[] = [];
    for (const field of fieldsRaw) {
      const history = await FieldRepository.getCropHistory(field.id!);
      fields.push({field, history});
    }

    const treatments = await TreatmentRepository.getAll();
    const treatmentProducts = await this.fetchAll('SELECT * FROM treatment_products');
    const warehouse = await WarehouseRepository.getAll();
    const resistance = await ResistanceRepository.getAll();
    const userSettings = (await SettingsRepository.getSettings()) ?? defaultSettings;

    const payload: ExportPayload = {
      version: '1.0',
      generatedAt: Date.now(),
      crops,
      pests,
      products,
      productPestEfficacy,
      productCropCompatibility,
      productCompatibility,
      fields,
      treatments,
      treatmentProducts,
      treatmentPlans,
      warehouse,
      resistance,
      userSettings,
    };

    const issues = this.validateExportPayload(payload);
    const json = JSON.stringify(payload, null, 2);
    return {json, issues};
  }

  async importData(json: string): Promise<ImportResult> {
    const payload = JSON.parse(json) as ExportPayload;
    if (!payload || !payload.version) {
      throw new Error('Некорректный формат резервной копии.');
    }
    const issues = this.validateExportPayload(payload);

    const db = await this.ensureDatabase();
    if (!db) throw new Error('Database not initialized');

    const tables = [
      'treatment_products',
      'treatments',
      'treatment_plans',
      'warehouse_inventory',
      'product_compatibility',
      'product_pest_efficacy',
      'product_crop_compatibility',
      'field_crop_history',
      'fields',
      'resistance_records',
      'products',
      'pests',
      'crops',
      'user_settings',
    ];

    await db.transaction(async tx => {
      for (const table of tables) {
        await tx.executeSql(`DELETE FROM ${table}`);
      }

      for (const crop of payload.crops) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO crops (id, name, name_en, category, subcategory, variety, bbh_min, bbh_max, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crop.id ?? null,
            crop.name,
            crop.nameEn || crop.name_en || null,
            crop.category,
            crop.subcategory || null,
            crop.variety || null,
            crop.bbhMin ?? crop.bbh_min ?? null,
            crop.bbhMax ?? crop.bbh_max ?? null,
            crop.createdAt ?? crop.created_at ?? null,
            crop.updatedAt ?? crop.updated_at ?? null,
          ],
        );
      }

      for (const pest of payload.pests) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO pests (id, name, name_en, type, category, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pest.id ?? null,
            pest.name,
            pest.nameEn || pest.name_en || null,
            pest.type,
            pest.category || null,
            pest.description || null,
            pest.createdAt ?? pest.created_at ?? null,
            pest.updatedAt ?? pest.updated_at ?? null,
          ],
        );
      }

      for (const product of payload.products) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO products (id, name, name_en, active_ingredient, concentration, type, category, manufacturer, price_per_unit, unit, min_dosage, max_dosage, unit_dosage, waiting_period, efficacy_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id ?? null,
            product.name,
            product.nameEn || product.name_en || null,
            product.activeIngredient || product.active_ingredient || null,
            product.concentration || null,
            product.type,
            product.category || null,
            product.manufacturer || null,
            product.pricePerUnit ?? product.price_per_unit ?? null,
            product.unit || null,
            product.minDosage ?? product.min_dosage ?? 0,
            product.maxDosage ?? product.max_dosage ?? 0,
            product.unitDosage ?? product.unit_dosage,
            product.waitingPeriod ?? product.waiting_period ?? null,
            product.efficacyData ?? product.efficacy_data ?? null,
            product.createdAt ?? product.created_at ?? null,
            product.updatedAt ?? product.updated_at ?? null,
          ],
        );
      }

      for (const entry of payload.productPestEfficacy) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO product_pest_efficacy (id, product_id, pest_id, efficacy_percent, crop_id, phase_min, phase_max)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id ?? null,
            entry.product_id,
            entry.pest_id,
            entry.efficacy_percent,
            entry.crop_id ?? null,
            entry.phase_min ?? null,
            entry.phase_max ?? null,
          ],
        );
      }

      for (const entry of payload.productCropCompatibility) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO product_crop_compatibility (id, product_id, crop_id, phase_min, phase_max, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            entry.id ?? null,
            entry.product_id,
            entry.crop_id,
            entry.phase_min ?? null,
            entry.phase_max ?? null,
            entry.notes ?? null,
          ],
        );
      }

      for (const entry of payload.productCompatibility) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO product_compatibility (id, product_id_1, product_id_2, chemical_compatible, physical_compatible, biological_compatible, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id ?? null,
            entry.product_id_1,
            entry.product_id_2,
            entry.chemical_compatible !== undefined
              ? entry.chemical_compatible ? 1 : 0
              : entry.chemicalCompatible ? 1 : 0,
            entry.physical_compatible !== undefined
              ? entry.physical_compatible ? 1 : 0
              : entry.physicalCompatible ? 1 : 0,
            entry.biological_compatible !== undefined
              ? entry.biological_compatible ? 1 : 0
              : entry.biologicalCompatible ? 1 : 0,
            entry.notes ?? null,
          ],
        );
      }

      for (const {field, history} of payload.fields) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO fields (id, name, area, soil_type, latitude, longitude, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            field.id ?? null,
            field.name,
            field.area,
            field.soilType ?? field.soil_type ?? null,
            field.latitude ?? null,
            field.longitude ?? null,
            field.description ?? null,
            field.createdAt ?? field.created_at ?? null,
            field.updatedAt ?? field.updated_at ?? null,
          ],
        );

        for (const entry of history ?? []) {
          await tx.executeSql(
            `INSERT OR REPLACE INTO field_crop_history (id, field_id, crop_id, year, season, area)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              entry.id ?? null,
              entry.fieldId ?? entry.field_id,
              entry.cropId ?? entry.crop_id,
              entry.year,
              entry.season ?? null,
              entry.area ?? null,
            ],
          );
        }
      }

      for (const treatment of payload.treatments) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO treatments (id, field_id, crop_id, treatment_date, area, weather_temperature, weather_humidity, weather_wind_speed, operator_name, equipment_type, total_cost, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            treatment.id ?? null,
            treatment.fieldId ?? treatment.field_id,
            treatment.cropId ?? treatment.crop_id,
            treatment.treatmentDate ?? treatment.treatment_date,
            treatment.area,
            treatment.weatherTemperature ?? treatment.weather_temperature ?? null,
            treatment.weatherHumidity ?? treatment.weather_humidity ?? null,
            treatment.weatherWindSpeed ?? treatment.weather_wind_speed ?? null,
            treatment.operatorName ?? treatment.operator_name ?? null,
            treatment.equipmentType ?? treatment.equipment_type ?? null,
            treatment.totalCost ?? treatment.total_cost ?? null,
            treatment.notes ?? null,
            treatment.createdAt ?? treatment.created_at ?? null,
            treatment.updatedAt ?? treatment.updated_at ?? null,
          ],
        );
      }

      for (const item of payload.treatmentProducts) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO treatment_products (id, treatment_id, product_id, dosage, working_solution_volume, cost)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            item.id ?? null,
            item.treatment_id,
            item.product_id,
            item.dosage,
            item.working_solution_volume ?? null,
            item.cost ?? null,
          ],
        );
      }

      for (const plan of payload.treatmentPlans) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO treatment_plans (id, field_id, crop_id, planned_date, window_start, window_end, status, priority, reason, recommended_products, warehouse_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            plan.id ?? null,
            plan.field_id,
            plan.crop_id ?? null,
            plan.planned_date,
            plan.window_start ?? null,
            plan.window_end ?? null,
            plan.status ?? 'planned',
            plan.priority ?? 2,
            plan.reason ?? null,
            plan.recommended_products ?? null,
            plan.warehouse_status ?? null,
            plan.created_at ?? null,
            plan.updated_at ?? null,
          ],
        );
      }

      for (const item of payload.warehouse) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO warehouse_inventory (id, product_id, quantity, unit, purchase_date, expiration_date, purchase_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id ?? null,
            item.productId ?? item.product_id,
            item.quantity,
            item.unit,
            item.purchaseDate ?? item.purchase_date ?? null,
            item.expirationDate ?? item.expiration_date ?? null,
            item.purchasePrice ?? item.purchase_price ?? null,
          ],
        );
      }

      for (const item of payload.resistance) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO resistance_records (id, field_id, active_ingredient, usage_count, last_treatment_date, risk_level, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id ?? null,
            item.fieldId ?? item.field_id,
            item.activeIngredient ?? item.active_ingredient,
            item.usageCount ?? item.usage_count,
            item.lastTreatmentDate ?? item.last_treatment_date ?? null,
            item.riskLevel ?? item.risk_level ?? 'low',
            item.notes ?? null,
            item.createdAt ?? item.created_at ?? null,
            item.updatedAt ?? item.updated_at ?? null,
          ],
        );
      }

      if (payload.userSettings) {
        await tx.executeSql(
          `INSERT OR REPLACE INTO user_settings (id, units, language, default_area, default_sprayer_capacity, notifications_enabled, reminders_enabled, auto_backup_enabled, created_at, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
          [
            payload.userSettings.units,
            payload.userSettings.language,
            payload.userSettings.defaultArea ?? null,
            payload.userSettings.defaultSprayerCapacity ?? null,
            payload.userSettings.notificationsEnabled ? 1 : 0,
            payload.userSettings.remindersEnabled ? 1 : 0,
            payload.userSettings.autoBackupEnabled ? 1 : 0,
            payload.userSettings.createdAt ?? Date.now() / 1000,
          ],
        );
      }
    });

    if (!payload.productPestEfficacy || payload.productPestEfficacy.length === 0) {
      await SeedEfficacyService.seedEfficacyData();
    }

    return {issues};
  }

  private validateExportPayload(payload: ExportPayload): string[] {
    const issues: string[] = [];

    payload.fields.forEach(({field}) => {
      const areaError = validateArea(field.area);
      if (areaError) {
        issues.push(`Поле ${field.name}: ${areaError}`);
      }
    });

    payload.treatments.forEach(treatment => {
      const areaError = validateArea(treatment.area);
      if (areaError) {
        issues.push(
          `Обработка ${treatment.id}: ${areaError}`,
        );
      }
      if (treatment.weatherTemperature !== undefined) {
        const tempError = validateTemperature(treatment.weatherTemperature);
        if (tempError) {
          issues.push(`Обработка ${treatment.id}: ${tempError}`);
        }
      }
      if (treatment.weatherHumidity !== undefined) {
        const humidityError = validateHumidity(treatment.weatherHumidity);
        if (humidityError) {
          issues.push(`Обработка ${treatment.id}: ${humidityError}`);
        }
      }
    });

    payload.warehouse.forEach(item => {
      if (item.quantity <= 0) {
        issues.push(`Склад: остаток продукта ${item.productId ?? item.product_id} имеет неположительное значение.`);
      }
    });

    if (payload.userSettings) {
      if (payload.userSettings.defaultArea !== undefined) {
        const areaError = validateArea(payload.userSettings.defaultArea);
        if (areaError) {
          issues.push(`Настройки: ${areaError}`);
        }
      }
      if (
        payload.userSettings.defaultSprayerCapacity !== undefined &&
        payload.userSettings.defaultSprayerCapacity <= 0
      ) {
        issues.push('Настройки: вместимость опрыскивателя должна быть больше 0');
      }
    } else {
      issues.push('Настройки: не найдены данные userSettings, будут использованы значения по умолчанию.');
    }

    return issues;
  }
}

export default new OfflineService();
