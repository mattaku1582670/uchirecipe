import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/AppStore';
import { formatDateTime } from '../utils/app';

export function Settings() {
  const { state, actions, tags } = useAppStore();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (estimate.usage != null) setUsage(`${(estimate.usage / 1024 / 1024).toFixed(1)} MB`);
      })
      .catch(() => {});
  }, [state.recipes.length, state.imageCount]);

  return (
    <section className="screen settings-screen">
      <header className="screen-header">
        <div>
          <h1>設定</h1>
          <p>端末内に保存されています</p>
        </div>
      </header>

      <div className="settings-body" data-scroll>
        <section className="settings-block">
          <h2>バックアップ</h2>
          <div className="settings-row">
            <span>最終バックアップ</span>
            <strong>{formatDateTime(state.lastBackupAt)}</strong>
          </div>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => void actions.exportBackup()}>
              書き出し
            </button>
            <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}>
              復元
            </button>
          </div>
          <input
            ref={importInputRef}
            className="sr-only"
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void actions.importBackup(file);
              event.currentTarget.value = '';
            }}
          />
        </section>

        <section className="settings-block">
          <h2>データ件数</h2>
          <div className="stats-grid">
            <div>
              <strong>{state.recipes.length}</strong>
              <span>レシピ</span>
            </div>
            <div>
              <strong>{state.lists.length}</strong>
              <span>リスト</span>
            </div>
            <div>
              <strong>{tags.length}</strong>
              <span>タグ</span>
            </div>
            <div>
              <strong>{state.imageCount}</strong>
              <span>ローカル画像</span>
            </div>
          </div>
        </section>

        <section className="settings-block">
          <h2>ストレージ</h2>
          <div className="settings-row">
            <span>永続化</span>
            <strong>{state.storagePersisted == null ? '確認中…' : state.storagePersisted ? '有効' : '未確定'}</strong>
          </div>
          {usage && (
            <div className="settings-row">
              <span>使用量</span>
              <strong>{usage}</strong>
            </div>
          )}
          <p className="empty-mini" style={{ marginTop: 10 }}>
            データはこの端末内のみに保存されます。ホーム画面に追加すると消えにくくなります。定期的にバックアップを。
          </p>
        </section>

        <section className="settings-block">
          <h2>タグ</h2>
          <button className="choice-row" type="button" onClick={actions.openTagManager}>
            <span className="choice-icon choice-icon--solid" />
            <span>
              <strong>タグの管理</strong>
              <small>名前の変更・統合・削除（全レシピに反映）</small>
            </span>
          </button>
        </section>

        <section className="settings-block">
          <h2>取り込み</h2>
          <button className="choice-row" type="button" onClick={actions.openShortcutHelp}>
            <span className="choice-icon choice-icon--solid" />
            <span>
              <strong>取り込みショートカット手順</strong>
              <small>共有シートからreviewへ直接入る設定</small>
            </span>
          </button>
        </section>
      </div>
    </section>
  );
}
