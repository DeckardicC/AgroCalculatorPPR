import {bbchScale} from '../data/bbchScale';

export interface BBCHPhase {
  code: number;
  label: string;
  description?: string;
}

class BBCHService {
  getPhasesForCrop(cropId: number, cropSubcategory?: string): BBCHPhase[] {
    const entry = bbchScale.find(item => {
      if (cropSubcategory) {
        return item.cropSubcategory?.toLowerCase() === cropSubcategory.toLowerCase();
      }
      return item.cropIds?.includes(cropId);
    });

    if (!entry) {
      return [];
    }

    return entry.phases.map(phase => ({
      code: phase.code,
      label: phase.label,
      description: phase.description,
    }));
  }

  formatPhaseLabel(phase: BBCHPhase): string {
    return `${phase.code}: ${phase.label}`;
  }
}

export default new BBCHService();
export type {BBCHPhase};
