import {Product} from './Product';

export interface Treatment {
  id?: number;
  fieldId: number;
  cropId: number;
  treatmentDate: number; // timestamp
  area: number; // hectares
  weatherTemperature?: number;
  weatherHumidity?: number;
  weatherWindSpeed?: number;
  operatorName?: string;
  equipmentType?: string;
  totalCost?: number;
  notes?: string;
  products?: TreatmentProduct[];
  createdAt?: number;
  updatedAt?: number;
}

export interface TreatmentProduct {
  id?: number;
  treatmentId?: number;
  productId: number;
  dosage: number;
  workingSolutionVolume?: number;
  cost?: number;
  product?: Product;
}

export interface WeatherConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
}

