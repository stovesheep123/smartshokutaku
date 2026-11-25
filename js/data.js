export function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// 表記ゆれ吸収マップ（追加した食材がレシピに漏れなくヒットするようにする）
const ALIAS_MAP = {
  '鶏胸肉': '鶏むね肉',
  'とりむね肉': '鶏むね肉',
  '鶏もも': '鶏もも肉',
  'とりもも肉': '鶏もも肉',
  '豚肉': '豚薄切り肉',
  '豚こま': '豚薄切り肉',
  '豚こま切れ肉': '豚薄切り肉',
  '豚バラ': '豚バラ肉',
  '牛肉': '牛薄切り肉',
  '牛こま': '牛薄切り肉',
  'たまねぎ': '玉ねぎ',
  '玉ネギ': '玉ねぎ',
  '人参': 'にんじん',
  'ジャガイモ': 'じゃがいも',
  '馬鈴薯': 'じゃがいも',
  '長ネギ': '長ねぎ',
  '白ねぎ': '長ねぎ',
  'しょうゆ': '醤油',
  'こしょう': '塩コショウ',
  '塩胡椒': '塩コショウ',
  'ごはん': '米',
  '白米': '米'
};

export function normalizeIngredientName(rawName) {
  const cleaned = String(rawName || '').trim();
  return ALIAS_MAP[cleaned] || cleaned;
}

// 広い食材マスタ（入力候補・自動タグ付け・単位補完用）
export const INGREDIENT_CATALOG = [
  // 肉類
  { name: '鶏むね肉', category: '肉類', unit: '枚', days: 3, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },
  { name: '鶏もも肉', category: '肉類', unit: '枚', days: 3, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free'] },
  { name: '豚薄切り肉', category: '肉類', unit: 'g', days: 3, allergens: ['肉・魚'], dietaryTags: ['additive_free'] },
  { name: '豚バラ肉', category: '肉類', unit: 'g', days: 3, allergens: ['肉・魚'], dietaryTags: ['additive_free'] },
  { name: '牛薄切り肉', category: '肉類', unit: 'g', days: 3, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free'] },
  { name: '合挽き肉', category: '肉類', unit: 'g', days: 2, allergens: ['肉・魚'], dietaryTags: ['additive_free'] },
  { name: 'ベーコン', category: '肉類', unit: '枚', days: 7, allergens: ['肉・魚'], dietaryTags: [] },
  { name: 'ウインナー', category: '肉類', unit: '本', days: 7, allergens: ['肉・魚'], dietaryTags: [] },

  // 魚介類
  { name: '鮭', category: '魚介類', unit: '切れ', days: 3, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },
  { name: 'さば', category: '魚介類', unit: '切れ', days: 3, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },
  { name: 'ツナ缶', category: '魚介類', unit: '缶', days: 365, allergens: ['肉・魚'], dietaryTags: ['halal', 'diet'] },
  { name: 'えび', category: '魚介類', unit: '尾', days: 2, allergens: ['えび・かに', '肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },
  { name: 'いか', category: '魚介類', unit: '杯', days: 2, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },
  { name: 'あさり', category: '魚介類', unit: 'g', days: 2, allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },

  // 野菜・きのこ
  { name: '玉ねぎ', category: '野菜・きのこ', unit: '個', days: 14, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'にんじん', category: '野菜・きのこ', unit: '本', days: 10, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'じゃがいも', category: '野菜・きのこ', unit: '個', days: 14, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { name: 'キャベツ', category: '野菜・きのこ', unit: '個', days: 7, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'トマト', category: '野菜・きのこ', unit: '個', days: 5, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'ブロッコリー', category: '野菜・きのこ', unit: '株', days: 4, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'ほうれん草', category: '野菜・きのこ', unit: '束', days: 4, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: '小松菜', category: '野菜・きのこ', unit: '束', days: 4, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'もやし', category: '野菜・きのこ', unit: '袋', days: 2, allergens: ['大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'ピーマン', category: '野菜・きのこ', unit: '個', days: 6, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'なす', category: '野菜・きのこ', unit: '本', days: 5, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: '大根', category: '野菜・きのこ', unit: '本', days: 7, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: '長ねぎ', category: '野菜・きのこ', unit: '本', days: 6, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'しめじ', category: '野菜・きのこ', unit: 'パック', days: 5, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'えのき', category: '野菜・きのこ', unit: '袋', days: 5, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },

  // 卵・乳・大豆
  { name: '卵', category: '卵・乳・大豆', unit: '個', days: 10, allergens: ['卵'], dietaryTags: ['vegetarian', 'additive_free', 'diet'] },
  { name: '牛乳', category: '卵・乳・大豆', unit: '本', days: 5, allergens: ['乳'], dietaryTags: ['vegetarian', 'additive_free'] },
  { name: 'チーズ', category: '卵・乳・大豆', unit: '枚', days: 14, allergens: ['乳'], dietaryTags: ['vegetarian'] },
  { name: 'バター', category: '卵・乳・大豆', unit: 'g', days: 30, allergens: ['乳'], dietaryTags: ['vegetarian', 'additive_free'] },
  { name: '豆腐', category: '卵・乳・大豆', unit: '丁', days: 5, allergens: ['大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: '納豆', category: '卵・乳・大豆', unit: 'パック', days: 7, allergens: ['大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: '厚揚げ', category: '卵・乳・大豆', unit: '枚', days: 4, allergens: ['大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: '豆乳', category: '卵・乳・大豆', unit: '本', days: 10, allergens: ['大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },

  // 主食・麺
  { name: '米', category: '主食・麺', unit: 'kg', days: 90, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { name: '食パン', category: '主食・麺', unit: '枚', days: 4, allergens: ['小麦', '乳'], dietaryTags: ['vegetarian'] },
  { name: 'うどん', category: '主食・麺', unit: '玉', days: 5, allergens: ['小麦'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { name: 'パスタ', category: '主食・麺', unit: 'g', days: 365, allergens: ['小麦'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },

  // 調味料・油
  { name: '醤油', category: '調味料・油', unit: '本', days: 180, allergens: ['小麦', '大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'diet'] },
  { name: 'みりん', category: '調味料・油', unit: '本', days: 180, allergens: [], dietaryTags: ['vegetarian', 'vegan'] },
  { name: '料理酒', category: '調味料・油', unit: '本', days: 180, allergens: [], dietaryTags: ['vegetarian', 'vegan'] },
  { name: '砂糖', category: '調味料・油', unit: '袋', days: 365, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { name: '味噌', category: '調味料・油', unit: '個', days: 180, allergens: ['大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { name: 'マヨネーズ', category: '調味料・油', unit: '本', days: 120, allergens: ['卵', '大豆'], dietaryTags: ['vegetarian'] },
  { name: 'ケチャップ', category: '調味料・油', unit: '本', days: 120, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan'] },
  { name: 'コンソメ', category: '調味料・油', unit: '箱', days: 180, allergens: ['乳', '小麦', '肉・魚'], dietaryTags: [] },
  { name: '鶏がらスープの素', category: '調味料・油', unit: '袋', days: 180, allergens: ['肉・魚'], dietaryTags: [] },
  { name: 'めんつゆ', category: '調味料・油', unit: '本', days: 120, allergens: ['小麦', '大豆', '肉・魚'], dietaryTags: [] },
  { name: '塩コショウ', category: '調味料・油', unit: '個', days: 240, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { name: 'ごま油', category: '調味料・油', unit: '本', days: 180, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { name: 'オリーブオイル', category: '調味料・油', unit: '本', days: 180, allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] }
];

export const QUICK_ITEMS = [
  { name: '卵', category: '卵・乳・大豆', quantity: 6, unit: '個', days: 10 },
  { name: '鶏むね肉', category: '肉類', quantity: 1, unit: '枚', days: 3 },
  { name: '鮭', category: '魚介類', quantity: 2, unit: '切れ', days: 3 },
  { name: '豆腐', category: '卵・乳・大豆', quantity: 1, unit: '丁', days: 5 },
  { name: 'ブロッコリー', category: '野菜・きのこ', quantity: 1, unit: '株', days: 4 },
  { name: 'もやし', category: '野菜・きのこ', quantity: 1, unit: '袋', days: 2 },
  { name: 'しめじ', category: '野菜・きのこ', quantity: 1, unit: 'パック', days: 5 },
  { name: 'ツナ缶', category: '魚介類', quantity: 1, unit: '缶', days: 365 }
];

export const DEFAULT_INVENTORY = [
  { id: '1', name: '鶏むね肉', category: '肉類', quantity: 2, unit: '枚', expiryDate: getFutureDate(2), allergens: ['肉・魚'], dietaryTags: ['halal', 'additive_free', 'diet'] },
  { id: '2', name: '豚薄切り肉', category: '肉類', quantity: 200, unit: 'g', expiryDate: getFutureDate(1), allergens: ['肉・魚'], dietaryTags: ['additive_free'] },
  { id: '3', name: '卵', category: '卵・乳・大豆', quantity: 6, unit: '個', expiryDate: getFutureDate(7), allergens: ['卵'], dietaryTags: ['vegetarian', 'additive_free', 'diet'] },
  { id: '4', name: '玉ねぎ', category: '野菜・きのこ', quantity: 3, unit: '個', expiryDate: getFutureDate(10), allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { id: '5', name: 'にんじん', category: '野菜・きのこ', quantity: 2, unit: '本', expiryDate: getFutureDate(6), allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { id: '6', name: 'キャベツ', category: '野菜・きのこ', quantity: 0.5, unit: '個', expiryDate: getFutureDate(5), allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { id: '7', name: '醤油', category: '調味料・油', quantity: 1, unit: '本', expiryDate: getFutureDate(180), allergens: ['小麦', '大豆'], dietaryTags: ['halal', 'vegetarian', 'vegan', 'diet'] },
  { id: '8', name: 'みりん', category: '調味料・油', quantity: 1, unit: '本', expiryDate: getFutureDate(180), allergens: [], dietaryTags: ['vegetarian', 'vegan'] },
  { id: '9', name: '塩コショウ', category: '調味料・油', quantity: 1, unit: '個', expiryDate: getFutureDate(200), allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'] },
  { id: '10', name: 'ごま油', category: '調味料・油', quantity: 1, unit: '本', expiryDate: getFutureDate(150), allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] },
  { id: '11', name: '米', category: '主食・麺', quantity: 5, unit: 'kg', expiryDate: getFutureDate(90), allergens: [], dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free'] }
];

// 1人前あたりのレシピデータ（広い食材に対応）
export const RECIPE_DATABASE = [
  {
    id: 'r1',
    title: 'ふんわりトロトロ親子丼',
    category: '主食',
    cookingTime: 15,
    description: '鶏むね肉と甘辛いタレ、半熟卵が食欲をそそる定番丼ぶり。',
    dietaryTags: ['halal', 'additive_free'],
    allergens: ['卵', '小麦', '大豆', '肉・魚'],
    ingredients: [
      { name: '鶏むね肉', amount: 0.5, unit: '枚' },
      { name: '卵', amount: 1.5, unit: '個' },
      { name: '玉ねぎ', amount: 0.25, unit: '個' },
      { name: '醤油', amount: 0.05, unit: '本' },
      { name: 'みりん', amount: 0.05, unit: '本' },
      { name: '米', amount: 0.15, unit: 'kg' }
    ],
    nutrition: { calories: 580, protein: 28, fat: 11, carbs: 84 }
  },
  {
    id: 'r2',
    title: 'シャキシャキ豚野菜炒め',
    category: '主菜',
    cookingTime: 10,
    description: 'ごま油の香ばしさと野菜のシャキシャキ感がたまらないスピードメニュー。',
    dietaryTags: ['additive_free', 'diet'],
    allergens: ['小麦', '大豆', '肉・魚'],
    ingredients: [
      { name: '豚薄切り肉', amount: 80, unit: 'g' },
      { name: 'キャベツ', amount: 0.15, unit: '個' },
      { name: 'にんじん', amount: 0.25, unit: '本' },
      { name: '塩コショウ', amount: 0.02, unit: '個' },
      { name: 'ごま油', amount: 0.03, unit: '本' },
      { name: '醤油', amount: 0.03, unit: '本' }
    ],
    nutrition: { calories: 290, protein: 16, fat: 17, carbs: 12 }
  },
  {
    id: 'r3',
    title: '鮭とブロッコリーのレモンペッパーソテー',
    category: '主菜',
    cookingTime: 12,
    description: '鮭の良質な脂とブロッコリーのビタミンを摂れる高タンパク食。',
    dietaryTags: ['halal', 'additive_free', 'diet'],
    allergens: ['肉・魚'],
    ingredients: [
      { name: '鮭', amount: 1, unit: '切れ' },
      { name: 'ブロッコリー', amount: 0.3, unit: '株' },
      { name: 'オリーブオイル', amount: 0.03, unit: '本' },
      { name: '塩コショウ', amount: 0.02, unit: '個' }
    ],
    nutrition: { calories: 270, protein: 25, fat: 15, carbs: 6 }
  },
  {
    id: 'r4',
    title: '豆腐ともやしのヘルシー中華あんかけ',
    category: '主菜',
    cookingTime: 10,
    description: '低カロリーで満足感抜群！ビーガン対応の節約＆ダイエット献立。',
    dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'],
    allergens: ['大豆', '小麦'],
    ingredients: [
      { name: '豆腐', amount: 0.5, unit: '丁' },
      { name: 'もやし', amount: 0.5, unit: '袋' },
      { name: 'しめじ', amount: 0.3, unit: 'パック' },
      { name: '醤油', amount: 0.04, unit: '本' },
      { name: 'ごま油', amount: 0.02, unit: '本' }
    ],
    nutrition: { calories: 195, protein: 13, fat: 9, carbs: 14 }
  },
  {
    id: 'r5',
    title: 'ツナとトマトの和風パスタ',
    category: '主食',
    cookingTime: 15,
    description: 'ツナ缶とトマトの旨味が絡む、ランチにもぴったりの一皿。',
    dietaryTags: ['halal', 'diet'],
    allergens: ['小麦', '大豆', '肉・魚'],
    ingredients: [
      { name: 'パスタ', amount: 100, unit: 'g' },
      { name: 'ツナ缶', amount: 0.5, unit: '缶' },
      { name: 'トマト', amount: 0.5, unit: '個' },
      { name: '醤油', amount: 0.03, unit: '本' },
      { name: 'オリーブオイル', amount: 0.03, unit: '本' }
    ],
    nutrition: { calories: 490, protein: 22, fat: 12, carbs: 72 }
  },
  {
    id: 'r6',
    title: 'ほうれん草と卵のふんわり炒め',
    category: '副菜',
    cookingTime: 8,
    description: '鉄分とタンパク質を手軽に補給できる彩りおかず。',
    dietaryTags: ['vegetarian', 'additive_free', 'diet'],
    allergens: ['卵'],
    ingredients: [
      { name: 'ほうれん草', amount: 0.5, unit: '束' },
      { name: '卵', amount: 1.5, unit: '個' },
      { name: 'ごま油', amount: 0.02, unit: '本' },
      { name: '塩コショウ', amount: 0.02, unit: '個' }
    ],
    nutrition: { calories: 185, protein: 11, fat: 13, carbs: 4 }
  },
  {
    id: 'r7',
    title: '野菜たっぷりビーガン根菜＆ライス',
    category: '主食',
    cookingTime: 25,
    description: '動物性食材不使用。じゃがいも・にんじん・玉ねぎの自然な甘みを味わう一皿。',
    dietaryTags: ['halal', 'vegetarian', 'vegan', 'additive_free', 'diet'],
    allergens: [],
    ingredients: [
      { name: 'じゃがいも', amount: 1, unit: '個' },
      { name: 'にんじん', amount: 0.5, unit: '本' },
      { name: '玉ねぎ', amount: 0.5, unit: '個' },
      { name: 'ごま油', amount: 0.03, unit: '本' },
      { name: '塩コショウ', amount: 0.02, unit: '個' },
      { name: '米', amount: 0.12, unit: 'kg' }
    ],
    nutrition: { calories: 390, protein: 7, fat: 9, carbs: 68 }
  }
];

export const DEFAULT_MEMBERS = [
  { id: 'm1', name: '自分', age: 22, gender: 'male', appetiteLevel: 'normal' },
  { id: 'm2', name: '家族メンバー', age: 14, gender: 'female', appetiteLevel: 'small' }
];