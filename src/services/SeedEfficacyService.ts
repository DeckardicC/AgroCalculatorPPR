import ProductRepository from '../repositories/ProductRepository';
import PestRepository from '../repositories/PestRepository';
import CropRepository from '../repositories/CropRepository';
import Database from '../database/Database';
import {ProductType} from '../models/Product';
import {PestType} from '../models/Pest';

class SeedEfficacyService {
  async seedEfficacyData(): Promise<void> {
    try {
      const db = Database.getDatabase();
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get all products, pests, and crops
      const products = await ProductRepository.getAll();
      const pests = await PestRepository.getAll();
      const crops = await CropRepository.getAll();

      // Create efficacy mappings
      // This is a simplified version - in real app, this should be comprehensive data
      for (const product of products) {
        if (!product.id) continue;

        // Herbicides are effective against weeds
        if (product.type === ProductType.HERBICIDE) {
          for (const pest of pests) {
            if (pest.type === PestType.WEED && pest.id) {
              // Random efficacy between 85-100% for demonstration
              const efficacy = 85 + Math.random() * 15;
              await this.addEfficacy(product.id, pest.id, efficacy);
            }
          }
        }

        // Fungicides are effective against diseases
        if (product.type === ProductType.FUNGICIDE) {
          for (const pest of pests) {
            if (pest.type === PestType.DISEASE && pest.id) {
              const efficacy = 85 + Math.random() * 15;
              await this.addEfficacy(product.id, pest.id, efficacy);
            }
          }
        }

        // Insecticides are effective against insects
        if (product.type === ProductType.INSECTICIDE) {
          for (const pest of pests) {
            if (pest.type === PestType.INSECT && pest.id) {
              const efficacy = 85 + Math.random() * 15;
              await this.addEfficacy(product.id, pest.id, efficacy);
            }
          }
        }

        // Add crop compatibility for all products with all crops
        for (const crop of crops) {
          if (crop.id) {
            await this.addCropCompatibility(product.id, crop.id);
          }
        }
      }
    } catch (error) {
      console.error('Error seeding efficacy data:', error);
    }
  }

  private async addEfficacy(
    productId: number,
    pestId: number,
    efficacy: number,
  ): Promise<void> {
    try {
      const db = Database.getDatabase();
      if (!db) return;

      await db.executeSql(
        `INSERT OR IGNORE INTO product_pest_efficacy 
         (product_id, pest_id, efficacy_percent)
         VALUES (?, ?, ?)`,
        [productId, pestId, Math.round(efficacy * 10) / 10],
      );
    } catch (error) {
      console.error('Error adding efficacy:', error);
    }
  }

  private async addCropCompatibility(
    productId: number,
    cropId: number,
  ): Promise<void> {
    try {
      const db = Database.getDatabase();
      if (!db) return;

      await db.executeSql(
        `INSERT OR IGNORE INTO product_crop_compatibility 
         (product_id, crop_id)
         VALUES (?, ?)`,
        [productId, cropId],
      );
    } catch (error) {
      console.error('Error adding crop compatibility:', error);
    }
  }
}

export default new SeedEfficacyService();

