import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { RecipeCard } from '../components/RecipeCard';
import { evalSmart } from '../logic/recipes';
import { reorderByTarget, useAppStore, useSelectedList } from '../store/AppStore';
import type { ManualList, SmartCondition } from '../types';

function conditionSummary(cond: SmartCondition): string {
  const parts: string[] = [];
  if (cond.tags.length) parts.push(`${cond.tagMode === 'all' ? 'すべて' : 'いずれか'}: ${cond.tags.join('・')}`);
  if (cond.minRating > 0) parts.push(`★${cond.minRating}以上`);
  if (cond.notMadeDays > 0) parts.push(`${cond.notMadeDays}日以上未作成`);
  if (cond.keyword.trim()) parts.push(`「${cond.keyword.trim()}」`);
  return parts.join(' / ') || 'すべてのレシピ';
}

export function ListDetail() {
  const { state, actions } = useAppStore();
  const list = useSelectedList();
  const orderRef = useRef<string[]>([]);
  const dragId = useRef<string | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const dragDeltaY = useRef(0);
  const dragOriginTop = useRef(0);
  const dragSlotTop = useRef(0);
  const dragCardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousCardTops = useRef(new Map<string, number>());
  const releaseTimer = useRef<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [settling, setSettling] = useState<string | null>(null);

  const manualRecipes = useMemo(() => {
    if (!list || list.type !== 'manual') return [];
    return list.recipeIds.map((id) => state.recipes.find((recipe) => recipe.id === id)).filter((recipe) => !!recipe);
  }, [list, state.recipes]);
  const manualOrderKey = list?.type === 'manual' ? list.recipeIds.join('\0') : '';

  const measureSlotTop = (node: HTMLElement) => {
    const previousTransform = node.style.transform;
    const previousTransition = node.style.transition;
    node.style.transition = 'none';
    node.style.transform = 'none';
    const top = node.getBoundingClientRect().top;
    node.style.transform = previousTransform;
    node.style.transition = previousTransition;
    return top;
  };

  useEffect(() => {
    if (list?.type === 'manual') orderRef.current = list.recipeIds;
  }, [list]);

  useEffect(() => {
    return () => {
      if (releaseTimer.current != null) window.clearTimeout(releaseTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (list?.type !== 'manual') {
      previousCardTops.current.clear();
      return;
    }

    const activeId = dragging ?? settling ?? dragId.current;
    const previous = previousCardTops.current;
    const next = new Map<string, number>();
    const animations: Array<() => void> = [];

    dragCardRefs.current.forEach((node, id) => {
      const top = node.getBoundingClientRect().top;
      if (id === activeId) {
        const slotTop = measureSlotTop(node);
        dragSlotTop.current = slotTop;
        if (dragging === id && !settling) {
          const offset = dragCurrentY.current - dragStartY.current + dragOriginTop.current - slotTop;
          if (Math.abs(offset - dragDeltaY.current) >= 0.5) {
            dragDeltaY.current = offset;
            setDragOffset(offset);
          }
        }
        next.set(id, previous.get(id) ?? slotTop);
        return;
      }

      next.set(id, top);
      const previousTop = previous.get(id);
      if (previousTop == null) return;

      const delta = previousTop - top;
      if (Math.abs(delta) < 0.5) return;

      node.style.transition = 'none';
      node.style.transform = `translateY(${delta}px)`;
      animations.push(() => {
        const clearTransition = () => {
          node.style.transition = '';
          node.removeEventListener('transitionend', clearTransition);
        };
        node.addEventListener('transitionend', clearTransition, { once: true });
        node.style.transition = 'transform 180ms ease';
        node.style.transform = '';
        window.setTimeout(clearTransition, 220);
      });
    });

    previousCardTops.current = next;

    if (!animations.length) return;
    const frame = window.requestAnimationFrame(() => {
      animations.forEach((animate) => animate());
    });

    return () => window.cancelAnimationFrame(frame);
  }, [dragging, list?.type, manualOrderKey, settling]);

  if (!list) {
    return (
      <section className="screen">
        <header className="detail-top">
          <button className="icon-button" type="button" onClick={actions.back}>
            ‹
          </button>
        </header>
        <div className="empty-state">
          <h2>リストが見つかりません</h2>
        </div>
      </section>
    );
  }

  const setDragCardRef = (recipeId: string) => (node: HTMLDivElement | null) => {
    if (node) {
      dragCardRefs.current.set(recipeId, node);
    } else {
      dragCardRefs.current.delete(recipeId);
    }
  };

  const dragStyle = (recipeId: string): CSSProperties | undefined => {
    if (dragging !== recipeId) return undefined;
    return { '--drag-y': `${dragOffset}px` } as CSSProperties;
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, recipeId: string) => {
    if (list.type !== 'manual') return;
    if (releaseTimer.current != null) {
      window.clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
    event.preventDefault();
    const cardNode = dragCardRefs.current.get(recipeId) ?? event.currentTarget.closest<HTMLElement>('[data-recipe-id]');
    const startTop = cardNode?.getBoundingClientRect().top ?? event.currentTarget.getBoundingClientRect().top;
    if (cardNode) {
      cardNode.style.transition = '';
      cardNode.style.transform = '';
    }
    dragId.current = recipeId;
    dragPointerId.current = event.pointerId;
    dragStartY.current = event.clientY;
    dragCurrentY.current = event.clientY;
    dragDeltaY.current = 0;
    dragOriginTop.current = startTop;
    dragSlotTop.current = startTop;
    setDragOffset(0);
    setSettling(null);
    setDragging(recipeId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (list.type !== 'manual' || !dragId.current || dragPointerId.current !== event.pointerId) return;
    event.preventDefault();
    const activeId = dragId.current;
    dragCurrentY.current = event.clientY;
    const offset = event.clientY - dragStartY.current + dragOriginTop.current - dragSlotTop.current;
    dragDeltaY.current = offset;
    setDragOffset(offset);

    const activeNode = dragCardRefs.current.get(activeId);
    if (activeNode) activeNode.style.pointerEvents = 'none';
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (activeNode) activeNode.style.pointerEvents = '';
    const target = element?.closest<HTMLElement>('[data-recipe-id]')?.dataset.recipeId;
    if (!target || target === activeId) return;
    const next = reorderByTarget(orderRef.current, activeId, target);
    if (next === orderRef.current) return;
    orderRef.current = next;
    void actions.setManualRecipeOrder(list.id, next);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    const activeId = dragId.current;
    dragId.current = null;
    dragPointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!activeId) return;
    setSettling(activeId);
    setDragOffset(dragDeltaY.current);
    window.requestAnimationFrame(() => setDragOffset(0));
    releaseTimer.current = window.setTimeout(() => {
      const node = dragCardRefs.current.get(activeId);
      if (node) previousCardTops.current.set(activeId, node.getBoundingClientRect().top);
      releaseTimer.current = null;
      dragDeltaY.current = 0;
      setSettling(null);
      setDragOffset(0);
      setDragging(null);
    }, 190);
  };

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    dragId.current = null;
    dragPointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragDeltaY.current = 0;
    setSettling(null);
    setDragOffset(0);
    setDragging(null);
  };

  if (list.type === 'manual') {
    const manual = list as ManualList;
    return (
      <section className="screen list-detail-screen">
        <header className="detail-top detail-top--title">
          <button className="icon-button" type="button" onClick={actions.back} aria-label="戻る">
            ‹
          </button>
          <div>
            <input
              className="list-title-input"
              value={manual.name}
              onChange={(event) => void actions.renameList(manual.id, event.target.value)}
              placeholder="リスト名"
              aria-label="リスト名"
            />
            <p>{manual.recipeIds.length}件</p>
          </div>
          <button className="pill-button pill-button--accent" type="button" onClick={actions.openPicker}>
            追加
          </button>
        </header>

        <div className="list-detail-body" data-scroll>
        {manualRecipes.length > 0 ? (
          <div className="recipe-list drag-list">
            {manualRecipes.map((recipe) => (
              <div
                className={`drag-card ${dragging === recipe!.id ? `is-dragging ${settling === recipe!.id ? 'is-settling' : ''}` : ''}`}
                key={recipe!.id}
                data-recipe-id={recipe!.id}
                ref={setDragCardRef(recipe!.id)}
                style={dragStyle(recipe!.id)}
              >
                <button
                  className="drag-handle"
                  type="button"
                  aria-label="並べ替え"
                  onPointerDown={(event) => onPointerDown(event, recipe!.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                >
                  ≡
                </button>
                <span className="drag-card__content">
                  <RecipeCard recipe={recipe!} variant="index" onOpen={() => actions.openRecipe(recipe!.id, 'listDetail')} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>レシピがありません</h2>
            <p>「追加」からレシピを選んでください</p>
          </div>
        )}

        <button
          className="danger-button full-width delete-action"
          type="button"
          onClick={() => actions.requestDeleteList(manual.id)}
        >
          このリストを削除
        </button>
        </div>
      </section>
    );
  }

  const results = evalSmart(state.recipes, list.cond);

  return (
    <section className="screen list-detail-screen">
      <header className="detail-top detail-top--title">
        <button className="icon-button" type="button" onClick={actions.back} aria-label="戻る">
          ‹
        </button>
        <div>
          <input
            className="list-title-input"
            value={list.name}
            onChange={(event) => void actions.renameList(list.id, event.target.value)}
            placeholder="リスト名"
            aria-label="リスト名"
          />
          <p>{results.length}件</p>
        </div>
        <button className="pill-button" type="button" onClick={() => actions.editSmartList(list.id)}>
          条件
        </button>
      </header>

      <div className="list-detail-body" data-scroll>
      <section className="condition-card">
        <span className="auto-badge">自動</span>
        <p>{conditionSummary(list.cond)}</p>
      </section>

      {results.length > 0 ? (
        <div className="recipe-list">
          {results.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} variant="index" onOpen={() => actions.openRecipe(recipe.id, 'listDetail')} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>条件に合うレシピがありません</h2>
          <p>条件を編集してみてください</p>
        </div>
      )}

      <button
        className="danger-button full-width delete-action"
        type="button"
        onClick={() => actions.requestDeleteList(list.id)}
      >
        このリストを削除
      </button>
      </div>
    </section>
  );
}
