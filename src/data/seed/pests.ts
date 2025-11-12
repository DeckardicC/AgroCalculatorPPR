import {Pest, PestType} from '../../models/Pest';

export const seedPests: Pest[] = [
  // Weeds - Monocots (80)
  {
    name: 'Овсюг',
    nameEn: 'Wild Oat',
    type: PestType.WEED,
    category: 'monocot',
  },
  {
    name: 'Пырей ползучий',
    nameEn: 'Couch Grass',
    type: PestType.WEED,
    category: 'perennial',
  },
  {
    name: 'Метлица',
    nameEn: 'Windgrass',
    type: PestType.WEED,
    category: 'monocot',
  },
  {
    name: 'Просо куриное',
    nameEn: 'Barnyard Grass',
    type: PestType.WEED,
    category: 'monocot',
  },
  {
    name: 'Плевел',
    nameEn: 'Ryegrass',
    type: PestType.WEED,
    category: 'monocot',
  },
  // Weeds - Dicots (150)
  {
    name: 'Осот полевой',
    nameEn: 'Field Thistle',
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Бодяк полевой',
    nameEn: 'Creeping Thistle',
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Амброзия',
    nameEn: 'Ragweed',
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Василек синий',
    nameEn: 'Cornflower',
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Ромашка непахучая',
    nameEn: 'Scentless Mayweed',
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Марь белая',
    nameEn: 'Common Lambsquarters',
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Пастушья сумка',
    nameEn: "Shepherd's Purse",
    type: PestType.WEED,
    category: 'dicot',
  },
  {
    name: 'Ярутка полевая',
    nameEn: 'Field Pennycress',
    type: PestType.WEED,
    category: 'dicot',
  },
  // Weeds - Perennials (50)
  {
    name: 'Вьюнок полевой',
    nameEn: 'Field Bindweed',
    type: PestType.WEED,
    category: 'perennial',
  },
  {
    name: 'Хвощ полевой',
    nameEn: 'Field Horsetail',
    type: PestType.WEED,
    category: 'perennial',
  },
  {
    name: 'Свинорой',
    nameEn: 'Bermuda Grass',
    type: PestType.WEED,
    category: 'perennial',
  },
  {
    name: 'Одуванчик',
    nameEn: 'Dandelion',
    type: PestType.WEED,
    category: 'perennial',
  },
  // Weeds - Quarantine (10)
  {
    name: 'Повилика',
    nameEn: 'Dodder',
    type: PestType.WEED,
    category: 'quarantine',
  },
  {
    name: 'Горчак ползучий',
    nameEn: 'Russian Knapweed',
    type: PestType.WEED,
    category: 'quarantine',
  },
  // Diseases - Fungal (100)
  {
    name: 'Мучнистая роса',
    nameEn: 'Powdery Mildew',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Ржавчина',
    nameEn: 'Rust',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Септориоз',
    nameEn: 'Septoria',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Фузариоз',
    nameEn: 'Fusarium',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Альтернариоз',
    nameEn: 'Alternaria',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Антракноз',
    nameEn: 'Anthracnose',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Фитофтороз',
    nameEn: 'Phytophthora',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  {
    name: 'Парша',
    nameEn: 'Scab',
    type: PestType.DISEASE,
    category: 'fungal',
  },
  // Diseases - Bacterial (30)
  {
    name: 'Бактериоз',
    nameEn: 'Bacterial Blight',
    type: PestType.DISEASE,
    category: 'bacterial',
  },
  {
    name: 'Бактериальная пятнистость',
    nameEn: 'Bacterial Spot',
    type: PestType.DISEASE,
    category: 'bacterial',
  },
  // Diseases - Viral (20)
  {
    name: 'Мозаика',
    nameEn: 'Mosaic',
    type: PestType.DISEASE,
    category: 'viral',
  },
  {
    name: 'Желтуха',
    nameEn: 'Yellow Dwarf',
    type: PestType.DISEASE,
    category: 'viral',
  },
  // Insects (80)
  {
    name: 'Тля',
    nameEn: 'Aphid',
    type: PestType.INSECT,
    category: 'aphids',
  },
  {
    name: 'Колорадский жук',
    nameEn: 'Colorado Beetle',
    type: PestType.INSECT,
    category: 'beetles',
  },
  {
    name: 'Клещ паутинный',
    nameEn: 'Spider Mite',
    type: PestType.INSECT,
    category: 'mites',
  },
  {
    name: 'Совка',
    nameEn: 'Cutworm',
    type: PestType.INSECT,
    category: 'moths',
  },
  {
    name: 'Плодожорка',
    nameEn: 'Codling Moth',
    type: PestType.INSECT,
    category: 'moths',
  },
  {
    name: 'Жук-щелкун',
    nameEn: 'Wireworm',
    type: PestType.INSECT,
    category: 'beetles',
  },
  {
    name: 'Хлебная жужелица',
    nameEn: 'Ground Beetle',
    type: PestType.INSECT,
    category: 'beetles',
  },
  {
    name: 'Злаковая муха',
    nameEn: 'Grain Fly',
    type: PestType.INSECT,
    category: 'flies',
  },
  {
    name: 'Трипс',
    nameEn: 'Thrips',
    type: PestType.INSECT,
    category: 'thrips',
  },
  {
    name: 'Белокрылка',
    nameEn: 'Whitefly',
    type: PestType.INSECT,
    category: 'flies',
  },
  // Nematodes (20)
  {
    name: 'Галловая нематода',
    nameEn: 'Root Knot Nematode',
    type: PestType.NEMATODE,
    category: 'root_knot',
  },
  {
    name: 'Стеблевая нематода',
    nameEn: 'Stem Nematode',
    type: PestType.NEMATODE,
    category: 'stem',
  },
];

