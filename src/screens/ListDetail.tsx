import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { RecipeCard } from '../components/RecipeCard';
import { evalSmart } from '../logic/recipes';
import { useAppStore, useSelectedList } from '../store/AppStore';
import type { ManualList, SmartCondition } from '../types';

function conditionSummary(cond: SmartCondition): string {
  const parts: string[] = [];
  if (cond.tags.length) parts.push(`${cond.tagMode === 'all' ? 'すべて' : 'いずれか'}: ${cond.tags.join('・')}`);
  if (cond.minRating > 0) parts.push(`★${cond.minRating}以上`);
  if (cond.notMadeDays > 0) parts.push(`${cond.notMadeDays}日以上未作成`);
  if (cond.keyword.trim()) parts.push(`「${cond.keyword.trim()}」`);
  return parts.join(' / ') || 'すべてのレシピ';
}

type DragSlot = {
  id: string;
  top: number;
  height: number;
  center: number;
};

type DragSession = {
  activeId: string;
  currentIndex: number;
  gap: number;
  latestOffset: number;
  latestOrder: string[];
  listId: string;
  order: string[];
  slotById: Map<string, DragSlot>;
  slots: DragSlot[];
  startIndex: number;
  startY: number;
};

function averageSlotGap(slots: DragSlot[]): number {
  if (slots.length < 2) return 0;
  let total = 0;
  let count = 0;
  for (let index = 0; index < slots.length - 1; index += 1) {
    const gap = slots[index + 1].top - slots[index].top - slots[index].height;
    if (Number.isFinite(gap)) {
      total += Math.max(0, gap);
      count += 1;
    }
  }
  return count ? total / count : 0;
}

function orderWithProjection(order: string[], activeId: string, projectedIndex: number): string[] {
  const withoutActive = order.filter((id) => id !== activeId);
  const next = [...withoutActive];
  next.splice(Math.max(0, Math.min(projectedIndex, next.length)), 0, activeId);
  return next;
}

function projectedIndexForCenter(session: DragSession, centerY: number): number {
  let nextIndex = 0;
  for (const slot of session.slots) {
    if (slot.id !== session.activeId && centerY > slot.center) nextIndex += 1;
  }
  return Math.max(0, Math.min(nextIndex, session.order.length - 1));
}

function projectedTops(session: DragSession, order: string[]): Map<string, number> {
  const tops = new Map<string, number>();
  let top = session.slots[0]?.top ?? 0;
  order.forEach((id, index) => {
    tops.set(id, top);
    top += (session.slotById.get(id)?.height ?? 0) + (index < order.length - 1 ? session.gap : 0);
  });
  return tops;
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function ListDetail() {
  const { state, actions } = useAppStore();
  const list = useSelectedList();
  const dragPointerId = useRef<number | null>(null);
  const dragCardRefs = useRef(new Map<string, HTMLDivElement>());
  const dragSession = useRef<DragSession | null>(null);
  const releaseFrame = useRef<number | null>(null);
  const releaseTimer = useRef<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [, setProjectedIndex] = useState<number | null>(null);

  const manualRecipes = useMemo(() => {
    if (!list || list.type !== 'manual') return [];
    return list.recipeIds.map((id) => state.recipes.find((recipe) => recipe.id === id)).filter((recipe) => !!recipe);
  }, [list, state.recipes]);

  const clearReleaseSchedule = () => {
    if (releaseFrame.current != null) {
      window.cancelAnimationFrame(releaseFrame.current);
      releaseFrame.current = null;
    }
    if (releaseTimer.current != null) {
      window.clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
  };

  const clearDragStyles = () => {
    dragCardRefs.current.forEach((node) => {
      node.style.transform = '';
      node.style.transition = '';
      node.style.removeProperty('--drag-y');
    });
  };

  useEffect(() => {
    return () => {
      clearReleaseSchedule();
      clearDragStyles();
    };
  }, []);

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

  const measureDragSlots = (order: string[]): DragSlot[] | null => {
    const slots: DragSlot[] = [];
    for (const id of order) {
      const node = dragCardRefs.current.get(id);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      slots.push({ id, top: rect.top, height: rect.height, center: rect.top + rect.height / 2 });
    }
    return slots;
  };

  const applyProjectedTransforms = (session: DragSession, projectedIndex: number) => {
    const nextOrder = orderWithProjection(session.order, session.activeId, projectedIndex);
    const tops = projectedTops(session, nextOrder);

    session.latestOrder = nextOrder;
    session.currentIndex = projectedIndex;

    for (const id of session.order) {
      if (id === session.activeId) continue;
      const node = dragCardRefs.current.get(id);
      const slot = session.slotById.get(id);
      const nextTop = tops.get(id);
      if (!node || !slot || nextTop == null) continue;

      const offset = nextTop - slot.top;
      node.style.transition = 'transform 180ms ease';
      node.style.transform = Math.abs(offset) < 0.5 ? '' : `translateY(${offset}px)`;
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, recipeId: string) => {
    if (list.type !== 'manual') return;
    event.preventDefault();

    clearReleaseSchedule();
    clearDragStyles();

    const order = manualRecipes.map((recipe) => recipe!.id);
    const startIndex = order.indexOf(recipeId);
    const slots = measureDragSlots(order);
    if (startIndex < 0 || !slots) return;

    const slotById = new Map(slots.map((slot) => [slot.id, slot]));
    const session: DragSession = {
      activeId: recipeId,
      currentIndex: startIndex,
      gap: averageSlotGap(slots),
      latestOffset: 0,
      latestOrder: order,
      listId: list.id,
      order,
      slotById,
      slots,
      startIndex,
      startY: event.clientY
    };
    dragSession.current = session;
    dragPointerId.current = event.pointerId;

    const activeNode = dragCardRefs.current.get(recipeId);
    if (activeNode) activeNode.style.setProperty('--drag-y', '0px');

    setSettling(null);
    setDragging(recipeId);
    setProjectedIndex(startIndex);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const session = dragSession.current;
    if (!session || dragPointerId.current !== event.pointerId) return;
    event.preventDefault();

    const offset = event.clientY - session.startY;
    session.latestOffset = offset;

    const activeNode = dragCardRefs.current.get(session.activeId);
    if (activeNode) activeNode.style.setProperty('--drag-y', `${offset}px`);

    const activeSlot = session.slotById.get(session.activeId);
    if (!activeSlot) return;

    const nextIndex = projectedIndexForCenter(session, activeSlot.center + offset);
    if (nextIndex === session.currentIndex) return;

    applyProjectedTransforms(session, nextIndex);
    setProjectedIndex(nextIndex);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    const session = dragSession.current;
    dragPointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!session) return;
    event.preventDefault();

    const finalOrder = session.latestOrder;
    const finalTops = projectedTops(session, finalOrder);
    const activeSlot = session.slotById.get(session.activeId);
    const finalTop = finalTops.get(session.activeId) ?? activeSlot?.top ?? 0;
    const settleOffset = activeSlot ? activeSlot.top + session.latestOffset - finalTop : 0;
    const changed = !sameOrder(session.order, finalOrder);

    for (const id of session.order) {
      const node = dragCardRefs.current.get(id);
      if (!node) continue;
      node.style.transition = id === session.activeId ? 'none' : '';
      if (id === session.activeId) {
        node.style.setProperty('--drag-y', `${settleOffset}px`);
      } else {
        node.style.transform = '';
      }
    }

    flushSync(() => {
      setSettling(session.activeId);
      setProjectedIndex(session.currentIndex);
      if (changed) void actions.setManualRecipeOrder(session.listId, finalOrder);
    });

    releaseFrame.current = window.requestAnimationFrame(() => {
      releaseFrame.current = null;
      const node = dragCardRefs.current.get(session.activeId);
      if (node) {
        node.style.transition = '';
        node.style.setProperty('--drag-y', '0px');
      }
    });

    releaseTimer.current = window.setTimeout(() => {
      releaseTimer.current = null;
      clearDragStyles();
      dragSession.current = null;
      flushSync(() => {
        setSettling(null);
        setDragging(null);
        setProjectedIndex(null);
      });
    }, 190);
  };

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    dragPointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearReleaseSchedule();
    clearDragStyles();
    dragSession.current = null;
    setSettling(null);
    setDragging(null);
    setProjectedIndex(null);
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
