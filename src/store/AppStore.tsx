import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode
} from 'react';
import { exportBackupZip, getLastBackupAt, importBackupZip } from '../backup';
import {
  db,
  deleteList,
  deleteRecipe,
  ensureSeedData,
  getAllLists,
  getAllRecipes,
  patchList,
  patchRecipe,
  putList,
  putLocalImage,
  putRecipe
} from '../db';
import { metaFromShareQuery, normalizeUrl, type RecipeMeta } from '../import/fetchRecipeMeta';
import { allTags, evalSmart } from '../logic/recipes';
import type { ManualList, Recipe, RecipeList, SmartCondition, SmartList } from '../types';
import { colorForString, makeId, reorderByTarget, todayIso } from '../utils/app';

export type Screen = 'home' | 'detail' | 'lists' | 'listDetail' | 'smartEdit' | 'settings' | 'import';
export type Tab = 'home' | 'lists' | 'settings';
export type SortKey = 'old' | 'rated' | 'recent';
export type ImportStage = 'paste' | 'loading' | 'review';

export type SmartDraft = {
  id: string | null;
  name: string;
  tags: string[];
  tagMode: 'all' | 'any';
  minRating: number;
  notMadeDays: number;
  keyword: string;
};

export type ToastState = {
  id: number;
  message: string;
} | null;

export type ConfirmState = {
  type: 'recipe' | 'list';
  id: string;
  name: string;
} | null;

export type AppState = {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  recipes: Recipe[];
  lists: RecipeList[];
  imageCount: number;
  screen: Screen;
  tab: Tab;
  detailReturn: Screen;
  importReturn: Screen;
  smartReturn: Screen;
  selectedRecipeId: string | null;
  selectedListId: string | null;
  search: string;
  activeTags: string[];
  sort: SortKey;
  editing: boolean;
  tagInput: string;
  editPasteUrl: string;
  editImportLoading: boolean;
  fabMenuOpen: boolean;
  addSheetOpen: boolean;
  addTargetRecipeId: string | null;
  pickerOpen: boolean;
  newListOpen: boolean;
  shortcutHelpOpen: boolean;
  importStage: ImportStage;
  pasteValue: string;
  importDraft: RecipeMeta | null;
  smartDraft: SmartDraft | null;
  toast: ToastState;
  confirm: ConfirmState;
  lastBackupAt: number | null;
};

type Action =
  | { type: 'load:start' }
  | {
      type: 'load:ready';
      recipes: Recipe[];
      lists: RecipeList[];
      imageCount: number;
      screen?: Screen;
      importDraft?: RecipeMeta | null;
      importStage?: ImportStage;
      pasteValue?: string;
      lastBackupAt: number | null;
    }
  | { type: 'load:error'; error: string }
  | { type: 'refresh:data'; recipes: Recipe[]; lists: RecipeList[]; imageCount: number }
  | { type: 'ui:patch'; patch: Partial<AppState> }
  | { type: 'toast'; message: string }
  | { type: 'toast:dismiss' }
  | { type: 'recipe:upsert'; recipe: Recipe }
  | { type: 'recipe:patch'; id: string; patch: Partial<Recipe> }
  | { type: 'list:upsert'; list: RecipeList }
  | { type: 'list:patch'; id: string; patch: Partial<RecipeList> };

const initialState: AppState = {
  status: 'loading',
  error: null,
  recipes: [],
  lists: [],
  imageCount: 0,
  screen: 'home',
  tab: 'home',
  detailReturn: 'home',
  importReturn: 'home',
  smartReturn: 'lists',
  selectedRecipeId: null,
  selectedListId: null,
  search: '',
  activeTags: [],
  sort: 'recent',
  editing: false,
  tagInput: '',
  editPasteUrl: '',
  editImportLoading: false,
  fabMenuOpen: false,
  addSheetOpen: false,
  addTargetRecipeId: null,
  pickerOpen: false,
  newListOpen: false,
  shortcutHelpOpen: false,
  importStage: 'paste',
  pasteValue: '',
  importDraft: null,
  smartDraft: null,
  toast: null,
  confirm: null,
  lastBackupAt: null
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load:start':
      return { ...state, status: 'loading', error: null };
    case 'load:ready':
      return {
        ...state,
        status: 'ready',
        error: null,
        recipes: action.recipes,
        lists: action.lists,
        imageCount: action.imageCount,
        screen: action.screen ?? state.screen,
        tab: action.screen === 'import' ? 'home' : state.tab,
        importDraft: action.importDraft ?? state.importDraft,
        importStage: action.importStage ?? state.importStage,
        pasteValue: action.pasteValue ?? state.pasteValue,
        lastBackupAt: action.lastBackupAt
      };
    case 'load:error':
      return { ...state, status: 'error', error: action.error };
    case 'refresh:data':
      return { ...state, recipes: action.recipes, lists: action.lists, imageCount: action.imageCount };
    case 'ui:patch':
      return { ...state, ...action.patch };
    case 'toast':
      return { ...state, toast: { id: Date.now(), message: action.message } };
    case 'toast:dismiss':
      return { ...state, toast: null };
    case 'recipe:upsert':
      return {
        ...state,
        recipes: [action.recipe, ...state.recipes.filter((recipe) => recipe.id !== action.recipe.id)]
      };
    case 'recipe:patch':
      return {
        ...state,
        recipes: state.recipes.map((recipe) =>
          recipe.id === action.id ? { ...recipe, ...action.patch, updatedAt: Date.now() } : recipe
        )
      };
    case 'list:upsert':
      return {
        ...state,
        lists: [...state.lists.filter((list) => list.id !== action.list.id), action.list].sort((a, b) => a.order - b.order)
      };
    case 'list:patch':
      return {
        ...state,
        lists: state.lists
          .map((list) => (list.id === action.id ? ({ ...list, ...action.patch } as RecipeList) : list))
          .sort((a, b) => a.order - b.order)
      };
    default:
      return state;
  }
}

export type AppActions = {
  refresh: () => Promise<void>;
  dismissToast: () => void;
  showToast: (message: string) => void;
  goHome: () => void;
  goLists: () => void;
  goSettings: () => void;
  back: () => void;
  openRecipe: (id: string, detailReturn?: Screen) => void;
  openList: (id: string) => void;
  setSearch: (value: string) => void;
  toggleHomeTag: (tag: string) => void;
  setSort: (sort: SortKey) => void;
  openFabMenu: () => void;
  closeFabMenu: () => void;
  createBlankRecipe: () => Promise<void>;
  patchRecipe: (id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>) => Promise<void>;
  setRating: (id: string, rating: number) => Promise<void>;
  markMade: (id: string) => Promise<void>;
  requestDeleteRecipe: (id: string) => void;
  requestDeleteList: (id: string) => void;
  cancelConfirm: () => void;
  confirmDelete: () => Promise<void>;
  startEdit: () => void;
  saveEdit: () => void;
  setTagInput: (value: string) => void;
  addTag: (recipeId: string, tag: string) => Promise<void>;
  removeTag: (recipeId: string, tag: string) => Promise<void>;
  setEditPasteUrl: (value: string) => void;
  runEditImport: (recipeId: string) => Promise<void>;
  addLocalImage: (recipeId: string, file: File) => Promise<void>;
  openAddSheet: (recipeId: string) => void;
  closeAddSheet: () => void;
  toggleInList: (listId: string, recipeId: string) => Promise<void>;
  openNewListMenu: () => void;
  closeNewListMenu: () => void;
  createManualList: () => Promise<void>;
  renameList: (id: string, name: string) => Promise<void>;
  startCreateSmart: () => void;
  openPicker: () => void;
  closePicker: () => void;
  toggleRecipeInSelectedList: (recipeId: string) => Promise<void>;
  setManualRecipeOrder: (listId: string, recipeIds: string[]) => Promise<void>;
  editSmartList: (id: string) => void;
  patchSmartDraft: (patch: Partial<SmartDraft>) => void;
  toggleSmartDraftTag: (tag: string) => void;
  saveSmartDraft: () => Promise<void>;
  cancelSmartEdit: () => void;
  startImport: (importReturn?: Screen) => void;
  setPasteValue: (value: string) => void;
  runImport: () => Promise<void>;
  patchImportDraft: (patch: Partial<RecipeMeta>) => void;
  saveImport: () => Promise<void>;
  cancelImport: () => void;
  redoImport: () => void;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  previewShare: () => void;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;
};

type StoreValue = {
  state: AppState;
  actions: AppActions;
  tags: string[];
};

const AppStoreContext = createContext<StoreValue | null>(null);

function recipeBodyFromMeta(meta: RecipeMeta): string {
  return `${meta.desc || ''}\n\n## 材料\n- \n\n## 作り方\n1. `;
}

function smartConditionFromDraft(draft: SmartDraft): SmartCondition {
  return {
    tags: draft.tags,
    tagMode: draft.tagMode,
    minRating: draft.minRating,
    notMadeDays: draft.notMadeDays,
    keyword: draft.keyword
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const backupPrompted = useRef(false);

  const refresh = useCallback(async () => {
    const [recipes, lists, imageCount] = await Promise.all([getAllRecipes(), getAllLists(), db.images.count()]);
    dispatch({ type: 'refresh:data', recipes, lists, imageCount });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      dispatch({ type: 'load:start' });
      try {
        await ensureSeedData();
        const [recipes, lists, imageCount] = await Promise.all([getAllRecipes(), getAllLists(), db.images.count()]);
        const isShareRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/share');
        const shareMeta = isShareRoute ? metaFromShareQuery(new URLSearchParams(window.location.search)) : null;

        if (!cancelled) {
          dispatch({
            type: 'load:ready',
            recipes,
            lists,
            imageCount,
            screen: shareMeta ? 'import' : 'home',
            importDraft: shareMeta,
            importStage: shareMeta ? 'review' : 'paste',
            pasteValue: shareMeta?.url ?? '',
            lastBackupAt: getLastBackupAt()
          });
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({ type: 'load:error', error: error instanceof Error ? error.message : '読み込みに失敗しました' });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (backupPrompted.current || state.status !== 'ready') return;
    const last = state.lastBackupAt;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (!last || Date.now() - last >= sevenDays) {
      backupPrompted.current = true;
      dispatch({ type: 'toast', message: '前回のバックアップから7日以上経っています' });
    }
  }, [state.lastBackupAt, state.status]);

  const tags = useMemo(() => allTags(state.recipes), [state.recipes]);

  const actions = useMemo<AppActions>(() => {
    const manualLists = () => state.lists.filter((list): list is ManualList => list.type === 'manual');
    const smartLists = () => state.lists.filter((list): list is SmartList => list.type === 'smart');
    const maxListOrder = () => state.lists.reduce((max, list) => Math.max(max, list.order), -1);
    const currentRecipe = (id: string) => state.recipes.find((recipe) => recipe.id === id);
    const currentList = (id: string) => state.lists.find((list) => list.id === id);
    const showError = (error: unknown) => {
      dispatch({ type: 'toast', message: error instanceof Error ? error.message : '処理に失敗しました' });
    };

    const navigateTab = (screen: Screen, tab: Tab) => dispatch({ type: 'ui:patch', patch: { screen, tab, editing: false } });

    return {
      refresh,
      dismissToast: () => dispatch({ type: 'toast:dismiss' }),
      showToast: (message) => dispatch({ type: 'toast', message }),
      goHome: () => navigateTab('home', 'home'),
      goLists: () => navigateTab('lists', 'lists'),
      goSettings: () => navigateTab('settings', 'settings'),
      back: () => {
        if (state.screen === 'detail') {
          dispatch({ type: 'ui:patch', patch: { screen: state.detailReturn, editing: false, tab: state.detailReturn === 'lists' ? 'lists' : state.tab } });
        } else if (state.screen === 'listDetail') {
          dispatch({ type: 'ui:patch', patch: { screen: 'lists', tab: 'lists', pickerOpen: false } });
        } else if (state.screen === 'smartEdit') {
          dispatch({ type: 'ui:patch', patch: { screen: state.smartReturn, tab: state.smartReturn === 'lists' ? 'lists' : state.tab, smartDraft: null } });
        } else if (state.screen === 'import') {
          dispatch({ type: 'ui:patch', patch: { screen: state.importReturn, tab: state.importReturn === 'settings' ? 'settings' : 'home' } });
        } else {
          dispatch({ type: 'ui:patch', patch: { screen: 'home', tab: 'home' } });
        }
      },
      openRecipe: (id, detailReturn = state.screen) => {
        dispatch({
          type: 'ui:patch',
          patch: {
            screen: 'detail',
            selectedRecipeId: id,
            detailReturn,
            editing: false,
            addSheetOpen: false,
            pickerOpen: false
          }
        });
      },
      openList: (id) => {
        dispatch({ type: 'ui:patch', patch: { screen: 'listDetail', tab: 'lists', selectedListId: id, pickerOpen: false } });
      },
      setSearch: (value) => dispatch({ type: 'ui:patch', patch: { search: value } }),
      toggleHomeTag: (tag) => {
        const next = state.activeTags.includes(tag) ? state.activeTags.filter((item) => item !== tag) : [...state.activeTags, tag];
        dispatch({ type: 'ui:patch', patch: { activeTags: next } });
      },
      setSort: (sort) => dispatch({ type: 'ui:patch', patch: { sort } }),
      openFabMenu: () => dispatch({ type: 'ui:patch', patch: { fabMenuOpen: true } }),
      closeFabMenu: () => dispatch({ type: 'ui:patch', patch: { fabMenuOpen: false } }),
      createBlankRecipe: async () => {
        const now = Date.now();
        const name = '新しいレシピ';
        const recipe: Recipe = {
          id: makeId('r'),
          name,
          rating: 0,
          lastMade: todayIso(),
          added: now,
          tags: [],
          url: '',
          body: '## 材料\n- \n\n## 作り方\n1. ',
          images: [],
          createdAt: now,
          updatedAt: now
        };
        try {
          await putRecipe(recipe);
          dispatch({ type: 'recipe:upsert', recipe });
          dispatch({
            type: 'ui:patch',
            patch: { screen: 'detail', selectedRecipeId: recipe.id, detailReturn: 'home', editing: true, fabMenuOpen: false }
          });
        } catch (error) {
          showError(error);
        }
      },
      patchRecipe: async (id, patch) => {
        dispatch({ type: 'recipe:patch', id, patch: patch as Partial<Recipe> });
        try {
          await patchRecipe(id, patch);
        } catch (error) {
          showError(error);
          await refresh();
        }
      },
      setRating: async (id, rating) => {
        await actions.patchRecipe(id, { rating });
      },
      markMade: async (id) => {
        await actions.patchRecipe(id, { lastMade: todayIso() });
        dispatch({ type: 'toast', message: '作った記録を残しました' });
      },
      requestDeleteRecipe: (id) => {
        const recipe = currentRecipe(id);
        dispatch({ type: 'ui:patch', patch: { confirm: { type: 'recipe', id, name: recipe?.name?.trim() || 'このレシピ' } } });
      },
      requestDeleteList: (id) => {
        const list = currentList(id);
        dispatch({ type: 'ui:patch', patch: { confirm: { type: 'list', id, name: list?.name?.trim() || 'このリスト' } } });
      },
      cancelConfirm: () => dispatch({ type: 'ui:patch', patch: { confirm: null } }),
      confirmDelete: async () => {
        const target = state.confirm;
        if (!target) return;
        try {
          if (target.type === 'recipe') {
            await deleteRecipe(target.id);
            await refresh();
            const toListDetail = state.detailReturn === 'listDetail';
            dispatch({
              type: 'ui:patch',
              patch: {
                confirm: null,
                screen: toListDetail ? 'listDetail' : 'home',
                tab: toListDetail ? 'lists' : 'home',
                editing: false,
                selectedRecipeId: null
              }
            });
            dispatch({ type: 'toast', message: 'レシピを削除しました' });
          } else {
            await deleteList(target.id);
            await refresh();
            dispatch({ type: 'ui:patch', patch: { confirm: null, screen: 'lists', tab: 'lists', selectedListId: null } });
            dispatch({ type: 'toast', message: 'リストを削除しました' });
          }
        } catch (error) {
          dispatch({ type: 'ui:patch', patch: { confirm: null } });
          showError(error);
        }
      },
      startEdit: () => dispatch({ type: 'ui:patch', patch: { editing: true, tagInput: '', editPasteUrl: '' } }),
      saveEdit: () => {
        dispatch({ type: 'ui:patch', patch: { editing: false, tagInput: '', editPasteUrl: '' } });
        dispatch({ type: 'toast', message: '保存しました' });
      },
      setTagInput: (value) => dispatch({ type: 'ui:patch', patch: { tagInput: value } }),
      addTag: async (recipeId, tag) => {
        const value = tag.trim();
        const recipe = currentRecipe(recipeId);
        if (!value || !recipe || recipe.tags.includes(value)) return;
        await actions.patchRecipe(recipeId, { tags: [...recipe.tags, value] });
        dispatch({ type: 'ui:patch', patch: { tagInput: '' } });
      },
      removeTag: async (recipeId, tag) => {
        const recipe = currentRecipe(recipeId);
        if (!recipe) return;
        await actions.patchRecipe(recipeId, { tags: recipe.tags.filter((item) => item !== tag) });
      },
      setEditPasteUrl: (value) => dispatch({ type: 'ui:patch', patch: { editPasteUrl: value } }),
      runEditImport: async (recipeId) => {
        const url = normalizeUrl(state.editPasteUrl.trim());
        const recipe = currentRecipe(recipeId);
        if (!url || !recipe) return;
        await actions.patchRecipe(recipeId, { url });
        dispatch({ type: 'ui:patch', patch: { editPasteUrl: '' } });
        dispatch({ type: 'toast', message: 'URLを保存しました' });
      },
      addLocalImage: async (recipeId, file) => {
        const recipe = currentRecipe(recipeId);
        if (!recipe) return;
        try {
          const key = makeId(`img_${recipeId}`);
          await putLocalImage({ key, blob: file, createdAt: Date.now(), updatedAt: Date.now() });
          await actions.patchRecipe(recipeId, { images: [...recipe.images, { type: 'local', src: key }] });
          dispatch({ type: 'ui:patch', patch: { imageCount: state.imageCount + 1 } });
          dispatch({ type: 'toast', message: '写真を追加しました' });
        } catch (error) {
          showError(error);
        }
      },
      openAddSheet: (recipeId) => dispatch({ type: 'ui:patch', patch: { addSheetOpen: true, addTargetRecipeId: recipeId } }),
      closeAddSheet: () => dispatch({ type: 'ui:patch', patch: { addSheetOpen: false, addTargetRecipeId: null } }),
      toggleInList: async (listId, recipeId) => {
        const list = manualLists().find((item) => item.id === listId);
        if (!list) return;
        const recipeIds = list.recipeIds.includes(recipeId)
          ? list.recipeIds.filter((id) => id !== recipeId)
          : [...list.recipeIds, recipeId];
        dispatch({ type: 'list:patch', id: listId, patch: { recipeIds } as Partial<RecipeList> });
        try {
          await patchList(listId, { recipeIds } as Partial<RecipeList>);
        } catch (error) {
          showError(error);
          await refresh();
        }
      },
      openNewListMenu: () => dispatch({ type: 'ui:patch', patch: { newListOpen: true } }),
      closeNewListMenu: () => dispatch({ type: 'ui:patch', patch: { newListOpen: false } }),
      createManualList: async () => {
        const list: ManualList = { id: makeId('m'), name: '新しいリスト', type: 'manual', order: maxListOrder() + 1, recipeIds: [] };
        try {
          await putList(list);
          dispatch({ type: 'list:upsert', list });
          dispatch({ type: 'ui:patch', patch: { screen: 'listDetail', selectedListId: list.id, tab: 'lists', newListOpen: false } });
        } catch (error) {
          showError(error);
        }
      },
      renameList: async (id, name) => {
        dispatch({ type: 'list:patch', id, patch: { name } as Partial<RecipeList> });
        try {
          await patchList(id, { name } as Partial<RecipeList>);
        } catch (error) {
          showError(error);
          await refresh();
        }
      },
      startCreateSmart: () => {
        dispatch({
          type: 'ui:patch',
          patch: {
            newListOpen: false,
            screen: 'smartEdit',
            tab: 'lists',
            smartReturn: 'lists',
            smartDraft: { id: null, name: '', tags: [], tagMode: 'any', minRating: 0, notMadeDays: 0, keyword: '' }
          }
        });
      },
      openPicker: () => dispatch({ type: 'ui:patch', patch: { pickerOpen: true } }),
      closePicker: () => dispatch({ type: 'ui:patch', patch: { pickerOpen: false } }),
      toggleRecipeInSelectedList: async (recipeId) => {
        if (!state.selectedListId) return;
        await actions.toggleInList(state.selectedListId, recipeId);
      },
      setManualRecipeOrder: async (listId, recipeIds) => {
        dispatch({ type: 'list:patch', id: listId, patch: { recipeIds } as Partial<RecipeList> });
        try {
          await patchList(listId, { recipeIds } as Partial<RecipeList>);
        } catch (error) {
          showError(error);
          await refresh();
        }
      },
      editSmartList: (id) => {
        const list = smartLists().find((item) => item.id === id);
        if (!list) return;
        dispatch({
          type: 'ui:patch',
          patch: {
            screen: 'smartEdit',
            tab: 'lists',
            smartReturn: 'listDetail',
            smartDraft: { id: list.id, name: list.name, ...list.cond }
          }
        });
      },
      patchSmartDraft: (patch) => {
        if (!state.smartDraft) return;
        dispatch({ type: 'ui:patch', patch: { smartDraft: { ...state.smartDraft, ...patch } } });
      },
      toggleSmartDraftTag: (tag) => {
        if (!state.smartDraft) return;
        const tags = state.smartDraft.tags.includes(tag)
          ? state.smartDraft.tags.filter((item) => item !== tag)
          : [...state.smartDraft.tags, tag];
        dispatch({ type: 'ui:patch', patch: { smartDraft: { ...state.smartDraft, tags } } });
      },
      saveSmartDraft: async () => {
        const draft = state.smartDraft;
        if (!draft) return;
        const name = draft.name.trim() || '新しいスマートリスト';
        const cond = smartConditionFromDraft(draft);
        const existing = draft.id ? currentList(draft.id) : null;
        const list: SmartList = {
          id: draft.id || makeId('s'),
          name,
          type: 'smart',
          order: existing?.order ?? maxListOrder() + 1,
          cond
        };
        try {
          await putList(list);
          dispatch({ type: 'list:upsert', list });
          dispatch({
            type: 'ui:patch',
            patch: { screen: draft.id ? state.smartReturn : 'lists', tab: 'lists', selectedListId: list.id, smartDraft: null }
          });
          dispatch({ type: 'toast', message: 'スマートリストを保存しました' });
        } catch (error) {
          showError(error);
        }
      },
      cancelSmartEdit: () => dispatch({ type: 'ui:patch', patch: { screen: state.smartReturn, tab: 'lists', smartDraft: null } }),
      startImport: (importReturn = 'home') => {
        dispatch({
          type: 'ui:patch',
          patch: {
            screen: 'import',
            importReturn,
            importStage: 'paste',
            pasteValue: '',
            importDraft: null,
            fabMenuOpen: false
          }
        });
      },
      setPasteValue: (value) => dispatch({ type: 'ui:patch', patch: { pasteValue: value } }),
      runImport: async () => {
        const url = normalizeUrl(state.pasteValue.trim());
        if (!url) return;
        const draft: RecipeMeta = { url, name: '', desc: '', image: '', color: colorForString(url), fromSite: false };
        dispatch({ type: 'ui:patch', patch: { importStage: 'review', importDraft: draft } });
      },
      patchImportDraft: (patch) => {
        if (!state.importDraft) return;
        dispatch({ type: 'ui:patch', patch: { importDraft: { ...state.importDraft, ...patch } } });
      },
      saveImport: async () => {
        const draft = state.importDraft;
        if (!draft) return;
        const now = Date.now();
        const name = draft.name.trim() || '取り込みレシピ';
        const recipe: Recipe = {
          id: makeId('r'),
          name,
          rating: 0,
          lastMade: todayIso(),
          added: now,
          tags: [],
          url: draft.url,
          body: recipeBodyFromMeta(draft),
          images: draft.image ? [{ type: 'url' as const, src: draft.image }] : [],
          createdAt: now,
          updatedAt: now
        };
        try {
          await putRecipe(recipe);
          dispatch({ type: 'recipe:upsert', recipe });
          dispatch({
            type: 'ui:patch',
            patch: {
              screen: 'detail',
              tab: 'home',
              selectedRecipeId: recipe.id,
              detailReturn: 'home',
              importDraft: null,
              importStage: 'paste',
              pasteValue: ''
            }
          });
          dispatch({ type: 'toast', message: '取り込んで保存しました' });
        } catch (error) {
          showError(error);
        }
      },
      cancelImport: () => dispatch({ type: 'ui:patch', patch: { screen: state.importReturn, tab: state.importReturn === 'settings' ? 'settings' : 'home' } }),
      redoImport: () => dispatch({ type: 'ui:patch', patch: { importStage: 'paste', importDraft: null, pasteValue: '' } }),
      openShortcutHelp: () => dispatch({ type: 'ui:patch', patch: { shortcutHelpOpen: true } }),
      closeShortcutHelp: () => dispatch({ type: 'ui:patch', patch: { shortcutHelpOpen: false } }),
      previewShare: () => {
        const params = new URLSearchParams({
          url: 'https://example.com/recipes/shortcut',
          title: 'ショートカット共有のサンプル',
          desc: '共有シートから入ると確認画面を直接開きます。'
        });
        const meta = metaFromShareQuery(params);
        dispatch({
          type: 'ui:patch',
          patch: {
            shortcutHelpOpen: false,
            screen: 'import',
            importReturn: 'settings',
            importStage: 'review',
            importDraft: meta,
            pasteValue: meta?.url ?? ''
          }
        });
      },
      exportBackup: async () => {
        try {
          const lastBackupAt = await exportBackupZip();
          dispatch({ type: 'ui:patch', patch: { lastBackupAt } });
          dispatch({ type: 'toast', message: 'バックアップを書き出しました' });
        } catch (error) {
          showError(error);
        }
      },
      importBackup: async (file) => {
        try {
          const lastBackupAt = await importBackupZip(file);
          dispatch({ type: 'ui:patch', patch: { lastBackupAt } });
          await refresh();
          dispatch({ type: 'toast', message: 'バックアップを復元しました' });
        } catch (error) {
          showError(error);
        }
      }
    };
  }, [refresh, state]);

  const value = useMemo(() => ({ state, actions, tags }), [actions, state, tags]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): StoreValue {
  const value = useContext(AppStoreContext);
  if (!value) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return value;
}

export function useRecipe(id: string | null): Recipe | undefined {
  const { state } = useAppStore();
  return state.recipes.find((recipe) => recipe.id === id);
}

export function useSelectedList(): RecipeList | undefined {
  const { state } = useAppStore();
  return state.lists.find((list) => list.id === state.selectedListId);
}

export function useSmartMatches(condition: SmartCondition | null | undefined): Recipe[] {
  const { state } = useAppStore();
  return evalSmart(state.recipes, condition);
}

export { reorderByTarget };
