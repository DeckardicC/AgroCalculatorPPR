import {Product} from '../models/Product';
import ProductRepository from '../repositories/ProductRepository';
import CalculationService from './CalculationService';
import {SoilType} from '../models/Field';
import CropRepository from '../repositories/CropRepository';

export interface ProductSelectionCriteria {
  cropId: number;
  cropPhase?: number;
  pestIds: number[];
  soilType?: SoilType;
  temperature?: number;
  humidity?: number;
  isLowHumidity?: boolean;
  daysUntilHarvest?: number;
  area: number;
  minEfficacy?: number;
}

export interface RecommendedProduct {
  product: Product;
  efficacy: number;
  adjustedDosage: number;
  costPerHectare: number;
  totalCost: number;
  waitingPeriod?: number;
  score: number; // Overall score for ranking
  warnings: string[];
}

class ProductSelectionService {
  // Multi-factor product selection algorithm
  async selectProducts(criteria: ProductSelectionCriteria): Promise<RecommendedProduct[]> {
    const minEfficacy = criteria.minEfficacy || 90;
    const recommendations: RecommendedProduct[] = [];

    const crop = await CropRepository.getById(criteria.cropId);

    // Step 1: Get products effective against selected pests
    const effectiveProducts = new Map<number, Product>();

    const pestProductsResults = await Promise.all(
      criteria.pestIds.map(pestId => ProductRepository.getEffectiveAgainstPest(pestId, minEfficacy)),
    );

    pestProductsResults.forEach(products => {
      products.forEach(product => {
        if (!effectiveProducts.has(product.id!)) {
          effectiveProducts.set(product.id!, product);
        }
      });
    });

    // Step 2: Filter by crop compatibility
    const compatibleProducts = await ProductRepository.getCompatibleWithCrop(
      criteria.cropId,
      criteria.cropPhase,
    );

    // Step 3: Filter products that are both effective and compatible
    const candidateProducts = Array.from(effectiveProducts.values()).filter(p =>
      compatibleProducts.some(cp => cp.id === p.id),
    );

    // Step 4: Calculate recommendations for each product
    const efficacyCache = new Map<number, Map<number, number>>();

    for (const product of candidateProducts) {
      // Check waiting period
      if (
        criteria.daysUntilHarvest &&
        product.waitingPeriod &&
        product.waitingPeriod > criteria.daysUntilHarvest
      ) {
        continue; // Skip products with waiting period too long
      }

      // Calculate adjusted dosage
      const dosageAdjustment = CalculationService.calculateAdjustedDosage(product, {
        soilType: criteria.soilType,
        temperature: criteria.temperature,
        humidity: criteria.humidity,
        isLowHumidity: criteria.isLowHumidity,
      });

      // Calculate cost
      const costPerHectare = CalculationService.calculateCostPerHectare(
        product,
        dosageAdjustment.adjustedDosage,
      );
      const totalCost = costPerHectare * criteria.area;

      // Calculate average efficacy against selected pests
      let productEfficacies = efficacyCache.get(product.id!);
      if (!productEfficacies) {
        const efficacyList = await ProductRepository.getPestEfficacyForProduct(product.id!);
        const map = new Map<number, number>();
        efficacyList.forEach(item => {
          map.set(item.pestId, item.efficacy);
        });
        efficacyCache.set(product.id!, map);
        productEfficacies = map;
      }

      let totalEfficacy = 0;
      let efficacyCount = 0;

      for (const pestId of criteria.pestIds) {
        const efficacy = productEfficacies.get(pestId);
        if (efficacy !== undefined && efficacy !== null) {
          totalEfficacy += efficacy;
          efficacyCount++;
        }
      }

      const avgEfficacy = efficacyCount > 0 ? totalEfficacy / efficacyCount : 0;

      // Calculate score (higher is better)
      // Factors: efficacy (weight: 0.4), cost efficiency (weight: 0.3), safety (weight: 0.3)
      const efficacyScore = avgEfficacy / 100;
      const costScore = costPerHectare > 0 ? 1 / (1 + costPerHectare / 1000) : 0.5;
      const safetyScore =
        product.waitingPeriod && product.waitingPeriod <= 30
          ? 1.0
          : product.waitingPeriod && product.waitingPeriod <= 60
            ? 0.8
            : 0.6;

      const score = efficacyScore * 0.4 + costScore * 0.3 + safetyScore * 0.3;

      // Check for warnings
      const warnings: string[] = [];
      if (crop && criteria.cropPhase !== undefined) {
        if (crop.bbhMin !== undefined && criteria.cropPhase < crop.bbhMin) {
          warnings.push(`Фаза BBCH ${criteria.cropPhase} ниже рекомендуемого минимума (${crop.bbhMin}).`);
        }
        if (crop.bbhMax !== undefined && criteria.cropPhase > crop.bbhMax) {
          warnings.push(`Фаза BBCH ${criteria.cropPhase} выше рекомендуемого максимума (${crop.bbhMax}).`);
        }
      }
      if (product.waitingPeriod && product.waitingPeriod > 30) {
        warnings.push(`Длительный интервал ожидания: ${product.waitingPeriod} дней`);
      }
      if (dosageAdjustment.coefficient > 1.2) {
        warnings.push('Высокая корректировка дозировки из-за условий');
      }
      if (dosageAdjustment.coefficient < 0.9) {
        warnings.push('Сниженная дозировка из-за условий');
      }

      recommendations.push({
        product,
        efficacy: Math.round(avgEfficacy * 10) / 10,
        adjustedDosage: Math.round(dosageAdjustment.adjustedDosage * 100) / 100,
        costPerHectare: Math.round(costPerHectare * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        waitingPeriod: product.waitingPeriod,
        score: Math.round(score * 1000) / 1000,
        warnings,
      });
    }

    // Step 5: Sort by score (descending)
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
  }

  // Check product compatibility for tank mix
  async checkCompatibility(
    productIds: number[],
  ): Promise<{compatible: boolean; issues: string[]}> {
    const issues: string[] = [];

    // In a real implementation, we would check the compatibility matrix
    // For now, we'll return a placeholder
    if (productIds.length <= 1) {
      return {compatible: true, issues: []};
    }

    // Placeholder: assume compatible unless we have specific data
    return {compatible: true, issues};
  }

  // Get alternative products
  async getAlternatives(
    productId: number,
    criteria: ProductSelectionCriteria,
  ): Promise<RecommendedProduct[]> {
    const allRecommendations = await this.selectProducts(criteria);
    return allRecommendations.filter(r => r.product.id !== productId).slice(0, 5);
  }
}

export default new ProductSelectionService();

