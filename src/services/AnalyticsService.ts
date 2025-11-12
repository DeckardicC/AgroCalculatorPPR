import CropRepository from '../repositories/CropRepository';
import TreatmentRepository from '../repositories/TreatmentRepository';
import ProductRepository from '../repositories/ProductRepository';
import {Treatment} from '../models/Treatment';
import {Crop} from '../models/Crop';
import {Product} from '../models/Product';
import {TimedCache} from '../utils/cache';

export interface CropEconomicStat {
  cropId: number;
  cropName: string;
  totalArea: number;
  totalCost: number;
  costPerHectare: number;
  treatments: number;
}

export interface ProductPerformanceStat {
  productId: number;
  productName: string;
  applications: number;
  totalDosage: number;
  totalCost: number;
  estimatedEfficacy?: number | null;
}

export interface SeasonalCostStat {
  season: string; // e.g. "2025"
  totalTreatments: number;
  totalArea: number;
  totalCost: number;
  avgCostPerTreatment: number;
}

export interface EconomicAnalytics {
  crops: CropEconomicStat[];
  products: ProductPerformanceStat[];
  seasons: SeasonalCostStat[];
  totals: {
    totalTreatments: number;
    totalArea: number;
    totalCost: number;
  };
}

class AnalyticsService {
  private cache = new TimedCache<EconomicAnalytics>({ttlMs: 5 * 60 * 1000});
  private cacheKey = 'economic';

  async getEconomicAnalytics(options: {forceRefresh?: boolean} = {}): Promise<EconomicAnalytics> {
    if (!options.forceRefresh) {
      const cached = this.cache.get(this.cacheKey);
      if (cached) {
        return cached;
      }
    }

    const [treatments, crops, products] = await Promise.all([
      TreatmentRepository.getAll(),
      CropRepository.getAll(),
      ProductRepository.getAll(),
    ]);

    const cropMap = new Map<number, Crop>();
    crops.forEach(crop => {
      if (crop.id) {
        cropMap.set(crop.id, crop);
      }
    });

    const productMap = new Map<number, Product>();
    products.forEach(product => {
      if (product.id) {
        productMap.set(product.id, product);
      }
    });

    const cropStats = this.buildCropStats(treatments, cropMap);
    const productStats = await this.buildProductStats(treatments, productMap);
    const seasonalStats = this.buildSeasonalStats(treatments);
    const totals = this.buildTotals(treatments);

    const analytics: EconomicAnalytics = {
      crops: cropStats,
      products: productStats,
      seasons: seasonalStats,
      totals,
    };

    this.cache.set(this.cacheKey, analytics);
    return analytics;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private buildCropStats(
    treatments: Treatment[],
    cropMap: Map<number, Crop>,
  ): CropEconomicStat[] {
    const stats = new Map<number, CropEconomicStat>();

    treatments.forEach(treatment => {
      const cropId = treatment.cropId;
      if (!cropId) {
        return;
      }

      const crop = cropMap.get(cropId);
      const area = treatment.area || 0;
      const cost = this.resolveTreatmentCost(treatment);

      const existing = stats.get(cropId) ?? {
        cropId,
        cropName: crop?.name ?? 'Неизвестная культура',
        totalArea: 0,
        totalCost: 0,
        costPerHectare: 0,
        treatments: 0,
      };

      existing.totalArea += area;
      existing.totalCost += cost;
      existing.treatments += 1;
      existing.costPerHectare = existing.totalArea > 0 ? existing.totalCost / existing.totalArea : 0;

      stats.set(cropId, existing);
    });

    return Array.from(stats.values()).sort((a, b) => b.totalCost - a.totalCost);
  }

  private async buildProductStats(
    treatments: Treatment[],
    productMap: Map<number, Product>,
  ): Promise<ProductPerformanceStat[]> {
    const stats = new Map<number, ProductPerformanceStat>();

    for (const treatment of treatments) {
      if (!treatment.products) continue;

      for (const treatmentProduct of treatment.products) {
        const productId = treatmentProduct.productId ?? treatmentProduct.product_id;
        if (!productId) continue;

        const product = productMap.get(productId);
        const key = productId;
        const dosage = treatmentProduct.dosage || 0;
        const cost = this.resolveTreatmentProductCost(treatmentProduct, product);

        const existing = stats.get(key) ?? {
          productId: key,
          productName: product?.name ?? 'Неизвестный препарат',
          applications: 0,
          totalDosage: 0,
          totalCost: 0,
          estimatedEfficacy: undefined,
        };

        existing.applications += 1;
        existing.totalDosage += dosage;
        existing.totalCost += cost;

        stats.set(key, existing);
      }
    }

    const result: ProductPerformanceStat[] = Array.from(stats.values());

    const productIds = result.map(stat => stat.productId).filter(id => id !== undefined);
    if (productIds.length > 0) {
      const efficacyMap = await ProductRepository.getAverageEfficacyBulk(productIds);
      result.forEach(stat => {
        if (efficacyMap.has(stat.productId)) {
          stat.estimatedEfficacy = efficacyMap.get(stat.productId) ?? null;
        } else if (stat.estimatedEfficacy === undefined) {
          stat.estimatedEfficacy = null;
        }
      });
    }

    return result.sort((a, b) => b.totalCost - a.totalCost);
  }

  private buildSeasonalStats(treatments: Treatment[]): SeasonalCostStat[] {
    const stats = new Map<string, SeasonalCostStat>();

    treatments.forEach(treatment => {
      const date = new Date(treatment.treatmentDate * 1000);
      const season = date.getFullYear().toString();
      const area = treatment.area || 0;
      const cost = this.resolveTreatmentCost(treatment);

      const existing = stats.get(season) ?? {
        season,
        totalTreatments: 0,
        totalArea: 0,
        totalCost: 0,
        avgCostPerTreatment: 0,
      };

      existing.totalTreatments += 1;
      existing.totalArea += area;
      existing.totalCost += cost;
      existing.avgCostPerTreatment =
        existing.totalTreatments > 0 ? existing.totalCost / existing.totalTreatments : 0;

      stats.set(season, existing);
    });

    return Array.from(stats.values()).sort((a, b) => parseInt(b.season, 10) - parseInt(a.season, 10));
  }

  private buildTotals(treatments: Treatment[]): EconomicAnalytics['totals'] {
    let totalTreatments = 0;
    let totalArea = 0;
    let totalCost = 0;

    treatments.forEach(treatment => {
      totalTreatments += 1;
      totalArea += treatment.area || 0;
      totalCost += this.resolveTreatmentCost(treatment);
    });

    return {
      totalTreatments,
      totalArea,
      totalCost,
    };
  }

  private resolveTreatmentCost(treatment: Treatment): number {
    if (typeof treatment.totalCost === 'number') {
      return treatment.totalCost;
    }

    if (treatment.products && treatment.products.length > 0) {
      return treatment.products.reduce((sum, product) => sum + (product.cost || 0), 0);
    }

    return 0;
  }

  private resolveTreatmentProductCost(
    treatmentProduct: Treatment['products'][number],
    product?: Product,
  ): number {
    if (typeof treatmentProduct.cost === 'number') {
      return treatmentProduct.cost;
    }

    if (product && product.pricePerUnit && product.unitDosage && product.minDosage && product.maxDosage) {
      const avgDosage = (product.minDosage + product.maxDosage) / 2;
      return avgDosage * product.pricePerUnit;
    }

    return 0;
  }
}

export default new AnalyticsService();
