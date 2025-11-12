import CropRepository from '../repositories/CropRepository';
import PestRepository from '../repositories/PestRepository';
import ProductRepository from '../repositories/ProductRepository';
import {Crop, CropCategory} from '../models/Crop';
import {Pest, PestType} from '../models/Pest';
import {Product, ProductType} from '../models/Product';

export interface CropSearchParams {
  query?: string;
  category?: CropCategory;
  bbchMin?: number;
  bbchMax?: number;
}

export interface PestSearchParams {
  query?: string;
  type?: PestType | null;
  category?: string | null;
}

export interface ProductSearchParams {
  query?: string;
  type?: ProductType | null;
  cropId?: number;
  pestId?: number;
  minEfficacy?: number;
}

class SearchService {
  async searchCrops(params: CropSearchParams): Promise<Crop[]> {
    if (params.query && params.query.trim().length <= 1 && !params.category) {
      return [];
    }
    return CropRepository.advancedSearch(params);
  }

  async searchPests(params: PestSearchParams): Promise<Pest[]> {
    if (params.query && params.query.trim().length <= 1 && !params.type && !params.category) {
      return [];
    }
    return PestRepository.advancedSearch(params);
  }

  async searchProducts(params: ProductSearchParams): Promise<Product[]> {
    if (
      params.query &&
      params.query.trim().length <= 1 &&
      !params.type &&
      !params.cropId &&
      !params.pestId
    ) {
      return [];
    }
    return ProductRepository.advancedSearch({...params});
  }
}

export default new SearchService();
