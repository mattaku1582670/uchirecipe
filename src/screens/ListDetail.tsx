import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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
  const [dragging, setDragging] = useState<string | null>(null);

  const manualRecipes = useMemo(() => {
    if (!list || list.type !== 'manual') return [];
    return list.recipeIds.map((id) => state.recipes.find((recipe) => recipe.id === id)).filter((recipe) => !!recipe);
  }, [list, state.recipes]);

  useEffect(() => {
    if (list?.type === 'manual') orderRef.current = list.recipeIds;
  }, [list]);

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

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, recipeId: string) => {
    if (list.type !== 'manual') return;
    dragId.current = recipeId;
    setDragging(recipeId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (list.type !== 'manual' || !dragId.current) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element?.closest<HTMLElement>('[data-recipe-id]')?.dataset.recipeId;
    if (!target || target === dragId.current) return;
    const next = reorderByTarget(orderRef.current, dragId.current, target);
    if (next === orderRef.current) return;
    orderRef.current = next;
    void actions.setManualRecipeOrder(list.id, next);
  };

  const onPointerUp = () => {
    dragId.current = null;
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

        {manualRecipes.length > 0 ? (
          <div className="recipe-list drag-list">
            {manualRecipes.map((recipe) => (
              <div
                className={`drag-card ${dragging === recipe!.id ? 'is-dragging' : ''}`}
                key={recipe!.id}
                data-recipe-id={recipe!.id}
              >
                <button
                  className="drag-handle"
                  type="button"
                  aria-label="並べ替え"
                  onPointerDown={(event) => onPointerDown(event, recipe!.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
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
    </section>
  );
}
