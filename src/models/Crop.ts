export interface Crop {
  id?: number;
  name: string;
  nameEn?: string;
  category: CropCategory;
  subcategory?: string;
  variety?: string;
  bbhMin?: number;
  bbhMax?: number;
  createdAt?: number;
  updatedAt?: number;
}

export enum CropCategory {
  CEREALS = 'cereals',
  TECHNICAL = 'technical',
  VEGETABLES = 'vegetables',
  FRUIT = 'fruit',
}

export interface CropSubcategory {
  cereals: string[];
  technical: string[];
  vegetables: string[];
  fruit: string[];
}

export const CropSubcategories: CropSubcategory = {
  cereals: [
    'wheat_winter',
    'wheat_spring',
    'barley_winter',
    'barley_spring',
    'corn',
    'rye',
    'oats',
    'triticale',
    'sorghum',
  ],
  technical: [
    'sunflower',
    'rapeseed_winter',
    'rapeseed_spring',
    'soybean',
    'sugar_beet',
    'flax',
    'mustard',
  ],
  vegetables: [
    'solanaceous',
    'cabbage',
    'root_crops',
    'alliums',
    'cucurbits',
  ],
  fruit: [
    'pome_fruits',
    'stone_fruits',
    'berries',
    'grapes',
  ],
};

