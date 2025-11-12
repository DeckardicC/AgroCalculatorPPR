export interface TreatmentPlan {
  id?: number;
  fieldId: number;
  cropId?: number;
  plannedDate: number; // timestamp
  windowStart?: number;
  windowEnd?: number;
  status: TreatmentPlanStatus;
  priority: TreatmentPlanPriority;
  reason?: string;
  recommendedProducts?: number[]; // list of product IDs
  warehouseStatus?: WarehouseStatus;
  createdAt?: number;
  updatedAt?: number;
}

export type TreatmentPlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'snoozed';

export type TreatmentPlanPriority = 1 | 2 | 3; // 1-high, 2-medium, 3-low

export type WarehouseStatus = 'ok' | 'low_stock' | 'no_stock';

export interface TreatmentPlanWithDetails extends TreatmentPlan {
  fieldName?: string;
  cropName?: string;
  cropNameEn?: string;
  plannedWindowLabel?: string;
  recommendedProductNames?: string[];
  daysUntil?: number;
  isDueSoon?: boolean;
  isOverdue?: boolean;
}
