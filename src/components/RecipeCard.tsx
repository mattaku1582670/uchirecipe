import { fmtRel, stars } from '../logic/recipes';
import type { Recipe } from '../types';
import { colorForString } from '../utils/app';

type Props = {
  recipe: Recipe;
  variant?: 'card' | 'index';
  onOpen: () => void;
};

export function RecipeCard({ recipe, variant = 'card', onOpen }: Props) {
  const star = stars(recipe.rating);
  const color = colorForString(recipe.id + recipe.name);
  const dateLabel = fmtRel(recipe.lastMade);
  const tags = recipe.tags.slice(0, 3);

  if (variant === 'index') {
    return (
      <button className="recipe-card recipe-card--index" type="button" onClick={onOpen}>
        <span className="recipe-card__dot" style={{ background: color }} />
        <span className="recipe-card__main">
          <span className="recipe-card__title">{recipe.name}</span>
          <span className="recipe-card__sub">{recipe.tags.length ? recipe.tags.join('・') : 'タグなし'}</span>
        </span>
        <span className="recipe-card__side">
          <span className="stars" aria-label={`評価 ${recipe.rating}`}>
            <span>{star.filled}</span>
            <span className="stars__off">{star.empty}</span>
          </span>
          <span>{dateLabel}</span>
        </span>
      </button>
    );
  }

  return (
    <button className="recipe-card recipe-card--card" type="button" onClick={onOpen}>
      <span className="recipe-card__bar" style={{ background: color }} />
      <span className="recipe-card__main">
        {tags.length > 0 && (
          <span className="tag-row">
            {tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        )}
        <span className="recipe-card__title">{recipe.name}</span>
        <span className="recipe-card__footer">
          <span className="stars" aria-label={`評価 ${recipe.rating}`}>
            <span>{star.filled}</span>
            <span className="stars__off">{star.empty}</span>
          </span>
          <span>最終作成 {dateLabel}</span>
        </span>
      </span>
    </button>
  );
}
