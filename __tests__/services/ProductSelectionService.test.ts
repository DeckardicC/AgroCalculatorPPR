import ProductSelectionService from '../../src/services/ProductSelectionService';
import CalculationService from '../../src/services/CalculationService';
import ProductRepository from '../../src/repositories/ProductRepository';
import CropRepository from '../../src/repositories/CropRepository';
import {ProductType} from '../../src/models/Product';
import {SoilType} from '../../src/models/Field';

jest.mock('../../src/repositories/ProductRepository');
jest.mock('../../src/repositories/CropRepository');
jest.mock('../../src/services/CalculationService');

const mockedProductRepository = ProductRepository as jest.Mocked<typeof ProductRepository>;
const mockedCropRepository = CropRepository as jest.Mocked<typeof CropRepository>;
const mockedCalculationService = CalculationService as jest.Mocked<typeof CalculationService>;

describe('ProductSelectionService', () => {
  const productA = {
    id: 1,
    name: 'Препарат А',
    activeIngredient: 'ai-a',
    type: ProductType.FUNGICIDE,
    minDosage: 1,
    maxDosage: 3,
    unitDosage: 'л/га',
    waitingPeriod: 14,
    pricePerUnit: 1000,
    unit: 'л',
  };

  const productB = {
    id: 2,
    name: 'Препарат Б',
    activeIngredient: 'ai-b',
    type: ProductType.FUNGICIDE,
    minDosage: 0.5,
    maxDosage: 2,
    unitDosage: 'л/га',
    waitingPeriod: 40,
    pricePerUnit: 600,
    unit: 'л',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    mockedCropRepository.getById.mockResolvedValue({
      id: 10,
      name: 'Пшеница озимая',
      bbhMin: 30,
      bbhMax: 69,
      category: 'cereals',
    } as any);

    mockedProductRepository.getCompatibleWithCrop.mockResolvedValue([productA, productB] as any);
    mockedProductRepository.getPestEfficacyForProduct.mockImplementation(async productId => {
      if (productId === 1) {
        return [
          {pestId: 100, efficacy: 92, pestName: 'Ржавчина', pestType: 'disease'},
          {pestId: 200, efficacy: 88, pestName: 'Септориоз', pestType: 'disease'},
        ];
      }
      return [
        {pestId: 100, efficacy: 80, pestName: 'Ржавчина', pestType: 'disease'},
        {pestId: 200, efficacy: 75, pestName: 'Септориоз', pestType: 'disease'},
      ];
    });

    mockedProductRepository.getEffectiveAgainstPest.mockResolvedValue([productA, productB] as any);

    mockedCalculationService.calculateAdjustedDosage.mockImplementation(product => ({
      baseDosage: (product.minDosage + product.maxDosage) / 2,
      adjustedDosage: product.minDosage + 0.5,
      coefficient: 1.05,
      factors: {},
    }));

    mockedCalculationService.calculateCostPerHectare.mockImplementation(() => 950);
  });

  it('возвращает отсортированные рекомендации с предупреждениями', async () => {
    const recommendations = await ProductSelectionService.selectProducts({
      cropId: 10,
      cropPhase: 25,
      pestIds: [100, 200],
      soilType: SoilType.CHERNOZEM,
      temperature: 15,
      area: 12,
      daysUntilHarvest: 60,
      minEfficacy: 70,
    });

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].product.name).toBe('Препарат А');
    expect(recommendations[0].warnings).toEqual(
      expect.arrayContaining(['Фаза BBCH 25 ниже рекомендуемого минимума (30).']),
    );
    expect(recommendations[1].warnings).toEqual(
      expect.arrayContaining(['Длительный интервал ожидания: 40 дней']),
    );
  });

  it('возвращает альтернативы исключая исходный препарат', async () => {
    const alternatives = await ProductSelectionService.getAlternatives(1, {
      cropId: 10,
      cropPhase: 40,
      pestIds: [100],
      soilType: SoilType.LOAM,
      temperature: 20,
      area: 5,
    });

    expect(alternatives.every(rec => rec.product.id !== 1)).toBe(true);
  });
});
