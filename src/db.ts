import Dexie, { type Table } from 'dexie';
import { seedLists, seedRecipes } from './seed';
import { SCHEMA_VERSION, type LocalImageRecord, type Recipe, type RecipeList, type RecipeSnapshot } from './types';

export class UchiRecipeDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  lists!: Table<RecipeList, string>;
  images!: Table<LocalImageRecord, string>;

  constructor() {
    super('uchirecipe');

    this.version(1).stores({
      recipes: 'id, name, rating, lastMade, added, updatedAt, *tags',
      lists: 'id, order, type',
      images: 'key'
    });
  }
}

export const db = new UchiRecipeDatabase();

let seedPromise: Promise<void> | null = null;

export function ensureSeedData(): Promise<void> {
  seedPromise ??= (async () => {
    // 本番（公開版）は空で開始する。サンプルデータはローカル開発時のみ投入。
    if (import.meta.env.PROD) return;

    await db.transaction('rw', db.recipes, db.lists, db.images, async () => {
      const [recipeCount, listCount] = await Promise.all([db.recipes.count(), db.lists.count()]);
      if (recipeCount > 0 || listCount > 0) return;

      await db.recipes.bulkAdd(seedRecipes);
      await db.lists.bulkAdd(seedLists);
    });
  })();

  return seedPromise;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  await ensureSeedData();
  return db.recipes.orderBy('added').toArray();
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  await ensureSeedData();
  return db.recipes.get(id);
}

export async function putRecipe(recipe: Recipe): Promise<string> {
  const now = Date.now();
  const record: Recipe = {
    ...recipe,
    createdAt: recipe.createdAt || now,
    updatedAt: now
  };

  await db.recipes.put(record);
  return record.id;
}

export async function patchRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<void> {
  await db.recipes.update(id, {
    ...patch,
    updatedAt: Date.now()
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  await db.transaction('rw', db.recipes, db.lists, async () => {
    await db.recipes.delete(id);
    const manualLists = await db.lists.where('type').equals('manual').toArray();

    await Promise.all(
      manualLists.map((list) => {
        if (list.type !== 'manual' || !list.recipeIds.includes(id)) return undefined;
        return db.lists.put({
          ...list,
          recipeIds: list.recipeIds.filter((recipeId) => recipeId !== id)
        });
      })
    );
  });
}

export async function getAllLists(): Promise<RecipeList[]> {
  await ensureSeedData();
  return db.lists.orderBy('order').toArray();
}

export async function getList(id: string): Promise<RecipeList | undefined> {
  await ensureSeedData();
  return db.lists.get(id);
}

export async function putList(list: RecipeList): Promise<string> {
  await db.lists.put(list);
  return list.id;
}

export async function patchList(id: string, patch: Partial<RecipeList>): Promise<void> {
  await db.lists.update(id, patch);
}

export async function deleteList(id: string): Promise<void> {
  await db.lists.delete(id);
}

export async function putLocalImage(record: LocalImageRecord): Promise<string> {
  const now = Date.now();
  const image: LocalImageRecord = {
    ...record,
    createdAt: record.createdAt || now,
    updatedAt: now
  };

  await db.images.put(image);
  return image.key;
}

export async function getLocalImage(key: string): Promise<LocalImageRecord | undefined> {
  return db.images.get(key);
}

export async function deleteLocalImage(key: string): Promise<void> {
  await db.images.delete(key);
}

export async function exportSnapshot(): Promise<RecipeSnapshot> {
  await ensureSeedData();
  const [recipes, lists] = await Promise.all([db.recipes.toArray(), db.lists.orderBy('order').toArray()]);

  return {
    schemaVersion: SCHEMA_VERSION,
    recipes,
    lists
  };
}

export async function replaceSnapshot(snapshot: RecipeSnapshot): Promise<void> {
  if (snapshot.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${snapshot.schemaVersion}`);
  }

  await db.transaction('rw', db.recipes, db.lists, async () => {
    await db.recipes.clear();
    await db.lists.clear();
    await db.recipes.bulkPut(snapshot.recipes);
    await db.lists.bulkPut(snapshot.lists);
  });
}

export async function resetToSeedData(): Promise<void> {
  await db.transaction('rw', db.recipes, db.lists, db.images, async () => {
    await db.recipes.clear();
    await db.lists.clear();
    await db.images.clear();
    await db.recipes.bulkAdd(seedRecipes);
    await db.lists.bulkAdd(seedLists);
  });
}
