import {Product} from './Product';

export interface WarehouseInventory {
  id?: number;
  productId: number;
  quantity: number;
  unit: string;
  purchaseDate?: number; // timestamp
  expirationDate?: number; // timestamp
  purchasePrice?: number;
  product?: Product;
}

