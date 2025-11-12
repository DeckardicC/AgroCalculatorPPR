export interface Field {
  id?: number;
  name: string;
  area: number; // hectares
  soilType?: SoilType;
  latitude?: number;
  longitude?: number;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

export enum SoilType {
  SAND = 'sand',
  LOAM = 'loam',
  CHERNOZEM = 'chernozem',
  CLAY = 'clay',
}

export interface FieldCropHistory {
  id?: number;
  fieldId: number;
  cropId: number;
  year: number;
  season?: string;
  area?: number;
}

