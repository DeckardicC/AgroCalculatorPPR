export interface Pest {
  id?: number;
  name: string;
  nameEn?: string;
  type: PestType;
  category?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

export enum PestType {
  WEED = 'weed',
  DISEASE = 'disease',
  INSECT = 'insect',
  NEMATODE = 'nematode',
}

export interface PestCategory {
  weeds: string[];
  diseases: string[];
  insects: string[];
  nematodes: string[];
}

export const PestCategories: PestCategory = {
  weeds: [
    'monocot',
    'dicot',
    'perennial',
    'quarantine',
  ],
  diseases: [
    'fungal',
    'bacterial',
    'viral',
  ],
  insects: [
    'beetles',
    'aphids',
    'mites',
    'moths',
    'others',
  ],
  nematodes: [
    'root_knot',
    'stem',
    'leaf',
  ],
};

