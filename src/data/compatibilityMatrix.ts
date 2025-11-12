export interface CompatibilitySeedEntry {
  products: [string, string];
  chemicalCompatible: boolean;
  physicalCompatible: boolean;
  biologicalCompatible: boolean;
  notes?: string;
}

export const compatibilitySeed: CompatibilitySeedEntry[] = [
  {
    products: ['Раундап', 'Торнадо'],
    chemicalCompatible: false,
    physicalCompatible: false,
    biologicalCompatible: true,
    notes: 'Комбинация двух глифосатных препаратов нецелесообразна, риск потери эффективности.'
  },
  {
    products: ['Раундап', 'Альто Супер'],
    chemicalCompatible: true,
    physicalCompatible: true,
    biologicalCompatible: true,
    notes: 'Допустимо при раздельном внесении в баке после корректировки pH.'
  },
  {
    products: ['Альто Супер', 'Тилт'],
    chemicalCompatible: true,
    physicalCompatible: true,
    biologicalCompatible: true,
    notes: 'Триазольная смесь, рекомендуется применение с адъювантом.'
  },
  {
    products: ['Каратэ', 'Децис'],
    chemicalCompatible: false,
    physicalCompatible: true,
    biologicalCompatible: false,
    notes: 'Комбинация пиретроидов повышает риск резистентности.'
  },
  {
    products: ['Каратэ', 'Раундап'],
    chemicalCompatible: true,
    physicalCompatible: true,
    biologicalCompatible: true,
  },
  {
    products: ['Манкоцеб', 'Тилт'],
    chemicalCompatible: true,
    physicalCompatible: true,
    biologicalCompatible: true,
    notes: 'Классическая смесь контактного и системного фунгицидов.'
  },
];
