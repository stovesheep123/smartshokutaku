// 写真登録モジュール（撮影・画像読込・一括登録候補）
const PHOTO_CANDIDATES = [
  { name: '鮭', category: '魚介類', quantity: 2, unit: '切れ', days: 3 },
  { name: 'ブロッコリー', category: '野菜・きのこ', quantity: 1, unit: '株', days: 4 },
  { name: '豆腐', category: '卵・乳・大豆', quantity: 1, unit: '丁', days: 5 },
  { name: 'もやし', category: '野菜・きのこ', quantity: 1, unit: '袋', days: 2 },
  { name: 'トマト', category: '野菜・きのこ', quantity: 2, unit: '個', days: 5 },
  { name: 'パスタ', category: '主食・麺', quantity: 300, unit: 'g', days: 365 }
];

export function getPhotoCandidates() {
  return PHOTO_CANDIDATES;
}

export function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}