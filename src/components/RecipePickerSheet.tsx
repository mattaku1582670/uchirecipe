import type { ManualList, Recipe } from '../types';
import { colorForString, initialOf } from '../utils/app';

type Props = {
  open: boolean;
  list: ManualList | null;
  recipes: Recipe[];
  onClose: () => void;
  onToggle: (recipeId: string) => void;
};

export function RecipePickerSheet({ open, list, recipes, onClose, onToggle }: Props) {
  if (!open || !list) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet picker-sheet" aria-label="レシピを追加" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>レシピを追加</h2>
        <p className="sheet-sub">{list.name}</p>
        <div className="sheet-list">
          {recipes.map((recipe) => {
            const checked = list.recipeIds.includes(recipe.id);
            return (
              <button className="check-row" type="button" key={recipe.id} onClick={() => onToggle(recipe.id)}>
                <span className="picker-thumb" style={{ background: colorForString(recipe.id + recipe.name) }}>
                  {initialOf(recipe.name)}
                </span>
                <span>
                  <strong>{recipe.name}</strong>
                  <small>{recipe.tags.join('・') || 'タグなし'}</small>
                </span>
                <span className={`checkmark ${checked ? 'is-checked' : ''}`}>{checked ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
