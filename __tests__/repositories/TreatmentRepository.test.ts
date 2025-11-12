import TreatmentRepository from '../../src/repositories/TreatmentRepository';
import Database from '../../src/database/Database';

jest.mock('../../src/database/Database');

const mockedDatabase = Database as jest.Mocked<typeof Database>;

describe('TreatmentRepository', () => {
  const treatmentRow = {
    id: 1,
    field_id: 5,
    crop_id: 10,
    treatment_date: 1_700_000_000,
    area: 2,
    total_cost: 150,
  };

  const productRows = [
    {id: 11, treatment_id: 1, product_id: 3, dosage: 1.2, cost: 80},
    {id: 12, treatment_id: 1, product_id: 4, dosage: 0.8, cost: 70},
  ];

  const createResultSet = (rows: any[]) => ({
    rows: {
      length: rows.length,
      item: (index: number) => rows[index],
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();

    const executeSql = jest.fn().mockImplementation((query: string) => {
      if (query.includes('FROM treatments')) {
        return Promise.resolve([createResultSet([treatmentRow])]);
      }
      if (query.includes('FROM treatment_products')) {
        return Promise.resolve([createResultSet(productRows)]);
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    mockedDatabase.getDatabase.mockReturnValue({executeSql} as any);
  });

  afterEach(() => {
    (TreatmentRepository as any).db = null;
  });

  it('возвращает обработки с вложенными продуктами', async () => {
    const treatments = await TreatmentRepository.getAll();

    expect(treatments).toHaveLength(1);
    expect(treatments[0].products).toHaveLength(2);
    expect(treatments[0].products?.[0].dosage).toBe(1.2);
  });
});
