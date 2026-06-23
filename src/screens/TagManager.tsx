import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/AppStore';

function TagRow({
  tag,
  count,
  onRename,
  onDelete
}: {
  tag: string;
  count: number;
  onRename: (oldName: string, newName: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(tag);
  useEffect(() => setName(tag), [tag]);

  const commit = () => {
    const value = name.trim();
    if (value && value !== tag) onRename(tag, value);
    else setName(tag);
  };

  return (
    <div className="tag-manage-row">
      <span className="tag-manage-hash">#</span>
      <input
        className="tag-manage-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        aria-label={`タグ ${tag}`}
      />
      <span className="tag-manage-count">{count}</span>
      <button className="tag-manage-del" type="button" onClick={onDelete} aria-label={`タグ ${tag} を削除`}>
        ×
      </button>
    </div>
  );
}

export function TagManager() {
  const { state, actions, tags } = useAppStore();

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const recipe of state.recipes) for (const tag of recipe.tags) map[tag] = (map[tag] || 0) + 1;
    return map;
  }, [state.recipes]);

  const sorted = useMemo(
    () => [...tags].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, 'ja')),
    [tags, counts]
  );

  return (
    <section className="screen tags-screen">
      <header className="detail-top detail-top--title">
        <button className="icon-button" type="button" onClick={actions.goSettings} aria-label="戻る">
          ‹
        </button>
        <div>
          <h1>タグの管理</h1>
          <p>{tags.length}種</p>
        </div>
        <span style={{ width: 44 }} />
      </header>

      <p className="empty-mini" style={{ margin: '0 2px 14px' }}>
        名前を変更すると全レシピに反映されます。既存のタグ名に変更すると統合されます。
      </p>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <h2>タグがありません</h2>
          <p>レシピ編集でタグを追加できます</p>
        </div>
      ) : (
        <div className="tag-manage-list">
          {sorted.map((tag) => (
            <TagRow
              key={tag}
              tag={tag}
              count={counts[tag] || 0}
              onRename={(oldName, newName) => void actions.renameTag(oldName, newName)}
              onDelete={() => actions.requestDeleteTag(tag)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
