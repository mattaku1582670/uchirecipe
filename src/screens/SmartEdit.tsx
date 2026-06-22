import { evalSmart } from '../logic/recipes';
import { useAppStore } from '../store/AppStore';

const NOT_MADE_OPTIONS = [
  { label: 'なし', value: 0 },
  { label: '2週間', value: 14 },
  { label: '1か月', value: 30 },
  { label: '2か月', value: 60 },
  { label: '3か月以上', value: 90 }
];

export function SmartEdit() {
  const { state, actions, tags } = useAppStore();
  const draft = state.smartDraft;

  if (!draft) {
    return (
      <section className="screen">
        <header className="detail-top">
          <button className="icon-button" type="button" onClick={actions.back}>
            ‹
          </button>
        </header>
        <div className="empty-state">
          <h2>条件がありません</h2>
        </div>
      </section>
    );
  }

  const matchCount = evalSmart(state.recipes, {
    tags: draft.tags,
    tagMode: draft.tagMode,
    minRating: draft.minRating,
    notMadeDays: draft.notMadeDays,
    keyword: draft.keyword
  }).length;

  return (
    <section className="screen smart-edit-screen">
      <header className="detail-top detail-top--title">
        <button className="icon-button" type="button" onClick={actions.cancelSmartEdit} aria-label="戻る">
          ‹
        </button>
        <div>
          <h1>条件編集</h1>
          <p>{matchCount}件に合致</p>
        </div>
        <button className="pill-button pill-button--accent" type="button" onClick={() => void actions.saveSmartDraft()}>
          保存
        </button>
      </header>

      <div className="form-stack">
        <label className="form-field">
          <span>リスト名</span>
          <input value={draft.name} onChange={(event) => actions.patchSmartDraft({ name: event.target.value })} placeholder="例: しばらく作っていない定番" />
        </label>

        <section className="form-field">
          <span>タグ</span>
          <div className="chip-scroll chip-scroll--wrap">
            {tags.map((tag) => {
              const active = draft.tags.includes(tag);
              return (
                <button className={`chip ${active ? 'is-active' : ''}`} type="button" key={tag} onClick={() => actions.toggleSmartDraftTag(tag)}>
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="segmented">
            <button className={draft.tagMode === 'all' ? 'is-active' : ''} type="button" onClick={() => actions.patchSmartDraft({ tagMode: 'all' })}>
              すべて含む
            </button>
            <button className={draft.tagMode === 'any' ? 'is-active' : ''} type="button" onClick={() => actions.patchSmartDraft({ tagMode: 'any' })}>
              いずれか含む
            </button>
          </div>
        </section>

        <section className="form-field">
          <span>最低評価</span>
          <div className="rating-row rating-row--compact">
            <button className={draft.minRating === 0 ? 'clear-rating is-active' : 'clear-rating'} type="button" onClick={() => actions.patchSmartDraft({ minRating: 0 })}>
              なし
            </button>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                className={value <= draft.minRating ? 'is-filled' : ''}
                type="button"
                key={value}
                onClick={() => actions.patchSmartDraft({ minRating: value })}
              >
                ★
              </button>
            ))}
          </div>
        </section>

        <section className="form-field">
          <span>最終作成日</span>
          <div className="chip-scroll chip-scroll--wrap">
            {NOT_MADE_OPTIONS.map((option) => (
              <button
                className={`chip ${draft.notMadeDays === option.value ? 'is-active' : ''}`}
                type="button"
                key={option.value}
                onClick={() => actions.patchSmartDraft({ notMadeDays: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <label className="form-field">
          <span>キーワード</span>
          <input value={draft.keyword} onChange={(event) => actions.patchSmartDraft({ keyword: event.target.value })} placeholder="名前・本文から検索" />
        </label>

        <div className="match-card">
          <strong>{matchCount}</strong>
          <span>件に合致します</span>
        </div>
      </div>
    </section>
  );
}
