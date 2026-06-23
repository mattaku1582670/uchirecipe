import { useState } from 'react';

const DISMISS_KEY = 'uchirecipe:hideInstallHint';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

export function InstallHint() {
  const [hidden, setHidden] = useState(() => {
    try {
      return isStandalone() || localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return isStandalone();
    }
  });

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div className="install-hint">
      <div className="install-hint__body">
        <strong>ホーム画面に追加すると安心</strong>
        <small>データはこの端末内だけに保存されます。追加するとオフラインで使え、消えにくくなります。設定から定期バックアップを。</small>
      </div>
      <button className="install-hint__close" type="button" onClick={dismiss} aria-label="閉じる">
        ×
      </button>
    </div>
  );
}
