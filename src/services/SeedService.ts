import CropRepository from '../repositories/CropRepository';
import PestRepository from '../repositories/PestRepository';
import ProductRepository from '../repositories/ProductRepository';
import CompatibilityRepository from '../repositories/CompatibilityRepository';
import {seedCrops} from '../data/seed/crops';
import {seedPests} from '../data/seed/pests';
import {seedProducts} from '../data/seed/products';
import {compatibilitySeed} from '../data/compatibilityMatrix';

class SeedService {
  async seedInitialData(): Promise<void> {
    try {
      // Check if data already exists
      const existingCrops = await CropRepository.getAll();
      if (existingCrops.length > 0) {
        console.log('Database already seeded, refreshing compatibility data...');
        await this.seedCompatibility(true);
        return;
      }

      console.log('Seeding database...');

      // Seed crops
      await this.seedCrops();
      console.log('Crops seeded');

      // Seed pests
      await this.seedPests();
      console.log('Pests seeded');

      // Seed products
      await this.seedProducts();
      console.log('Products seeded');

      await this.seedCompatibility();
      console.log('Compatibility matrix seeded');

      console.log('Database seeding completed');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  private async seedCrops(): Promise<void> {
    for (const crop of seedCrops) {
      await CropRepository.create(crop);
    }
  }

  private async seedPests(): Promise<void> {
    for (const pest of seedPests) {
      await PestRepository.create(pest);
    }
  }

  private async seedProducts(): Promise<void> {
    for (const product of seedProducts) {
      await ProductRepository.create(product);
    }
  }

  private async seedCompatibility(refreshOnly: boolean = false): Promise<void> {
    const products = await ProductRepository.getAll();
    const productMap = new Map<string, number>();
    products.forEach(product => {
      if (product.id) {
        productMap.set(product.name.toLowerCase(), product.id);
      }
    });

    const records = [];
    for (const entry of compatibilitySeed) {
      const [name1, name2] = entry.products;
      const id1 = productMap.get(name1.toLowerCase());
      const id2 = productMap.get(name2.toLowerCase());
      if (!id1 || !id2) {
        console.warn(`Skipping compatibility seed for ${name1} + ${name2}: products not found.`);
        continue;
      }
      records.push({
        productId1: id1,
        productId2: id2,
        chemicalCompatible: entry.chemicalCompatible,
        physicalCompatible: entry.physicalCompatible,
        biologicalCompatible: entry.biologicalCompatible,
        notes: entry.notes,
      });
    }

    if (records.length > 0) {
      if (refreshOnly) {
        await CompatibilityRepository.bulkInsert(records);
        return;
      }
      await CompatibilityRepository.bulkInsert(records);
    }
  }
}

export default new SeedService();

