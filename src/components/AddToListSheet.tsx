import type { ManualList } from '../types';

type Props = {
  open: boolean;
  recipeName: string;
  recipeId: string | null;
  lists: ManualList[];
  onClose: () => void;
  onToggle: (listId: string, recipeId: string) => void;
};

export function AddToListSheet({ open, recipeName, recipeId, lists, onClose, onToggle }: Props) {
  if (!open || !recipeId) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet" aria-label="リストに追加" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>リストに追加</h2>
        <p className="sheet-sub">{recipeName}</p>
        <div className="sheet-list">
          {lists.map((list) => {
            const checked = list.recipeIds.includes(recipeId);
            return (
              <button className="check-row" type="button" key={list.id} onClick={() => onToggle(list.id, recipeId)}>
                <span className={`checkmark ${checked ? 'is-checked' : ''}`}>{checked ? '✓' : ''}</span>
                <span>
                  <strong>{list.name}</strong>
                  <small>{list.recipeIds.length}件</small>
                </span>
              </button>
            );
          })}
          {lists.length === 0 && <p className="empty-mini">手動リストがまだありません</p>}
        </div>
      </section>
    </div>
  );
}
