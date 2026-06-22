import { evalSmart } from '../logic/recipes';
import { useAppStore } from '../store/AppStore';
import { colorForString, initialOf } from '../utils/app';

export function Lists() {
  const { state, actions } = useAppStore();
  const manualLists = state.lists.filter((list) => list.type === 'manual');
  const smartLists = state.lists.filter((list) => list.type === 'smart');

  return (
    <section className="screen lists-screen">
      <header className="screen-header screen-header--row">
        <div>
          <h1>リスト</h1>
          <p>{state.lists.length}件</p>
        </div>
        <button className="pill-button pill-button--accent" type="button" onClick={actions.openNewListMenu}>
          新規
        </button>
      </header>

      <section className="list-section">
        <h2>手動リスト</h2>
        <div className="list-card-stack">
          {manualLists.map((list) => {
            const recipes = list.recipeIds.map((id) => state.recipes.find((recipe) => recipe.id === id)).filter(Boolean);
            return (
              <button className="list-card list-card--manual" type="button" key={list.id} onClick={() => actions.openList(list.id)}>
                <span className="list-card__bar" />
                <span className="list-card__body">
                  <strong>{list.name}</strong>
                  <small>{list.recipeIds.length}件</small>
                </span>
                <span className="thumb-row" aria-hidden="true">
                  {recipes.slice(0, 3).map((recipe) => (
                    <span key={recipe!.id} style={{ background: colorForString(recipe!.id + recipe!.name) }}>
                      {initialOf(recipe!.name)}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
          {manualLists.length === 0 && <p className="empty-mini">手動リストはまだありません</p>}
        </div>
      </section>

      <section className="list-section">
        <h2>スマートリスト</h2>
        <div className="list-card-stack">
          {smartLists.map((list) => (
            <button className="list-card list-card--smart" type="button" key={list.id} onClick={() => actions.openList(list.id)}>
              <span className="auto-badge">自動</span>
              <span className="list-card__body">
                <strong>{list.name}</strong>
                <small>{evalSmart(state.recipes, list.cond).length}件</small>
              </span>
            </button>
          ))}
          {smartLists.length === 0 && <p className="empty-mini">スマートリストはまだありません</p>}
        </div>
      </section>
    </section>
  );
}
