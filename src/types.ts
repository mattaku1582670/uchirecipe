export const SCHEMA_VERSION = 1;

export type RecipeImage = {
  type: 'url' | 'local';
  src?: string;
  broken?: boolean;
};

export type Recipe = {
  id: string;
  name: string;
  rating: number;
  lastMade: string;
  added: number;
  tags: string[];
  url: string;
  body: string;
  images: RecipeImage[];
  createdAt: number;
  updatedAt: number;
};

export type ManualList = {
  id: string;
  name: string;
  type: 'manual';
  order: number;
  recipeIds: string[];
};

export type SmartCondition = {
  tags: string[];
  tagMode: 'all' | 'any';
  minRating: number;
  notMadeDays: number;
  keyword: string;
};

export type SmartList = {
  id: string;
  name: string;
  type: 'smart';
  order: number;
  cond: SmartCondition;
};

export type RecipeList = ManualList | SmartList;

export type LocalImageRecord = {
  key: string;
  blob: Blob;
  createdAt: number;
  updatedAt: number;
};

export type RecipeSnapshot = {
  schemaVersion: typeof SCHEMA_VERSION;
  recipes: Recipe[];
  lists: RecipeList[];
};
