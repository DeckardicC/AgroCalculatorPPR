export interface Product {
  id?: number;
  name: string;
  nameEn?: string;
  activeIngredient: string;
  concentration?: string;
  type: ProductType;
  category?: string;
  manufacturer?: string;
  pricePerUnit?: number;
  unit?: string;
  minDosage: number;
  maxDosage: number;
  unitDosage: string;
  waitingPeriod?: number; // days
  efficacyData?: string; // JSON string
  createdAt?: number;
  updatedAt?: number;
}

export enum ProductType {
  HERBICIDE = 'herbicide',
  FUNGICIDE = 'fungicide',
  INSECTICIDE = 'insecticide',
  ADJUVANT = 'adjuvant',
}

export interface ProductCategory {
  herbicides: string[];
  fungicides: string[];
  insecticides: string[];
}

export const ProductCategories: ProductCategory = {
  herbicides: [
    'non_selective',
    'selective',
    'soil',
    'anti_grass',
  ],
  fungicides: [
    'triazoles',
    'strobilurins',
    'carbamates',
    'multi_component',
  ],
  insecticides: [
    'pyrethroids',
    'neonicotinoids',
    'organophosphates',
    'new_groups',
  ],
};

export interface ProductEfficacy {
  productId: number;
  pestId: number;
  efficacyPercent: number;
  cropId?: number;
  phaseMin?: number;
  phaseMax?: number;
}

export interface ProductCompatibility {
  productId1: number;
  productId2: number;
  chemicalCompatible: boolean;
  physicalCompatible: boolean;
  biologicalCompatible: boolean;
  notes?: string;
}

