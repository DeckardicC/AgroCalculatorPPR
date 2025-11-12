import PestRepository from '../repositories/PestRepository';
import TreatmentRepository from '../repositories/TreatmentRepository';
import ProductRepository from '../repositories/ProductRepository';
import type {Pest} from '../models/Pest';
import type {Product} from '../models/Product';
import {TimedCache} from '../utils/cache';

export interface PestControlStat {
  pestId: number;
  pestName: string;
  pestType: string;
  treatments: number;
  avgEfficacy: number;
  products: Array<{
    productId: number;
    productName: string;
    applications: number;
    avgEfficacy: number;
  }>;
}

export interface PestSeasonTrend {
  pestId: number;
  pestName: string;
  seasons: Array<{
    season: string;
    treatments: number;
  }>;
}

export interface SeasonComparisonStat {
  season: string;
  totalTreatments: number;
  uniquePests: number;
  uniqueProducts: number;
}

export interface AgronomicRecommendation {
  pestId: number;
  pestName: string;
  avgEfficacy: number;
  treatments: number;
  message: string;
}

export interface AgronomicAnalytics {
  pests: PestControlStat[];
  trends: PestSeasonTrend[];
  seasons: SeasonComparisonStat[];
  recommendations: AgronomicRecommendation[];
  totals: {
    totalPests: number;
    totalTreatments: number;
    overallAvgEfficacy: number;
  };
}

interface ProductPestEfficacy {
  pestId: number;
  pestName: string;
  pestType: string;
  efficacy: number;
}

class AgronomicAnalyticsService {
  private cache = new TimedCache<AgronomicAnalytics>({ttlMs: 5 * 60 * 1000});
  private cacheKey = 'agronomic';

  async getAgronomicAnalytics(options: {forceRefresh?: boolean} = {}): Promise<AgronomicAnalytics> {
    if (!options.forceRefresh) {
      const cached = this.cache.get(this.cacheKey);
      if (cached) {
        return cached;
      }
    }

    const [treatments, pests, products] = await Promise.all([
      TreatmentRepository.getAll(),
      PestRepository.getAll(),
      ProductRepository.getAll(),
    ]);

    const pestMap = new Map<number, Pest>();
    pests.forEach(pest => {
      if (pest.id) {
        pestMap.set(pest.id, pest);
      }
    });

    const productMap = new Map<number, Product>();
    products.forEach(product => {
      if (product.id) {
        productMap.set(product.id, product);
      }
    });

    const pestEfficacyCache = new Map<number, ProductPestEfficacy[]>();
    const pestStatsMap = new Map<
      number,
      {
        pestId: number;
        pestName: string;
        pestType: string;
        treatmentSet: Set<number>;
        totalEfficacy: number;
        efficacySamples: number;
        productMap: Map<
          number,
          {
            productId: number;
            productName: string;
            applications: number;
            totalEfficacy: number;
          }
        >;
      }
    >();

    const seasonMap = new Map<
      string,
      {
        totalTreatments: number;
        pests: Set<number>;
        products: Set<number>;
      }
    >();

    const pestTrendMap = new Map<
      number,
      Map<string, {season: string; treatments: number}>
    >();

    for (const treatment of treatments) {
      const treatmentId = treatment.id ?? 0;
      const seasonKey = new Date(treatment.treatmentDate * 1000).getFullYear().toString();
      const seasonEntry = seasonMap.get(seasonKey) ?? {
        totalTreatments: 0,
        pests: new Set<number>(),
        products: new Set<number>(),
      };
      seasonEntry.totalTreatments += 1;

      const treatmentPestSet = new Set<number>();

      if (treatment.products) {
        for (const treatmentProduct of treatment.products) {
          const productId = treatmentProduct.productId ?? treatmentProduct.product_id;
          if (!productId) continue;

          seasonEntry.products.add(productId);

          let efficacyList = pestEfficacyCache.get(productId);
          if (!efficacyList) {
            efficacyList = await ProductRepository.getPestEfficacyForProduct(productId);
            pestEfficacyCache.set(productId, efficacyList);
          }

          const product = productMap.get(productId);

          for (const efficacy of efficacyList) {
            const pestId = efficacy.pestId;
            treatmentPestSet.add(pestId);

            const pestInfo = pestMap.get(pestId);
            const pestName = pestInfo?.name ?? efficacy.pestName;
            const pestType = pestInfo?.type ?? efficacy.pestType;

            const pestEntry = pestStatsMap.get(pestId) ?? {
              pestId,
              pestName,
              pestType,
              treatmentSet: new Set<number>(),
              totalEfficacy: 0,
              efficacySamples: 0,
              productMap: new Map(),
            };

            pestEntry.totalEfficacy += efficacy.efficacy;
            pestEntry.efficacySamples += 1;

            const productEntry = pestEntry.productMap.get(productId) ?? {
              productId,
              productName: product?.name ?? 'Неизвестный препарат',
              applications: 0,
              totalEfficacy: 0,
            };

            productEntry.applications += 1;
            productEntry.totalEfficacy += efficacy.efficacy;
            pestEntry.productMap.set(productId, productEntry);

            pestStatsMap.set(pestId, pestEntry);
          }
        }
      }

      treatmentPestSet.forEach(pestId => {
        const pestEntry = pestStatsMap.get(pestId);
        if (pestEntry) {
          pestEntry.treatmentSet.add(treatmentId);
        }

        const trendEntry = pestTrendMap.get(pestId) ?? new Map();
        const seasonTrend = trendEntry.get(seasonKey) ?? {season: seasonKey, treatments: 0};
        seasonTrend.treatments += 1;
        trendEntry.set(seasonKey, seasonTrend);
        pestTrendMap.set(pestId, trendEntry);

        seasonEntry.pests.add(pestId);
      });

      seasonMap.set(seasonKey, seasonEntry);
    }

    const pestStats: PestControlStat[] = Array.from(pestStatsMap.values()).map(pestEntry => {
    const productUsages = Array.from(pestEntry.productMap.values()).map(product => ({
        productId: product.productId,
        productName: product.productName,
        applications: product.applications,
        avgEfficacy:
          product.applications > 0 ? product.totalEfficacy / product.applications : 0,
      }));

      const totalTreatments = pestEntry.treatmentSet.size;
      const avgEfficacy =
        pestEntry.efficacySamples > 0 ? pestEntry.totalEfficacy / pestEntry.efficacySamples : 0;

      return {
        pestId: pestEntry.pestId,
        pestName: pestEntry.pestName,
        pestType: pestEntry.pestType,
        treatments: totalTreatments,
        avgEfficacy,
        products: productUsages.sort((a, b) => b.applications - a.applications),
      };
    });

    const trends: PestSeasonTrend[] = Array.from(pestTrendMap.entries()).map(([pestId, trend]) => {
      const pestName = pestMap.get(pestId)?.name ?? 'Неизвестный вредитель';
      return {
        pestId,
        pestName,
        seasons: Array.from(trend.values()).sort((a, b) => parseInt(a.season, 10) - parseInt(b.season, 10)),
      };
    });

    const seasons: SeasonComparisonStat[] = Array.from(seasonMap.entries())
      .map(([season, entry]) => ({
        season,
        totalTreatments: entry.totalTreatments,
        uniquePests: entry.pests.size,
        uniqueProducts: entry.products.size,
      }))
      .sort((a, b) => parseInt(a.season, 10) - parseInt(b.season, 10));

    const recommendations = this.buildRecommendations(pestStats);

    const totals = this.buildTotals(pestStats);

    const analytics: AgronomicAnalytics = {
      pests: pestStats.sort((a, b) => b.treatments - a.treatments),
      trends,
      seasons,
      recommendations,
      totals,
    };

    this.cache.set(this.cacheKey, analytics);
    return analytics;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private buildRecommendations(pests: PestControlStat[]): AgronomicRecommendation[] {
    const recommendations: AgronomicRecommendation[] = [];

    pests.forEach(pest => {
      if (pest.treatments === 0) {
        return;
      }

      if (pest.avgEfficacy < 80) {
        recommendations.push({
          pestId: pest.pestId,
          pestName: pest.pestName,
          avgEfficacy: pest.avgEfficacy,
          treatments: pest.treatments,
          message: 'Низкая эффективность. Рассмотрите альтернативные препараты или стратегии.',
        });
        return;
      }

      const topProduct = pest.products[0];
      if (topProduct && topProduct.applications >= 3 && topProduct.avgEfficacy < 85) {
        recommendations.push({
          pestId: pest.pestId,
          pestName: pest.pestName,
          avgEfficacy: pest.avgEfficacy,
          treatments: pest.treatments,
          message: `Препарат ${topProduct.productName} показывает снижение эффективности. Проверьте риск резистентности и обновите схему защиты.`,
        });
      }
    });

    return recommendations;
  }

  private buildTotals(pests: PestControlStat[]): AgronomicAnalytics['totals'] {
    const totalPests = pests.length;
    const totalTreatments = pests.reduce((sum, pest) => sum + pest.treatments, 0);
    const totalWeightedEfficacy = pests.reduce(
      (sum, pest) => sum + pest.avgEfficacy * pest.treatments,
      0,
    );

    const overallAvgEfficacy =
      totalTreatments > 0 ? totalWeightedEfficacy / totalTreatments : 0;

    return {
      totalPests,
      totalTreatments,
      overallAvgEfficacy,
    };
  }
}

export default new AgronomicAnalyticsService();
