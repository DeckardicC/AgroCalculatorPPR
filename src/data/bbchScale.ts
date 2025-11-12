export interface BBCHScaleEntry {
  cropIds?: number[];
  cropSubcategory?: string;
  phases: Array<{
    code: number;
    label: string;
    description?: string;
  }>;
}

export const bbchScale: BBCHScaleEntry[] = [
  {
    cropSubcategory: 'cereals_winter_wheat',
    phases: [
      {code: 10, label: 'Всходы', description: 'Листочки полностью вышли из почвы'},
      {code: 21, label: 'Кущение', description: 'Начало кущения, появляются дополнительные побеги'},
      {code: 30, label: 'Выход в трубку', description: 'Стебель вытягивается, идёт активный рост'},
      {code: 39, label: 'Флаговый лист', description: 'Появляется последний лист'},
      {code: 51, label: 'Колошение', description: 'Начало колошения'},
      {code: 71, label: 'Молочная спелость', description: 'Зерно достигает молочной спелости'},
    ],
  },
  {
    cropSubcategory: 'cereals_spring_wheat',
    phases: [
      {code: 9, label: 'Прорастание', description: 'Проросток виден на поверхности'},
      {code: 21, label: 'Кущение', description: 'Появляются боковые побеги'},
      {code: 33, label: 'Выход в трубку', description: 'Удлинение первого междоузлия'},
      {code: 39, label: 'Флаговый лист', description: 'Развился последний лист'},
      {code: 55, label: 'Начало колошения'},
      {code: 75, label: 'Молочно-восковая спелость'},
    ],
  },
  {
    cropSubcategory: 'oilseed_rape_winter',
    phases: [
      {code: 10, label: 'Всходы'},
      {code: 20, label: 'Розетка листьев'},
      {code: 30, label: 'Стеблевание'},
      {code: 60, label: 'Цветение'},
      {code: 80, label: 'Созревание стручков'},
    ],
  },
];
