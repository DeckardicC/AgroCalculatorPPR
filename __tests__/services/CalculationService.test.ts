import CalculationService from '../../src/services/CalculationService';
import {Product, ProductType} from '../../src/models/Product';
import {SoilType} from '../../src/models/Field';

const baseProduct: Product = {
  name: 'Тестовый препарат',
  activeIngredient: 'AI-100',
  type: ProductType.HERBICIDE,
  minDosage: 0.5,
  maxDosage: 2.5,
  unitDosage: 'л/га',
  pricePerUnit: 1200,
  unit: 'л',
};

describe('CalculationService', () => {
  it('возвращает корректные коэффициенты почвы', () => {
    expect(CalculationService.getSoilCoefficient(SoilType.SAND)).toBe(0.8);
    expect(CalculationService.getSoilCoefficient(SoilType.LOAM)).toBe(1.0);
    expect(CalculationService.getSoilCoefficient(SoilType.CHERNOZEM)).toBe(1.2);
    expect(CalculationService.getSoilCoefficient(undefined)).toBe(1.0);
  });

  it('расчитывает скорректированную дозировку с учётом коэффициентов', () => {
    const result = CalculationService.calculateAdjustedDosage(baseProduct, {
      soilType: SoilType.CHERNOZEM,
      temperature: 12,
      humidity: 35,
      isLowHumidity: true,
      isWeakenedPlants: true,
    });

    expect(result.baseDosage).toBeCloseTo(1.5);
    expect(result.coefficient).toBeCloseTo(1.4976, 4);
    expect(result.adjustedDosage).toBeCloseTo(2.2464, 4);
    expect(result.adjustedDosage).toBeLessThanOrEqual(baseProduct.maxDosage);
  });

  it('не опускает дозу ниже минимально допустимой', () => {
    const result = CalculationService.calculateAdjustedDosage(
      {
        ...baseProduct,
        minDosage: 1,
        maxDosage: 3,
      },
      {
        soilType: SoilType.SAND,
        temperature: 30,
        humidity: 90,
        isWeakenedPlants: true,
      },
    );

    expect(result.coefficient).toBeLessThan(0.5);
    expect(result.adjustedDosage).toBe(1);
  });

  it('ограничивает рекомендуемый объём рабочего раствора разумными пределами', () => {
    const aerialResult = CalculationService.calculateWorkingSolution(5, baseProduct, 1.2, {
      sprayerType: 'aerial',
    });
    expect(aerialResult.recommendedVolume).toBe(100); // минимальная граница

    const windyHotResult = CalculationService.calculateWorkingSolution(10, baseProduct, 1.5, {
      sprayerType: 'boom',
      windSpeed: 6,
      temperature: 28,
      coverageRequirement: 'high',
    });

    expect(windyHotResult.recommendedVolume).toBeGreaterThanOrEqual(100);
    expect(windyHotResult.recommendedVolume).toBeLessThanOrEqual(400);
    expect(windyHotResult.productAmount).toBeCloseTo(15, 1);
    expect(windyHotResult.totalVolume).toBeGreaterThan(windyHotResult.productAmount);
  });

  it('корректно рассчитывает стоимость', () => {
    const costPerHa = CalculationService.calculateCostPerHectare(baseProduct, 1.5);
    expect(costPerHa).toBeCloseTo(1800);

    const total = CalculationService.calculateTotalCost(
      [
        {product: baseProduct, dosage: 1.5},
        {
          product: {...baseProduct, name: 'Второй препарат', pricePerUnit: 800},
          dosage: 1,
        },
      ],
      12,
    );

    expect(total).toBeCloseTo((1800 + 800) * 12, 1);
  });
});
