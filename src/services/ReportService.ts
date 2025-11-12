import {format} from 'date-fns';
import {ru} from 'date-fns/locale';
import FieldRepository from '../repositories/FieldRepository';
import CropRepository from '../repositories/CropRepository';
import TreatmentRepository from '../repositories/TreatmentRepository';
import WarehouseRepository from '../repositories/WarehouseRepository';
import TreatmentPlanRepository from '../repositories/TreatmentPlanRepository';
import AnalyticsService from './AnalyticsService';
import AgronomicAnalyticsService from './AgronomicAnalyticsService';
import ProductRepository from '../repositories/ProductRepository';
import {Treatment} from '../models/Treatment';

export interface GeneratedReport {
  id: string;
  title: string;
  description: string;
  filename: string;
  mimeType: string;
  content: string;
  format: 'csv';
}

const CSV_SEPARATOR = ';';

class ReportService {
  private formatDate(timestamp?: number | null): string {
    if (!timestamp) {
      return '';
    }
    try {
      return format(new Date(timestamp * 1000), 'dd.MM.yyyy', {locale: ru});
    } catch {
      return '';
    }
  }

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) {
      return '""';
    }
    const stringValue = String(value);
    const sanitized = stringValue.replace(/"/g, '""');
    return `"${sanitized}"`;
  }

  private toCsvLine(values: unknown[]): string {
    return values.map(value => this.csvEscape(value)).join(CSV_SEPARATOR);
  }

  async generateTreatmentReport(): Promise<GeneratedReport> {
    const [treatments, fields, crops, products] = await Promise.all([
      TreatmentRepository.getAll(),
      FieldRepository.getAll(),
      CropRepository.getAll(),
      ProductRepository.getAll(),
    ]);

    const fieldMap = new Map(fields.map(field => [field.id, field.name] as const));
    const cropMap = new Map(crops.map(crop => [crop.id, crop.name] as const));
    const productMap = new Map(products.map(product => [product.id, product.name] as const));

    const header = this.toCsvLine([
      'Дата',
      'Поле',
      'Культура',
      'Площадь, га',
      'Темп., °C',
      'Влажность, %',
      'Скорость ветра, м/с',
      'Оператор',
      'Оборудование',
      'Стоимость, ₽',
      'Продукты (название x дозировка x стоимость)',
      'Примечание',
    ]);

    const rows = treatments.map(treatment => this.treatmentRow(treatment, fieldMap, cropMap, productMap));

    const content = ['Отчёт по обработкам', `Сформирован: ${format(new Date(), 'dd.MM.yyyy HH:mm', {locale: ru})}`, '', header, ...rows].join('\n');

    return {
      id: 'treatments',
      title: 'Отчёт по обработкам',
      description: 'Полная выгрузка выполненных обработок с погодой и затратами',
      filename: `treatments_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
      mimeType: 'text/csv',
      content,
      format: 'csv',
    };
  }

  private treatmentRow(
    treatment: Treatment,
    fieldMap: Map<number | undefined, string | undefined>,
    cropMap: Map<number | undefined, string | undefined>,
    productMap: Map<number | undefined, string | undefined>,
  ): string {
    const productsString = (treatment.products ?? [])
      .map(product => {
        const name = productMap.get(product.productId ?? product.product_id) ?? 'Неизвестный препарат';
        const dosage = product.dosage ?? '-';
        const cost = product.cost ?? '-';
        return `${name} × ${dosage} × ${cost}`;
      })
      .join(' / ');

    return this.toCsvLine([
      this.formatDate(treatment.treatmentDate),
      fieldMap.get(treatment.fieldId) ?? 'Неизвестное поле',
      cropMap.get(treatment.cropId) ?? 'Неизвестная культура',
      treatment.area ?? '',
      treatment.weatherTemperature ?? '',
      treatment.weatherHumidity ?? '',
      treatment.weatherWindSpeed ?? '',
      treatment.operatorName ?? '',
      treatment.equipmentType ?? '',
      treatment.totalCost ?? '',
      productsString,
      treatment.notes ?? '',
    ]);
  }

  async generateEconomicAnalyticsReport(): Promise<GeneratedReport> {
    const analytics = await AnalyticsService.getEconomicAnalytics();

    const lines: string[] = [];
    lines.push('Экономическая аналитика');
    lines.push(this.toCsvLine(['Всего обработок', analytics.totals.totalTreatments]));
    lines.push(this.toCsvLine(['Общая площадь, га', analytics.totals.totalArea]));
    lines.push(this.toCsvLine(['Общая стоимость, ₽', analytics.totals.totalCost]));
    lines.push('');

    lines.push('По культурам');
    lines.push(this.toCsvLine(['Культура', 'Стоимость, ₽', 'Площадь, га', 'Стоимость/га', 'Обработки']));
    analytics.crops.forEach(stat => {
      lines.push(
        this.toCsvLine([
          stat.cropName,
          stat.totalCost.toFixed(2),
          stat.totalArea.toFixed(2),
          stat.costPerHectare.toFixed(2),
          stat.treatments,
        ]),
      );
    });

    lines.push('');
    lines.push('По препаратам');
    lines.push(this.toCsvLine(['Препарат', 'Применения', 'Дозировка суммарно', 'Стоимость, ₽', 'Средняя эффективность, %']));
    analytics.products.forEach(stat => {
      lines.push(
        this.toCsvLine([
          stat.productName,
          stat.applications,
          stat.totalDosage.toFixed(2),
          stat.totalCost.toFixed(2),
          stat.estimatedEfficacy !== null && stat.estimatedEfficacy !== undefined
            ? stat.estimatedEfficacy.toFixed(1)
            : '',
        ]),
      );
    });

    lines.push('');
    lines.push('По сезонам');
    lines.push(this.toCsvLine(['Сезон', 'Обработки', 'Площадь, га', 'Стоимость, ₽', 'Средняя стоимость/обработку, ₽']));
    analytics.seasons.forEach(stat => {
      lines.push(
        this.toCsvLine([
          stat.season,
          stat.totalTreatments,
          stat.totalArea.toFixed(2),
          stat.totalCost.toFixed(2),
          stat.avgCostPerTreatment.toFixed(2),
        ]),
      );
    });

    const content = lines.join('\n');

    return {
      id: 'economic-analytics',
      title: 'Экономическая аналитика',
      description: 'Сводные экономические показатели по культурам, препаратам и сезонам',
      filename: `economic_analytics_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
      mimeType: 'text/csv',
      content,
      format: 'csv',
    };
  }

  async generateAgronomicAnalyticsReport(): Promise<GeneratedReport> {
    const analytics = await AgronomicAnalyticsService.getAgronomicAnalytics();

    const lines: string[] = [];
    lines.push('Агрономическая аналитика');
    lines.push(this.toCsvLine(['Всего вредителей', analytics.totals.totalPests]));
    lines.push(this.toCsvLine(['Обработки', analytics.totals.totalTreatments]));
    lines.push(this.toCsvLine(['Средняя эффективность, %', analytics.totals.overallAvgEfficacy.toFixed(1)]));
    lines.push('');

    lines.push('Эффективность по вредителям');
    lines.push(this.toCsvLine(['Вредитель', 'Тип', 'Обработок', 'Средняя эффективность, %']));
    analytics.pests.forEach(stat => {
      lines.push(
        this.toCsvLine([
          stat.pestName,
          stat.pestType,
          stat.treatments,
          stat.avgEfficacy.toFixed(1),
        ]),
      );
    });

    lines.push('');
    lines.push('Рекомендации');
    lines.push(this.toCsvLine(['Вредитель', 'Обработок', 'Средняя эффективность, %', 'Комментарий']));
    analytics.recommendations.forEach(recommendation => {
      lines.push(
        this.toCsvLine([
          recommendation.pestName,
          recommendation.treatments,
          recommendation.avgEfficacy.toFixed(1),
          recommendation.message,
        ]),
      );
    });

    lines.push('');
    lines.push('Препараты по вредителям');
    lines.push(this.toCsvLine(['Вредитель', 'Препарат', 'Применения', 'Средняя эффективность, %']));
    analytics.pests.forEach(stat => {
      stat.products.forEach(product => {
        lines.push(
          this.toCsvLine([
            stat.pestName,
            product.productName,
            product.applications,
            product.avgEfficacy.toFixed(1),
          ]),
        );
      });
    });

    const content = lines.join('\n');

    return {
      id: 'agronomic-analytics',
      title: 'Агрономическая аналитика',
      description: 'Показатели эффективности средств защиты по вредителям и сезонам',
      filename: `agronomic_analytics_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
      mimeType: 'text/csv',
      content,
      format: 'csv',
    };
  }

  async generateTreatmentPlanReport(): Promise<GeneratedReport> {
    const [plans, fields, crops] = await Promise.all([
      TreatmentPlanRepository.getAll(),
      FieldRepository.getAll(),
      CropRepository.getAll(),
    ]);

    const fieldMap = new Map(fields.map(field => [field.id, field.name] as const));
    const cropMap = new Map(crops.map(crop => [crop.id, crop.name] as const));

    const lines: string[] = [];
    lines.push('План обработки полей');
    lines.push(this.toCsvLine(['Дата', 'Поле', 'Культура', 'Статус', 'Приоритет', 'Окно начала', 'Окно окончания', 'Причина', 'Рекомендованные продукты', 'Склад']));

    plans.forEach(plan => {
      const recommended = Array.isArray(plan.recommendedProducts)
        ? plan.recommendedProducts.join(' / ')
        : plan.recommendedProducts || '';
      lines.push(
        this.toCsvLine([
          this.formatDate(plan.plannedDate),
          fieldMap.get(plan.fieldId) ?? '',
          plan.cropId ? cropMap.get(plan.cropId) ?? '' : '',
          plan.status,
          plan.priority,
          this.formatDate(plan.windowStart),
          this.formatDate(plan.windowEnd),
          plan.reason ?? '',
          recommended,
          plan.warehouseStatus ?? '',
        ]),
      );
    });

    const content = lines.join('\n');

    return {
      id: 'treatment-plans',
      title: 'План обработок',
      description: 'Сезонное планирование работ по полям',
      filename: `treatment_plans_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
      mimeType: 'text/csv',
      content,
      format: 'csv',
    };
  }

  async generateWarehouseReport(): Promise<GeneratedReport> {
    const inventory = await WarehouseRepository.getAll();
    const products = await ProductRepository.getAll();
    const productMap = new Map(products.map(product => [product.id, product.name] as const));

    const header = this.toCsvLine([
      'Препарат',
      'Количество',
      'Единица',
      'Дата закупки',
      'Дата окончания',
      'Стоимость закупки, ₽',
    ]);

    const rows = inventory.map(item =>
      this.toCsvLine([
        productMap.get(item.productId) ?? 'Неизвестный препарат',
        item.quantity,
        item.unit,
        this.formatDate(item.purchaseDate),
        this.formatDate(item.expirationDate),
        item.purchasePrice ?? '',
      ]),
    );

    const content = ['Складской остаток', header, ...rows].join('\n');

    return {
      id: 'warehouse',
      title: 'Складской отчёт',
      description: 'Текущие остатки препаратов, сроки годности и стоимость',
      filename: `warehouse_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
      mimeType: 'text/csv',
      content,
      format: 'csv',
    };
  }

  async generateAllReports(): Promise<GeneratedReport[]> {
    const [treatments, economic, agronomic, plans, warehouse] = await Promise.all([
      this.generateTreatmentReport(),
      this.generateEconomicAnalyticsReport(),
      this.generateAgronomicAnalyticsReport(),
      this.generateTreatmentPlanReport(),
      this.generateWarehouseReport(),
    ]);

    return [treatments, economic, agronomic, plans, warehouse];
  }
}

export default new ReportService();
