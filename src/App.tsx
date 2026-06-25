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
import { useRef, useState, type TouchEvent } from 'react';
import { AppStoreProvider, useAppStore, type Screen } from './store/AppStore';
import type { ManualList } from './types';

const BACKABLE_SCREENS = ['detail', 'listDetail', 'smartEdit', 'import', 'tags'];
const EDGE_PX = 32;
// 戻る方向のパララックス量（前の画面が後ろからついてくる距離の割合）
const PARALLAX = 0.25;
// スワイプを「戻る」として確定する移動量の割合
const COMMIT_RATIO = 0.35;
const SETTLE_MS = 220;

function AppFrame() {
  const { state, actions } = useAppStore();
  const frameRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backInnerRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ active: boolean; x: number; y: number; dragging: boolean }>({
    active: false,
    x: 0,
    y: 0,
    dragging: false,
  });
  // レシピ詳細でのインタラクティブな「戻る」中だけ前の画面を背面に描画する
  const [swiping, setSwiping] = useState(false);

  const overlayOpen =
    state.fabMenuOpen ||
    state.addSheetOpen ||
    state.pickerOpen ||
    state.newListOpen ||
    state.shortcutHelpOpen ||
    !!state.confirm;
  const canSwipeBack = BACKABLE_SCREENS.includes(state.screen) && !overlayOpen;

  const frameWidth = () => frameRef.current?.clientWidth || window.innerWidth;

  // 指の水平移動量(dx)に応じて前面の画面と背面の前画面を動かす
  const applyDrag = (dx: number) => {
    const w = frameWidth();
    const x = Math.max(0, Math.min(dx, w));
    if (frontRef.current) frontRef.current.style.transform = `translateX(${x}px)`;
    if (backInnerRef.current) backInnerRef.current.style.transform = `translateX(${-(w - x) * PARALLAX}px)`;
    if (dimRef.current) dimRef.current.style.opacity = `${0.35 * (1 - x / w)}`;
  };

  const clearDragStyles = () => {
    for (const el of [frontRef.current, backInnerRef.current, dimRef.current]) {
      if (!el) continue;
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    if (!canSwipeBack || event.touches.length !== 1) {
      swipe.current.active = false;
      return;
    }
    const touch = event.touches[0];
    swipe.current = { active: touch.clientX <= EDGE_PX, x: touch.clientX, y: touch.clientY, dragging: false };
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!swipe.current.active || state.screen !== 'detail') return;
    const touch = event.touches[0];
    const dx = touch.clientX - swipe.current.x;
    const dy = touch.clientY - swipe.current.y;
    if (!swipe.current.dragging) {
      // 水平方向に動き始めたらドラッグ開始、縦スクロールが優勢なら中断
      if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        swipe.current.dragging = true;
        setSwiping(true);
      } else if (Math.abs(dy) > 10) {
        swipe.current.active = false;
        return;
      } else {
        return;
      }
    }
    applyDrag(dx);
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!swipe.current.active) return;
    swipe.current.active = false;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipe.current.x;
    const dy = touch.clientY - swipe.current.y;

    // レシピ詳細：ドラッグ追従からコミット/キャンセルへスムーズに繋ぐ
    if (state.screen === 'detail' && swipe.current.dragging) {
      swipe.current.dragging = false;
      const w = frameWidth();
      const commit = dx > w * COMMIT_RATIO || (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5);
      for (const el of [frontRef.current, backInnerRef.current, dimRef.current]) {
        if (el) el.style.transition = `transform ${SETTLE_MS}ms ease-out, opacity ${SETTLE_MS}ms ease-out`;
      }
      if (commit) {
        if (frontRef.current) frontRef.current.style.transform = `translateX(${w}px)`;
        if (backInnerRef.current) backInnerRef.current.style.transform = 'translateX(0)';
        if (dimRef.current) dimRef.current.style.opacity = '0';
        window.setTimeout(() => {
          actions.back();
          setSwiping(false);
          clearDragStyles();
        }, SETTLE_MS);
      } else {
        if (frontRef.current) frontRef.current.style.transform = 'translateX(0)';
        if (backInnerRef.current) backInnerRef.current.style.transform = `translateX(${-w * PARALLAX}px)`;
        if (dimRef.current) dimRef.current.style.opacity = '0';
        window.setTimeout(() => {
          setSwiping(false);
          clearDragStyles();
        }, SETTLE_MS);
      }
      return;
    }

    // その他の戻れる画面：従来どおり離した時にしきい値で判定
    if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) actions.back();
  };

  const renderScreen = (screen: Screen) => {
    switch (screen) {
      case 'home':
        return <Home />;
      case 'detail':
        return <RecipeDetail />;
      case 'lists':
        return <Lists />;
      case 'listDetail':
        return <ListDetail />;
      case 'smartEdit':
        return <SmartEdit />;
      case 'settings':
        return <Settings />;
      case 'tags':
        return <TagManager />;
      case 'import':
        return <Import />;
      default:
        return null;
    }
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
      <div
        className="app-frame"
        ref={frameRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {swiping && (
          <div className="app-scroll app-scroll--back" aria-hidden="true">
            <div className="app-scroll__inner" ref={backInnerRef}>
              {renderScreen(state.detailReturn)}
            </div>
            <div className="swipe-back-dim" ref={dimRef} />
          </div>
        )}
        <div className={`app-scroll ${swiping ? 'app-scroll--front' : ''}`} ref={frontRef} data-scroll>
          {renderScreen(state.screen)}
        </div>

        {showNav && <BottomNav active={state.tab} onHome={actions.goHome} onLists={actions.goLists} onSettings={actions.goSettings} />}

        <FabMenu
          open={state.fabMenuOpen}
          onClose={actions.closeFabMenu}
          onBlank={() => void actions.createBlankRecipe()}
          onImport={() => actions.startImport('home')}
          onClipboard={() => void actions.importFromClipboard()}
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
