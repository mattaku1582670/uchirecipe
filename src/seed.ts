import type { ManualList, Recipe, RecipeList, SmartList } from './types';

const SEED_TIME = Date.parse('2026-06-22T00:00:00.000Z');

export function sampleRecipeBody(name: string): string {
  return `## 材料（2人分）
- 主な材料　適量
- 調味料　大さじ2
- 香味野菜　少々
- 仕上げ用　お好みで

## 作り方
1. 下ごしらえをして材料を切りそろえる。
2. フライパンを中火で熱し、香りが立つまで炒める。
3. 調味料を加えて全体に絡める。
4. 火を弱めて**味をなじませ**、器に盛りつける。

## メモ
冷めても美味しい。${name.length ? '' : ''}`;
}

function recipe(
  id: string,
  name: string,
  rating: number,
  lastMade: string,
  added: number,
  tags: string[],
  url: string
): Recipe {
  return {
    id,
    name,
    rating,
    lastMade,
    added,
    tags,
    url,
    body: sampleRecipeBody(name),
    images: [],
    createdAt: SEED_TIME + added,
    updatedAt: SEED_TIME + added
  };
}

export const seedRecipes: Recipe[] = [
  recipe('r1', '鶏の照り焼き', 4, '2026-06-18', 0, ['和食', '鶏', '定番'], 'https://example.com/teriyaki'),
  recipe('r2', '野菜のミネストローネ', 5, '2026-05-30', 1, ['スープ', '野菜', '作り置き'], ''),
  recipe('r3', '基本のカルボナーラ', 3, '2026-06-10', 2, ['パスタ', '洋食'], 'https://example.com/carbonara'),
  recipe('r4', '麻婆豆腐', 5, '2026-06-20', 3, ['中華', '豆腐', '辛い'], ''),
  recipe('r5', '鯖の味噌煮', 4, '2026-04-12', 4, ['和食', '魚', '煮物'], ''),
  recipe('r6', 'キーマカレー', 4, '2026-06-05', 5, ['カレー', '作り置き', 'スパイス'], 'https://example.com/keema'),
  recipe('r7', '肉じゃが', 3, '2026-03-22', 6, ['和食', '定番', '煮物'], ''),
  recipe('r8', 'ガパオライス', 5, '2026-06-15', 7, ['タイ料理', '鶏'], ''),
  recipe('r9', 'かぼちゃのポタージュ', 4, '2026-02-28', 8, ['スープ', '野菜'], ''),
  recipe('r10', '豚の角煮', 4, '2026-05-12', 9, ['和食', '煮物'], ''),
  recipe('r11', 'エビチリ', 4, '2026-06-08', 10, ['中華', '辛い'], ''),
  recipe('r12', 'きのこの炊き込みご飯', 3, '2026-01-20', 11, ['和食', '作り置き'], '')
];

export const seedManualLists: ManualList[] = [
  { id: 'm1', name: '週末の作り置き', type: 'manual', order: 0, recipeIds: ['r6', 'r2', 'r12', 'r7'] },
  { id: 'm2', name: 'お気に入り定番', type: 'manual', order: 1, recipeIds: ['r1', 'r4', 'r8'] }
];

export const seedSmartLists: SmartList[] = [
  {
    id: 's1',
    name: 'しばらく作ってない和食',
    type: 'smart',
    order: 2,
    cond: { tags: ['和食'], tagMode: 'any', minRating: 0, notMadeDays: 60, keyword: '' }
  },
  {
    id: 's2',
    name: '高評価のスープ',
    type: 'smart',
    order: 3,
    cond: { tags: ['スープ'], tagMode: 'any', minRating: 4, notMadeDays: 0, keyword: '' }
  }
];

export const seedLists: RecipeList[] = [...seedManualLists, ...seedSmartLists];
