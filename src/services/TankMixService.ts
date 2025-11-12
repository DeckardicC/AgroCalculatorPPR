import {Product} from '../models/Product';
import ProductRepository from '../repositories/ProductRepository';
import CompatibilityRepository from '../repositories/CompatibilityRepository';

export interface TankMixResult {
  compatible: boolean;
  products: Product[];
  mixingSequence: Product[];
  totalDosage: number;
  warnings: string[];
  issues: string[];
}

export enum ProductForm {
  WP = 'WP', // Wettable Powder
  SC = 'SC', // Suspension Concentrate
  EC = 'EC', // Emulsion Concentrate
  WG = 'WG', // Water Dispersible Granules
  SL = 'SL', // Soluble Liquid
  ADJUVANT = 'ADJUVANT',
}

class TankMixService {
  // Get product form from product name or type
  // This is a simplified version - in real app, this should be stored in database
  private getProductForm(product: Product): ProductForm {
    // Simplified logic - in real app, this should come from database
    const name = product.name.toLowerCase();
    if (name.includes('адъювант') || name.includes('adjuvant')) {
      return ProductForm.ADJUVANT;
    }
    // Default assumption based on type
    if (product.type === 'adjuvant') {
      return ProductForm.ADJUVANT;
    }
    // For now, default to SC (most common)
    return ProductForm.SC;
  }

  // Check chemical compatibility
  async checkChemicalCompatibility(
    product1: Product,
    product2: Product,
  ): Promise<{compatible: boolean; notes?: string}> {
    const compatibility = await CompatibilityRepository.getCompatibility(product1.id!, product2.id!);
    if (compatibility) {
      return {
        compatible: Boolean(compatibility.chemicalCompatible),
        notes: compatibility.notes || undefined,
      };
    }
    return {compatible: true};
  }

  // Check physical compatibility
  async checkPhysicalCompatibility(
    product1: Product,
    product2: Product,
  ): Promise<{compatible: boolean; notes?: string}> {
    const compatibility = await CompatibilityRepository.getCompatibility(product1.id!, product2.id!);
    if (compatibility) {
      return {
        compatible: Boolean(compatibility.physicalCompatible),
        notes: compatibility.notes || undefined,
      };
    }
    return {compatible: true};
  }

  // Get mixing sequence based on product forms
  getMixingSequence(products: Product[]): Product[] {
    // Rule: WP -> SC -> EC -> Adjuvants
    const sorted = [...products].sort((a, b) => {
      const formA = this.getProductForm(a);
      const formB = this.getProductForm(b);

      // Adjuvants always go last
      if (formA === ProductForm.ADJUVANT && formB !== ProductForm.ADJUVANT) return 1;
      if (formB === ProductForm.ADJUVANT && formA !== ProductForm.ADJUVANT) return -1;
      if (formA === ProductForm.ADJUVANT && formB === ProductForm.ADJUVANT) return 0;

      // Order: WP -> WG -> SC -> EC -> SL
      const order: {[key in ProductForm]: number} = {
        [ProductForm.WP]: 1,
        [ProductForm.WG]: 2,
        [ProductForm.SC]: 3,
        [ProductForm.EC]: 4,
        [ProductForm.SL]: 5,
        [ProductForm.ADJUVANT]: 6,
      };

      return order[formA] - order[formB];
    });

    return sorted;
  }

  // Calculate tank mix
  async calculateTankMix(productIds: number[]): Promise<TankMixResult> {
    const products: Product[] = [];
    const warnings: string[] = [];
    const issues: string[] = [];

    // Load all products
    for (const id of productIds) {
      const product = await ProductRepository.getById(id);
      if (product) {
        products.push(product);
      }
    }

    if (products.length === 0) {
      return {
        compatible: false,
        products: [],
        mixingSequence: [],
        totalDosage: 0,
        warnings: [],
        issues: ['Нет продуктов для смешивания'],
      };
    }

    // Check compatibility between all pairs
    let allCompatible = true;
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const chemCheck = await this.checkChemicalCompatibility(products[i], products[j]);
        const physCheck = await this.checkPhysicalCompatibility(products[i], products[j]);
        const compatibilityRecord = await CompatibilityRepository.getCompatibility(
          products[i].id!,
          products[j].id!,
        );

        if (!chemCheck.compatible) {
          allCompatible = false;
          issues.push(
            `Химическая несовместимость: ${products[i].name} и ${products[j].name}` +
              (chemCheck.notes ? ` (${chemCheck.notes})` : ''),
          );
        }
        if (!physCheck.compatible) {
          allCompatible = false;
          issues.push(
            `Физическая несовместимость: ${products[i].name} и ${products[j].name}` +
              (physCheck.notes ? ` (${physCheck.notes})` : ''),
          );
        }

        if (chemCheck.notes && chemCheck.compatible) {
          warnings.push(chemCheck.notes);
        }
        if (physCheck.notes && physCheck.compatible) {
          warnings.push(physCheck.notes);
        }

        if (compatibilityRecord && !compatibilityRecord.biologicalCompatible) {
          warnings.push(
            `Биологическая несовместимость: ${products[i].name} и ${products[j].name}.` +
              (compatibilityRecord.notes ? ` ${compatibilityRecord.notes}` : ''),
          );
        }
      }
    }

    // Get mixing sequence
    const mixingSequence = this.getMixingSequence(products);

    // Calculate total dosage (sum of average dosages)
    const totalDosage = products.reduce((sum, p) => {
      return sum + (p.minDosage + p.maxDosage) / 2;
    }, 0);

    // Add warnings for high total dosage
    if (totalDosage > 5) {
      warnings.push('Высокая общая дозировка смеси. Проверьте фитотоксичность.');
    }

    return {
      compatible: allCompatible,
      products,
      mixingSequence,
      totalDosage: Math.round(totalDosage * 100) / 100,
      warnings,
      issues,
    };
  }

  // Test compatibility methodology
  getCompatibilityTestMethodology(): string {
    return `Методика проверки совместимости:
1. Приготовьте пробную смесь в малом объеме (50-100 мл)
2. Добавьте препараты в правильной последовательности
3. Тщательно перемешайте
4. Наблюдайте в течение 15-30 минут
5. Проверьте на наличие осадка, пены, расслоения
6. Если смесь стабильна - можно использовать`;
  }
}

export default new TankMixService();

