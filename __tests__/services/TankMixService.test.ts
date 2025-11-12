import TankMixService from '../../src/services/TankMixService';
import ProductRepository from '../../src/repositories/ProductRepository';
import CompatibilityRepository from '../../src/repositories/CompatibilityRepository';
import {ProductType} from '../../src/models/Product';

jest.mock('../../src/repositories/ProductRepository');
jest.mock('../../src/repositories/CompatibilityRepository');

const mockedProductRepository = ProductRepository as jest.Mocked<typeof ProductRepository>;
const mockedCompatibilityRepository = CompatibilityRepository as jest.Mocked<typeof CompatibilityRepository>;

describe('TankMixService', () => {
  const productA = {
    id: 1,
    name: 'Фунгицид WP',
    type: ProductType.FUNGICIDE,
    minDosage: 1,
    maxDosage: 3,
  } as any;

  const productB = {
    id: 2,
    name: 'Адъювант',
    type: 'adjuvant',
    minDosage: 0.5,
    maxDosage: 1,
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();

    mockedProductRepository.getById.mockImplementation(async id => {
      if (id === 1) return productA;
      if (id === 2) return productB;
      return null;
    });

    mockedCompatibilityRepository.getCompatibility.mockImplementation(async (id1, id2) => {
      const ids = [id1, id2].sort().join('-');
      if (ids === '1-2') {
        return {
          productId1: 1,
          productId2: 2,
          chemicalCompatible: 0,
          physicalCompatible: 1,
          biologicalCompatible: 0,
          notes: 'Не рекомендуется без буфера pH',
        } as any;
      }
      return null;
    });
  });

  it('формирует отчёт о несовместимости и предупреждения', async () => {
    const result = await TankMixService.calculateTankMix([1, 2]);

    expect(result.compatible).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Химическая несовместимость: Фунгицид WP и Адъювант'),
      ]),
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Биологическая несовместимость: Фунгицид WP и Адъювант.'),
      ]),
    );
    expect(result.mixingSequence[0].name).toBe('Фунгицид WP');
    expect(result.mixingSequence[1].name).toBe('Адъювант');
    expect(result.totalDosage).toBeCloseTo(2.75, 2);
  });

  it('возвращает ошибку при отсутствии продуктов', async () => {
    mockedProductRepository.getById.mockResolvedValueOnce(null);
    const result = await TankMixService.calculateTankMix([]);
    expect(result.compatible).toBe(false);
    expect(result.issues).toContain('Нет продуктов для смешивания');
  });
});
