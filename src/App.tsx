import { AddToListSheet } from './components/AddToListSheet';
import { BottomNav } from './components/BottomNav';
import { ConfirmSheet } from './components/ConfirmSheet';
import { FabMenu } from './components/FabMenu';
import { NewListMenu } from './components/NewListMenu';
import { RecipePickerSheet } from './components/RecipePickerSheet';
import { ShortcutHelpSheet } from './components/ShortcutHelpSheet';
import { Toast } from './components/Toast';
import { Home } from './screens/Home';
import { Import } from './screens/Import';
import { ListDetail } from './screens/ListDetail';
import { Lists } from './screens/Lists';
import { RecipeDetail } from './screens/RecipeDetail';
import { Settings } from './screens/Settings';
import { SmartEdit } from './screens/SmartEdit';
import { TagManager } from './screens/TagManager';
import { useRef, type TouchEvent } from 'react';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import type { ManualList } from './types';

const BACKABLE_SCREENS = ['detail', 'listDetail', 'smartEdit', 'import', 'tags'];
const EDGE_PX = 32;

function AppFrame() {
  const { state, actions } = useAppStore();
  const swipe = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  const overlayOpen =
    state.fabMenuOpen ||
    state.addSheetOpen ||
    state.pickerOpen ||
    state.newListOpen ||
    state.shortcutHelpOpen ||
    !!state.confirm;
  const canSwipeBack = BACKABLE_SCREENS.includes(state.screen) && !overlayOpen;

  const onTouchStart = (event: TouchEvent) => {
    if (!canSwipeBack || event.touches.length !== 1) {
      swipe.current.active = false;
      return;
    }
    const touch = event.touches[0];
    swipe.current = { active: touch.clientX <= EDGE_PX, x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!swipe.current.active) return;
    swipe.current.active = false;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipe.current.x;
    const dy = touch.clientY - swipe.current.y;
    // 左端から右へ十分に水平移動したら戻る
    if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) actions.back();
  };

  if (state.status === 'loading') {
    return (
      <main className="app-shell">
        <section className="startup-card">
          <p className="eyebrow">UCHIRECIPE</p>
          <h1>うちレシピ</h1>
          <p className="status">読み込み中</p>
        </section>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="app-shell">
        <section className="startup-card">
          <p className="eyebrow">UCHIRECIPE</p>
          <h1>うちレシピ</h1>
          <p className="status error">{state.error}</p>
        </section>
      </main>
    );
  }

  const manualLists = state.lists.filter((list): list is ManualList => list.type === 'manual');
  const addRecipe = state.recipes.find((recipe) => recipe.id === state.addTargetRecipeId);
  const selectedManualList = state.lists.find((list): list is ManualList => list.id === state.selectedListId && list.type === 'manual') ?? null;
  const showNav = state.screen === 'home' || state.screen === 'lists' || state.screen === 'settings';

  return (
    <main className="app-shell">
      <div className="app-frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="app-scroll" data-scroll>
          {state.screen === 'home' && <Home />}
          {state.screen === 'detail' && <RecipeDetail />}
          {state.screen === 'lists' && <Lists />}
          {state.screen === 'listDetail' && <ListDetail />}
          {state.screen === 'smartEdit' && <SmartEdit />}
          {state.screen === 'settings' && <Settings />}
          {state.screen === 'tags' && <TagManager />}
          {state.screen === 'import' && <Import />}
        </div>

        {showNav && <BottomNav active={state.tab} onHome={actions.goHome} onLists={actions.goLists} onSettings={actions.goSettings} />}

        <FabMenu
          open={state.fabMenuOpen}
          onClose={actions.closeFabMenu}
          onBlank={() => void actions.createBlankRecipe()}
          onImport={() => actions.startImport('home')}
        />
        <AddToListSheet
          open={state.addSheetOpen}
          recipeName={addRecipe?.name ?? ''}
          recipeId={state.addTargetRecipeId}
          lists={manualLists}
          onClose={actions.closeAddSheet}
          onToggle={(listId, recipeId) => void actions.toggleInList(listId, recipeId)}
        />
        <RecipePickerSheet
          open={state.pickerOpen}
          list={selectedManualList}
          recipes={state.recipes}
          onClose={actions.closePicker}
          onToggle={(recipeId) => void actions.toggleRecipeInSelectedList(recipeId)}
        />
        <NewListMenu
          open={state.newListOpen}
          onClose={actions.closeNewListMenu}
          onManual={() => void actions.createManualList()}
          onSmart={actions.startCreateSmart}
        />
        <ShortcutHelpSheet open={state.shortcutHelpOpen} onClose={actions.closeShortcutHelp} onPreview={actions.previewShare} />
        <ConfirmSheet
          open={!!state.confirm}
          title={state.confirm?.type === 'list' ? 'リストを削除' : state.confirm?.type === 'tag' ? 'タグを削除' : 'レシピを削除'}
          message={
            state.confirm?.type === 'tag'
              ? `タグ「${state.confirm.name}」を全レシピから外します。`
              : state.confirm
                ? `「${state.confirm.name}」を削除します。元に戻せません。`
                : ''
          }
          confirmLabel="削除する"
          onConfirm={() => void actions.confirmDelete()}
          onClose={actions.cancelConfirm}
        />
        <Toast toast={state.toast} onDismiss={actions.dismissToast} />
      </div>
    </main>
  );
}

export function App() {
  return (
    <AppStoreProvider>
      <AppFrame />
    </AppStoreProvider>
  );
}
