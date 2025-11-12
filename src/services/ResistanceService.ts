import {addDays} from 'date-fns';
import TreatmentRepository from '../repositories/TreatmentRepository';
import ProductRepository from '../repositories/ProductRepository';
import ResistanceRepository, {ResistanceRecord} from '../repositories/ResistanceRepository';
import {resistanceThresholds} from '../data/regulations';
import {Treatment} from '../models/Treatment';
import {Product} from '../models/Product';

export interface ResistanceRisk {
  fieldId: number;
  fieldName?: string;
  activeIngredient: string;
  usageCount: number;
  lastTreatmentDate?: number;
  threshold: number;
  intervalDays: number;
  riskLevel: 'low' | 'medium' | 'high';
  notes?: string;
}

const LOOKBACK_DAYS = 90;

class ResistanceService {
  async analyze(fieldMap: Map<number, string>): Promise<ResistanceRisk[]> {
    const [treatments, products] = await Promise.all([
      TreatmentRepository.getAll(),
      ProductRepository.getAll(),
    ]);

    const productMap = new Map<number, Product>();
    products.forEach(product => {
      if (product.id) {
        productMap.set(product.id, product);
      }
    });

    const risks = this.calculateRisks(treatments, fieldMap, productMap);
    await this.persistRisks(risks);
    return risks;
  }

  private calculateRisks(
    treatments: Treatment[],
    fieldMap: Map<number, string>,
    productMap: Map<number, Product>,
  ): ResistanceRisk[] {
    const now = Date.now();
    const lookback = addDays(now, -LOOKBACK_DAYS).getTime();

    const usageMap = new Map<string, {count: number; lastDate: number}>();

    treatments.forEach(treatment => {
      if (!treatment.products || !treatment.fieldId) {
        return;
      }
      const treatmentDateMs = treatment.treatmentDate * 1000;
      if (treatmentDateMs < lookback) {
        return;
      }

      treatment.products.forEach(productUsage => {
        const productId = productUsage.productId ?? productUsage.product_id;
        if (!productId) {
          return;
        }
        const product = productMap.get(productId);
        const activeIngredient = product?.activeIngredient;
        if (!activeIngredient) {
          return;
        }

        const key = `${treatment.fieldId}__${activeIngredient.toLowerCase()}`;
        const entry = usageMap.get(key) ?? {count: 0, lastDate: treatmentDateMs};
        entry.count += 1;
        entry.lastDate = Math.max(entry.lastDate, treatmentDateMs);
        usageMap.set(key, entry);
      });
    });

    const risks: ResistanceRisk[] = [];
    usageMap.forEach((value, key) => {
      const [fieldIdStr, activeIngredientLower] = key.split('__');
      const fieldId = parseInt(fieldIdStr, 10);
      const threshold = resistanceThresholds.find(
        item => item.activeIngredient.toLowerCase() === activeIngredientLower,
      );
      if (!threshold) {
        return;
      }

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (value.count > threshold.maxApplicationsPerSeason) {
        riskLevel = 'high';
      } else if (value.count === threshold.maxApplicationsPerSeason) {
        riskLevel = 'medium';
      }

      const notes = `За последние ${LOOKBACK_DAYS} дней проведено ${value.count} обработок.`;

      risks.push({
        fieldId,
        fieldName: fieldMap.get(fieldId),
        activeIngredient: threshold.activeIngredient,
        usageCount: value.count,
        lastTreatmentDate: value.lastDate,
        threshold: threshold.maxApplicationsPerSeason,
        intervalDays: threshold.intervalDays,
        riskLevel,
        notes,
      });
    });

    return risks;
  }

  private async persistRisks(risks: ResistanceRisk[]): Promise<void> {
    await ResistanceRepository.clear();
    const records: ResistanceRecord[] = risks.map(risk => ({
      fieldId: risk.fieldId,
      activeIngredient: risk.activeIngredient,
      usageCount: risk.usageCount,
      lastTreatmentDate: risk.lastTreatmentDate,
      riskLevel: risk.riskLevel,
      notes: risk.notes,
    }));
    if (records.length > 0) {
      await ResistanceRepository.save(records);
    }
  }
}

export default new ResistanceService();
export type {ResistanceRisk};
