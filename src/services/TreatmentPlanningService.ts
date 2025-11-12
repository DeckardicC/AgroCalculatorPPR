import {addDays, differenceInCalendarDays, format} from 'date-fns';
import TreatmentPlanRepository from '../repositories/TreatmentPlanRepository';
import FieldRepository from '../repositories/FieldRepository';
import TreatmentRepository from '../repositories/TreatmentRepository';
import WarehouseRepository from '../repositories/WarehouseRepository';
import CropRepository from '../repositories/CropRepository';
import ProductRepository from '../repositories/ProductRepository';
import {TreatmentPlan, TreatmentPlanPriority, TreatmentPlanStatus, TreatmentPlanWithDetails} from '../models/TreatmentPlan';
import {Field} from '../models/Field';
import {Treatment} from '../models/Treatment';
import {Product} from '../models/Product';

const DEFAULT_INTERVAL_DAYS = 21;
const REMINDER_WINDOW_DAYS = 3;
const LOW_STOCK_THRESHOLD = 5;

class TreatmentPlanningService {
  async getSeasonPlan(): Promise<TreatmentPlanWithDetails[]> {
    await this.ensurePlansGenerated();

    const plans = await TreatmentPlanRepository.getUpcoming(180);
    if (plans.length === 0) {
      return [];
    }

    const [fields, crops, products, inventory] = await Promise.all([
      FieldRepository.getAll(),
      CropRepository.getAll(),
      ProductRepository.getAll(),
      WarehouseRepository.getAll(),
    ]);

    const fieldMap = new Map<number, Field>();
    fields.forEach(field => {
      if (field.id) {
        fieldMap.set(field.id, field);
      }
    });

    const cropMap = new Map<number, any>();
    crops.forEach(crop => {
      if (crop.id) {
        cropMap.set(crop.id, crop);
      }
    });

    const productMap = new Map<number, Product>();
    products.forEach(product => {
      if (product.id) {
        productMap.set(product.id, product);
      }
    });

    const inventoryMap = new Map<number, number>();
    inventory.forEach(item => {
      if (item.productId) {
        const current = inventoryMap.get(item.productId) ?? 0;
        inventoryMap.set(item.productId, current + item.quantity);
      }
    });

    const now = Math.floor(Date.now() / 1000);

    return plans.map(plan => {
      const field = fieldMap.get(plan.fieldId);
      const crop = plan.cropId ? cropMap.get(plan.cropId) : undefined;
      const recommendedProductNames = plan.recommendedProducts
        ?.map(productId => productMap.get(productId)?.name)
        .filter(Boolean) as string[] | undefined;

      const daysUntil = Math.floor((plan.plannedDate - now) / (24 * 60 * 60));
      const isDueSoon = daysUntil >= 0 && daysUntil <= REMINDER_WINDOW_DAYS;
      const isOverdue = plan.plannedDate < now && plan.status === 'planned';

      let plannedWindowLabel: string | undefined;
      if (plan.windowStart && plan.windowEnd) {
        plannedWindowLabel = `${format(new Date(plan.windowStart * 1000), 'dd.MM')} – ${format(
          new Date(plan.windowEnd * 1000),
          'dd.MM',
        )}`;
      }

      const warehouseStatus = this.calculateWarehouseStatus(plan, inventoryMap);

      return {
        ...plan,
        fieldName: field?.name,
        cropName: crop?.name,
        cropNameEn: crop?.nameEn,
        plannedWindowLabel,
        recommendedProductNames,
        daysUntil,
        isDueSoon,
        isOverdue,
        warehouseStatus,
      };
    });
  }

  async ensurePlansGenerated(): Promise<void> {
    const [fields, existingPlans] = await Promise.all([
      FieldRepository.getAll(),
      TreatmentPlanRepository.getAll(),
    ]);

    const plansByField = new Map<number, TreatmentPlan[]>();
    existingPlans.forEach(plan => {
      const list = plansByField.get(plan.fieldId) ?? [];
      list.push(plan);
      plansByField.set(plan.fieldId, list);
    });

    for (const field of fields) {
      if (!field.id) continue;

      const fieldPlans = plansByField.get(field.id) ?? [];
      const hasUpcomingPlan = fieldPlans.some(
        plan =>
          (plan.status === 'planned' || plan.status === 'in_progress' || plan.status === 'snoozed') &&
          plan.plannedDate >= Math.floor(Date.now() / 1000),
      );

      if (!hasUpcomingPlan) {
        await this.generatePlanForField(field);
      }
    }
  }

  async generatePlanForField(field: Field): Promise<void> {
    if (!field.id) return;

    const treatments = await TreatmentRepository.getByField(field.id);
    const lastTreatment = treatments.length > 0 ? treatments[0] : undefined;
    const cropId = lastTreatment?.cropId;

    const plannedDate = this.calculateNextPlannedDate(lastTreatment);
    const windowStart = Math.floor(addDays(new Date(plannedDate * 1000), -2).getTime() / 1000);
    const windowEnd = Math.floor(addDays(new Date(plannedDate * 1000), 2).getTime() / 1000);

    const recommendedProducts = this.extractRecommendedProducts(lastTreatment);
    const warehouseStatus = await this.determineWarehouseStatus(recommendedProducts);

    const plan: TreatmentPlan = {
      fieldId: field.id,
      cropId,
      plannedDate,
      windowStart,
      windowEnd,
      status: 'planned',
      priority: this.calculatePriority(plannedDate),
      reason: this.buildReason(lastTreatment),
      recommendedProducts,
      warehouseStatus,
    };

    await TreatmentPlanRepository.save(plan);
  }

  async markCompleted(id: number): Promise<void> {
    await TreatmentPlanRepository.updateStatus(id, 'completed');
  }

  async snoozePlan(id: number, days: number = 7): Promise<void> {
    const plan = await TreatmentPlanRepository.getById(id);
    if (!plan) return;

    const newPlannedDate = Math.floor(addDays(new Date(plan.plannedDate * 1000), days).getTime() / 1000);
    plan.plannedDate = newPlannedDate;
    plan.windowStart = Math.floor(addDays(new Date(newPlannedDate * 1000), -2).getTime() / 1000);
    plan.windowEnd = Math.floor(addDays(new Date(newPlannedDate * 1000), 2).getTime() / 1000);
    plan.status = 'snoozed';
    plan.priority = this.calculatePriority(newPlannedDate);

    await TreatmentPlanRepository.save(plan);
  }

  async setStatus(id: number, status: TreatmentPlanStatus): Promise<void> {
    await TreatmentPlanRepository.updateStatus(id, status);
  }

  private calculateNextPlannedDate(lastTreatment?: Treatment): number {
    if (!lastTreatment) {
      return Math.floor(addDays(new Date(), 7).getTime() / 1000);
    }

    const lastDate = new Date(lastTreatment.treatmentDate * 1000);
    return Math.floor(addDays(lastDate, DEFAULT_INTERVAL_DAYS).getTime() / 1000);
  }

  private extractRecommendedProducts(lastTreatment?: Treatment): number[] | undefined {
    if (!lastTreatment || !lastTreatment.products || lastTreatment.products.length === 0) {
      return undefined;
    }

    const productIds = lastTreatment.products
      .map(product => product.productId ?? product.product_id)
      .filter(Boolean);

    return productIds.length > 0 ? (productIds as number[]) : undefined;
  }

  private async determineWarehouseStatus(
    recommendedProducts?: number[],
  ): Promise<'ok' | 'low_stock' | 'no_stock' | undefined> {
    if (!recommendedProducts || recommendedProducts.length === 0) {
      return undefined;
    }

    const inventoryList = await Promise.all(
      recommendedProducts.map(productId => WarehouseRepository.getByProduct(productId)),
    );

    let hasStock = false;
    let lowStock = false;

    inventoryList.forEach(productInventory => {
      const totalQuantity = productInventory.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity > 0) {
        hasStock = true;
        if (totalQuantity <= LOW_STOCK_THRESHOLD) {
          lowStock = true;
        }
      }
    });

    if (!hasStock) {
      return 'no_stock';
    }

    if (lowStock) {
      return 'low_stock';
    }

    return 'ok';
  }

  private calculateWarehouseStatus(
    plan: TreatmentPlan,
    inventoryMap: Map<number, number>,
  ): 'ok' | 'low_stock' | 'no_stock' | undefined {
    if (!plan.recommendedProducts || plan.recommendedProducts.length === 0) {
      return plan.warehouseStatus;
    }

    let hasStock = false;
    let lowStock = false;

    plan.recommendedProducts.forEach(productId => {
      const quantity = inventoryMap.get(productId) ?? 0;
      if (quantity > 0) {
        hasStock = true;
        if (quantity <= LOW_STOCK_THRESHOLD) {
          lowStock = true;
        }
      }
    });

    if (!hasStock) {
      return 'no_stock';
    }

    if (lowStock) {
      return 'low_stock';
    }

    return 'ok';
  }

  private calculatePriority(plannedDate: number): TreatmentPlanPriority {
    const daysUntil = differenceInCalendarDays(new Date(plannedDate * 1000), new Date());
    if (daysUntil <= 7) {
      return 1;
    }
    if (daysUntil <= 21) {
      return 2;
    }
    return 3;
  }

  private buildReason(lastTreatment?: Treatment): string | undefined {
    if (!lastTreatment) {
      return 'Начальная обработка сезона';
    }

    const date = format(new Date(lastTreatment.treatmentDate * 1000), 'dd.MM.yyyy');
    return `Плановая обработка после мероприятия от ${date}`;
  }
}

export default new TreatmentPlanningService();
