export interface QuarantineRestriction {
  pestName: string;
  region?: string;
  restriction: string;
}

export interface ResistanceThreshold {
  activeIngredient: string;
  maxApplicationsPerSeason: number;
  intervalDays: number;
}

export interface PhytotoxicityGuideline {
  productName: string;
  maxTemperature?: number;
  minTemperature?: number;
  minHumidity?: number;
  caution: string;
}

export const quarantineRestrictions: QuarantineRestriction[] = [
  {
    pestName: 'Амброзия',
    restriction: 'Зона карантина: требуется уведомление фитосанитарной службы и запрет на вывоз растительной продукции без обработки.',
  },
  {
    pestName: 'Повилика',
    restriction: 'Поля с очагами подлежат ограничению на перемещение семенного материала.',
  },
  {
    pestName: 'Горчак ползучий',
    restriction: 'Требует обязательной регистрации обработки и запрета на перевозку соломы.',
  },
];

export const resistanceThresholds: ResistanceThreshold[] = [
  {
    activeIngredient: 'Глифосат',
    maxApplicationsPerSeason: 2,
    intervalDays: 30,
  },
  {
    activeIngredient: 'Пропиконазол',
    maxApplicationsPerSeason: 2,
    intervalDays: 21,
  },
  {
    activeIngredient: 'Лямбда-цигалотрин',
    maxApplicationsPerSeason: 3,
    intervalDays: 14,
  },
];

export const phytotoxicityGuidelines: PhytotoxicityGuideline[] = [
  {
    productName: 'Раундап',
    maxTemperature: 28,
    caution: 'При температуре выше 28°C повышается риск испарения и снижения эффективности.',
  },
  {
    productName: 'Альто Супер',
    minTemperature: 10,
    caution: 'Не рекомендуется применять при температуре ниже 10°C — возможно снижение эффективности.',
  },
  {
    productName: 'Каратэ',
    minHumidity: 40,
    caution: 'При низкой влажности (<40%) повышается риск фитотоксичности для ослабленных растений.',
  },
];
