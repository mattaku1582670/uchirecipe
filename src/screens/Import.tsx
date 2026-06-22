import { RecipeImage } from '../components/RecipeImage';
import { useAppStore } from '../store/AppStore';

export function Import() {
  const { state, actions } = useAppStore();
  const draft = state.importDraft;

  return (
    <section className="screen import-screen">
      <header className="detail-top detail-top--title">
        <button className="icon-button" type="button" onClick={actions.cancelImport} aria-label="戻る">
          ‹
        </button>
        <div>
          <h1>取り込み</h1>
          <p>URLからレシピを作成</p>
        </div>
      </header>

      {state.importStage === 'paste' && (
        <div className="import-card">
          <label className="form-field">
            <span>URL</span>
            <textarea
              value={state.pasteValue}
              onChange={(event) => actions.setPasteValue(event.target.value)}
              placeholder="クリップボードからURLを貼り付け"
              rows={4}
            />
          </label>
          <div className="action-row">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                if (!navigator.clipboard?.readText) {
                  actions.showToast('クリップボードから読み取れませんでした。URLを貼り付けてください');
                  return;
                }
                void navigator.clipboard
                  .readText()
                  .then((text) => {
                    const value = text.trim();
                    if (value) actions.setPasteValue(value);
                    else actions.showToast('クリップボードにURLがありません');
                  })
                  .catch(() => actions.showToast('クリップボードから読み取れませんでした。URLを貼り付けてください'));
              }}
            >
              貼り付け
            </button>
          </div>
          <button className="primary-button full-width" type="button" disabled={!state.pasteValue.trim()} onClick={() => void actions.runImport()}>
            取り込む
          </button>
        </div>
      )}

      {state.importStage === 'loading' && (
        <div className="loading-state">
          <span className="spinner" />
          <p>ページを読み込んでいます</p>
          <small>{state.pasteValue}</small>
        </div>
      )}

      {state.importStage === 'review' && draft && (
        <div className="review-stack">
          {draft.fromSite && draft.image && (
            <RecipeImage image={{ type: 'url', src: draft.image }} label={draft.name} className="review-image" badgeLabel="サイトから取得" />
          )}
          <div className="import-note">
            {draft.fromSite
              ? '自動で取り込みました。内容を確認して保存してください。'
              : 'URLを保存しました。名前と内容を入力して保存してください。'}
          </div>
          <label className="form-field">
            <span>名前</span>
            <input value={draft.name} onChange={(event) => actions.patchImportDraft({ name: event.target.value })} />
          </label>
          <label className="form-field">
            <span>URL</span>
            <input value={draft.url} onChange={(event) => actions.patchImportDraft({ url: event.target.value })} />
          </label>
          <label className="form-field">
            <span>説明</span>
            <textarea value={draft.desc} onChange={(event) => actions.patchImportDraft({ desc: event.target.value })} rows={5} />
          </label>
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={actions.redoImport}>
              やり直す
            </button>
            <button className="primary-button" type="button" onClick={() => void actions.saveImport()}>
              保存する
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
