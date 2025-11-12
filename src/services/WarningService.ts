import {differenceInCalendarDays} from 'date-fns';
import TreatmentRepository from '../repositories/TreatmentRepository';
import WarehouseRepository from '../repositories/WarehouseRepository';
import ProductRepository from '../repositories/ProductRepository';
import FieldRepository from '../repositories/FieldRepository';
import ResistanceService, {ResistanceRisk} from './ResistanceService';
import {Treatment} from '../models/Treatment';
import {WarehouseInventory} from '../models/Warehouse';
import {Product} from '../models/Product';
import {quarantineRestrictions, phytotoxicityGuidelines} from '../data/regulations';

export type WarningSeverity = 'info' | 'caution' | 'critical';

export interface WarningItem {
  id: string;
  category: WarningCategory;
  title: string;
  message: string;
  severity: WarningSeverity;
  relatedFieldId?: number;
  relatedProductId?: number;
  relatedTreatmentId?: number;
}

export type WarningCategory =
  | 'resistance'
  | 'phytotoxicity'
  | 'quarantine'
  | 'inventory'
  | 'weather';

export interface WarningSummary {
  generatedAt: number;
  warnings: WarningItem[];
}

const LOW_STOCK_THRESHOLD = 5;
const HIGH_WIND_THRESHOLD = 7;
const LOW_HUMIDITY_THRESHOLD = 35;
const HIGH_TEMPERATURE_THRESHOLD = 30;

class WarningService {
  async getWarnings(): Promise<WarningSummary> {
    const [treatments, products, inventory, fields] = await Promise.all([
      TreatmentRepository.getAll(),
      ProductRepository.getAll(),
      WarehouseRepository.getAll(),
      FieldRepository.getAll(),
    ]);

    const productMap = new Map<number, Product>();
    products.forEach(product => {
      if (product.id) {
        productMap.set(product.id, product);
      }
    });

    const fieldMap = new Map<number, string>();
    fields.forEach(field => {
      if (field.id) {
        fieldMap.set(field.id, field.name);
      }
    });

    const warnings: WarningItem[] = [];

    const resistanceRisks = await ResistanceService.analyze(fieldMap);

    warnings.push(
      ...this.transformResistanceRisks(resistanceRisks),
      ...this.checkPhytotoxicity(treatments, productMap, fieldMap),
      ...this.checkQuarantine(treatments, productMap, fieldMap),
      ...this.checkInventory(inventory, productMap),
      ...this.checkWeather(treatments, fieldMap),
    );

    return {
      generatedAt: Date.now(),
      warnings: warnings.sort((a, b) => this.severityRank(b.severity) - this.severityRank(a.severity)),
    };
  }

  private transformResistanceRisks(risks: ResistanceRisk[]): WarningItem[] {
    const warnings: WarningItem[] = [];
    risks.forEach(risk => {
      if (risk.riskLevel === 'low') {
        return;
      }
      warnings.push({
        id: `res-${risk.fieldId}-${risk.activeIngredient}`,
        category: 'resistance',
        title: 'Риск резистентности',
        message: `Поле "${risk.fieldName ?? 'Неизвестное поле'}": обнаружено ${risk.usageCount} обработок действующим веществом ${risk.activeIngredient} (порог ${risk.threshold}). ${
          risk.notes ?? ''
        } Рекомендуемый интервал — каждые ${risk.intervalDays} дн.`.trim(),
        severity: risk.riskLevel === 'high' ? 'critical' : 'caution',
        relatedFieldId: risk.fieldId,
      });
    });
    return warnings;
  }

  private checkPhytotoxicity(
    treatments: Treatment[],
    productMap: Map<number, Product>,
    fieldMap: Map<number, string>,
  ): WarningItem[] {
    const warnings: WarningItem[] = [];

    treatments.forEach(treatment => {
      if (!treatment.products || !treatment.fieldId) return;

      treatment.products.forEach(productUsage => {
        const productId = productUsage.productId ?? productUsage.product_id;
        if (!productId) return;

        const product = productMap.get(productId);
        if (!product) return;

        const guideline = phytotoxicityGuidelines.find(item =>
          item.productName.toLowerCase() === product.name.toLowerCase(),
        );

        let cautionMessage: string | null = null;
        if (guideline) {
          if (
            guideline.maxTemperature !== undefined &&
            treatment.weatherTemperature !== undefined &&
            treatment.weatherTemperature > guideline.maxTemperature
          ) {
            cautionMessage = guideline.caution;
          }
          if (
            !cautionMessage &&
            guideline.minTemperature !== undefined &&
            treatment.weatherTemperature !== undefined &&
            treatment.weatherTemperature < guideline.minTemperature
          ) {
            cautionMessage = guideline.caution;
          }
          if (
            !cautionMessage &&
            guideline.minHumidity !== undefined &&
            treatment.weatherHumidity !== undefined &&
            treatment.weatherHumidity < guideline.minHumidity
          ) {
            cautionMessage = guideline.caution;
          }
        }

        if (!cautionMessage) {
          if (treatment.weatherTemperature && treatment.weatherTemperature > HIGH_TEMPERATURE_THRESHOLD) {
            cautionMessage = `Температура при обработке превышала ${HIGH_TEMPERATURE_THRESHOLD}°C. Проверьте риск испарения и фитотоксичности.`;
          }
          if (
            !cautionMessage &&
            treatment.weatherHumidity !== undefined &&
            treatment.weatherHumidity < LOW_HUMIDITY_THRESHOLD
          ) {
            cautionMessage = 'Низкая влажность воздуха (<35%) может повысить риск фитотоксичности. Рекомендуется снижение дозировки или перенос обработки.';
          }
        }

        if (cautionMessage) {
          warnings.push({
            id: `phyto-${treatment.id}-${productId}`,
            category: 'phytotoxicity',
            title: 'Риск фитотоксичности',
            message: `Поле "${fieldMap.get(treatment.fieldId) ?? 'Неизвестное поле'}": ${product.name}. ${cautionMessage}`,
            severity: 'caution',
            relatedFieldId: treatment.fieldId,
            relatedTreatmentId: treatment.id ?? undefined,
            relatedProductId: productId,
          });
        }
      });
    });

    return warnings;
  }

  private checkQuarantine(
    treatments: Treatment[],
    productMap: Map<number, Product>,
    fieldMap: Map<number, string>,
  ): WarningItem[] {
    const warnings: WarningItem[] = [];
    const quarantinePestSet = new Set(
      quarantineRestrictions.map(restriction => restriction.pestName.toLowerCase()),
    );

    treatments.forEach(treatment => {
      if (!treatment.products || !treatment.fieldId || !treatment.notes) return;

      quarantineRestrictions.forEach(restriction => {
        if (treatment.notes?.toLowerCase().includes(restriction.pestName.toLowerCase())) {
          warnings.push({
            id: `quar-${treatment.id}-${restriction.pestName}`,
            category: 'quarantine',
            title: 'Карантинное ограничение',
            message: `Поле "${fieldMap.get(treatment.fieldId) ?? 'Неизвестное поле'}": обнаружен ${restriction.pestName}. ${restriction.restriction}`,
            severity: 'critical',
            relatedFieldId: treatment.fieldId,
            relatedTreatmentId: treatment.id ?? undefined,
          });
        }
      });

      if (!treatment.products) return;
      treatment.products.forEach(productUsage => {
        const productId = productUsage.productId ?? productUsage.product_id;
        if (!productId) return;

        const efficacyList = productMap.get(productId)
          ? quarantineRestrictions.filter(restriction =>
              quarantinePestSet.has(restriction.pestName.toLowerCase()),
            )
          : [];

        if (efficacyList.length > 0) {
          // placeholder: future integration with pest detection results
        }
      });
    });

    return warnings;
  }

  private checkInventory(
    inventory: WarehouseInventory[],
    productMap: Map<number, Product>,
  ): WarningItem[] {
    const warnings: WarningItem[] = [];

    inventory.forEach(item => {
      const product = item.productId ? productMap.get(item.productId) : undefined;
      if (!product) return;

      if (item.expirationDate) {
        const days = differenceInCalendarDays(new Date(item.expirationDate * 1000), new Date());
        if (days < 0) {
          warnings.push({
            id: `inv-expired-${item.id}`,
            category: 'inventory',
            title: 'Просроченный препарат',
            message: `${product.name}: срок годности истек ${Math.abs(days)} дней назад.`,
            severity: 'critical',
            relatedProductId: item.productId,
          });
        } else if (days <= 30) {
          warnings.push({
            id: `inv-expiring-${item.id}`,
            category: 'inventory',
            title: 'Скорое истечение срока годности',
            message: `${product.name}: срок годности истекает через ${days} дней.`,
            severity: 'caution',
            relatedProductId: item.productId,
          });
        }
      }

      if (item.quantity <= LOW_STOCK_THRESHOLD) {
        warnings.push({
          id: `inv-low-${item.id}`,
          category: 'inventory',
          title: 'Низкий остаток на складе',
          message: `${product.name}: остаток ${item.quantity} ${item.unit}. Рекомендуется пополнение склада.`,
          severity: 'info',
          relatedProductId: item.productId,
        });
      }
    });

    return warnings;
  }

  private checkWeather(treatments: Treatment[], fieldMap: Map<number, string>): WarningItem[] {
    const warnings: WarningItem[] = [];

    treatments.forEach(treatment => {
      if (!treatment.fieldId) return;

      if (treatment.weatherWindSpeed !== undefined && treatment.weatherWindSpeed > HIGH_WIND_THRESHOLD) {
        warnings.push({
          id: `weather-wind-${treatment.id}`,
          category: 'weather',
          title: 'Неблагоприятная погода',
          message: `Поле "${fieldMap.get(treatment.fieldId) ?? 'Неизвестное поле'}": скорость ветра ${treatment.weatherWindSpeed} м/с превышала допустимые значения. Возможен снос препаратов.`,
          severity: 'caution',
          relatedFieldId: treatment.fieldId,
          relatedTreatmentId: treatment.id ?? undefined,
        });
      }
    });

    return warnings;
  }

  private severityRank(severity: WarningSeverity): number {
    switch (severity) {
      case 'critical':
        return 3;
      case 'caution':
        return 2;
      default:
        return 1;
    }
  }
}

export default new WarningService();
