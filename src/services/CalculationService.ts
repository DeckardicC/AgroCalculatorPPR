import {Product} from '../models/Product';
import {SoilType} from '../models/Field';

export interface DosageAdjustment {
  baseDosage: number;
  adjustedDosage: number;
  coefficient: number;
  factors: {
    soil?: number;
    temperature?: number;
    humidity?: number;
    plantCondition?: number;
  };
}

export interface WorkingSolutionCalculation {
  area: number; // hectares
  recommendedVolume: number; // l/ha
  totalVolume: number; // liters
  productAmount: number; // liters or kg
  waterAmount: number; // liters
  costPerHectare: number;
  totalCost: number;
}

class CalculationService {
  // Coefficient System
  getSoilCoefficient(soilType: SoilType | undefined): number {
    switch (soilType) {
      case SoilType.SAND:
        return 0.8;
      case SoilType.LOAM:
        return 1.0;
      case SoilType.CHERNOZEM:
        return 1.2;
      case SoilType.CLAY:
        return 1.1;
      default:
        return 1.0;
    }
  }

  getTemperatureCoefficient(temperature: number | undefined): number {
    if (temperature === undefined) return 1.0;
    if (temperature < 15) return 1.3;
    if (temperature >= 15 && temperature <= 25) return 1.0;
    return 0.8; // > 25°C
  }

  getHumidityCoefficient(humidity: number | undefined, isLow: boolean = false): number {
    if (humidity === undefined && !isLow) return 1.0;
    if (isLow || (humidity !== undefined && humidity < 40)) return 1.2;
    if (humidity !== undefined && humidity > 80) return 0.9;
    return 1.0; // normal
  }

  getPlantConditionCoefficient(isWeakened: boolean = false): number {
    return isWeakened ? 0.8 : 1.0; // среднее значение между 0.7-0.9
  }

  // Calculate adjusted dosage based on conditions
  calculateAdjustedDosage(
    product: Product,
    conditions: {
      soilType?: SoilType;
      temperature?: number;
      humidity?: number;
      isLowHumidity?: boolean;
      isWeakenedPlants?: boolean;
    },
  ): DosageAdjustment {
    const baseDosage = (product.minDosage + product.maxDosage) / 2;

    const soilCoeff = this.getSoilCoefficient(conditions.soilType);
    const tempCoeff = this.getTemperatureCoefficient(conditions.temperature);
    const humidityCoeff = this.getHumidityCoefficient(
      conditions.humidity,
      conditions.isLowHumidity,
    );
    const plantCoeff = this.getPlantConditionCoefficient(conditions.isWeakenedPlants);

    const totalCoefficient = soilCoeff * tempCoeff * humidityCoeff * plantCoeff;
    const adjustedDosage = baseDosage * totalCoefficient;

    // Ensure dosage stays within min-max range
    const finalDosage = Math.max(
      product.minDosage,
      Math.min(product.maxDosage, adjustedDosage),
    );

    return {
      baseDosage,
      adjustedDosage: finalDosage,
      coefficient: totalCoefficient,
      factors: {
        soil: soilCoeff,
        temperature: tempCoeff,
        humidity: humidityCoeff,
        plantCondition: plantCoeff,
      },
    };
  }

  // Calculate working solution volume
  calculateWorkingSolution(
    area: number,
    product: Product,
    dosage: number,
    conditions: {
      sprayerType?: 'boom' | 'aerial';
      windSpeed?: number;
      temperature?: number;
      cropPhase?: number;
      coverageRequirement?: 'low' | 'medium' | 'high';
    },
  ): WorkingSolutionCalculation {
    // Base volume calculation
    let baseVolume = 200; // l/ha default

    // Adjust based on sprayer type
    if (conditions.sprayerType === 'aerial') {
      baseVolume = 50; // l/ha for aerial
    } else if (conditions.sprayerType === 'boom') {
      baseVolume = 200; // l/ha for boom
    }

    // Adjust based on wind speed
    if (conditions.windSpeed !== undefined) {
      if (conditions.windSpeed > 5) {
        baseVolume *= 1.2; // Increase volume in windy conditions
      } else if (conditions.windSpeed < 2) {
        baseVolume *= 0.9; // Decrease volume in calm conditions
      }
    }

    // Adjust based on temperature
    if (conditions.temperature !== undefined) {
      if (conditions.temperature > 25) {
        baseVolume *= 1.1; // Increase volume in hot weather
      } else if (conditions.temperature < 15) {
        baseVolume *= 0.95; // Slight decrease in cold weather
      }
    }

    // Adjust based on coverage requirement
    if (conditions.coverageRequirement === 'high') {
      baseVolume *= 1.2;
    } else if (conditions.coverageRequirement === 'low') {
      baseVolume *= 0.8;
    }

    // Ensure reasonable limits
    const recommendedVolume = Math.max(100, Math.min(400, baseVolume));

    // Calculate totals
    const totalVolume = recommendedVolume * area;
    const productAmount = dosage * area;
    const waterAmount = totalVolume - productAmount;

    // Calculate cost
    const costPerHectare = product.pricePerUnit
      ? (dosage * product.pricePerUnit) / (product.unit === 'кг' || product.unit === 'kg' ? 1 : 1)
      : 0;
    const totalCost = costPerHectare * area;

    return {
      area,
      recommendedVolume: Math.round(recommendedVolume * 10) / 10,
      totalVolume: Math.round(totalVolume * 10) / 10,
      productAmount: Math.round(productAmount * 100) / 100,
      waterAmount: Math.round(waterAmount * 10) / 10,
      costPerHectare: Math.round(costPerHectare * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  }

  // Calculate cost per hectare
  calculateCostPerHectare(product: Product, dosage: number): number {
    if (!product.pricePerUnit) return 0;
    return (dosage * product.pricePerUnit) / (product.unit === 'кг' || product.unit === 'kg' ? 1 : 1);
  }

  // Calculate total cost for multiple products
  calculateTotalCost(
    products: Array<{product: Product; dosage: number}>,
    area: number,
  ): number {
    let totalCost = 0;
    for (const item of products) {
      const costPerHa = this.calculateCostPerHectare(item.product, item.dosage);
      totalCost += costPerHa * area;
    }
    return Math.round(totalCost * 100) / 100;
  }
}

export default new CalculationService();

