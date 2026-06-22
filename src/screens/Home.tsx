import { useMemo } from 'react';
import { RecipeCard } from '../components/RecipeCard';
import { useAppStore } from '../store/AppStore';

export function Home() {
  const { state, actions, tags } = useAppStore();

  const recipes = useMemo(() => {
    const query = state.search.trim().toLocaleLowerCase();
    const active = state.activeTags;
    const visible = state.recipes.filter((recipe) => {
      if (query) {
        const target = `${recipe.name}\n${recipe.tags.join('\n')}`.toLocaleLowerCase();
        if (!target.includes(query)) return false;
      }
      if (active.length && !active.some((tag) => recipe.tags.includes(tag))) return false;
      return true;
    });

    return [...visible].sort((a, b) => {
      if (state.sort === 'old') return a.lastMade.localeCompare(b.lastMade);
      if (state.sort === 'rated') return b.rating - a.rating || b.added - a.added;
      return b.added - a.added;
    });
  }, [state.activeTags, state.recipes, state.search, state.sort]);

  return (
    <section className="screen home-screen">
      <header className="screen-header">
        <div>
          <h1>うちレシピ</h1>
          <p>{state.recipes.length}品</p>
        </div>
      </header>

      <label className="search-box">
        <span>⌕</span>
        <input
          value={state.search}
          onChange={(event) => actions.setSearch(event.target.value)}
          placeholder="レシピ・タグを検索"
        />
      </label>

      <div className="chip-scroll" data-scroll>
        {tags.map((tag) => {
          const active = state.activeTags.includes(tag);
          return (
            <button className={`chip ${active ? 'is-active' : ''}`} type="button" key={tag} onClick={() => actions.toggleHomeTag(tag)}>
              {tag}
            </button>
          );
        })}
      </div>

      <div className="segmented" aria-label="並び替え">
        <button className={state.sort === 'old' ? 'is-active' : ''} type="button" onClick={() => actions.setSort('old')}>
          古い順
        </button>
        <button className={state.sort === 'rated' ? 'is-active' : ''} type="button" onClick={() => actions.setSort('rated')}>
          高評価順
        </button>
        <button className={state.sort === 'recent' ? 'is-active' : ''} type="button" onClick={() => actions.setSort('recent')}>
          最近追加順
        </button>
      </div>

      <div className="home-list" data-scroll>
        {recipes.length > 0 ? (
          <div className="recipe-list">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onOpen={() => actions.openRecipe(recipe.id, 'home')} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>見つかりませんでした</h2>
            <p>検索語やタグの条件を変えてみてください</p>
          </div>
        )}
      </div>

      <button className="fab" type="button" aria-label="レシピを追加" onClick={actions.openFabMenu}>
        ＋
      </button>
    </section>
  );
}
