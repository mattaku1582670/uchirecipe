import type { Tab } from '../store/AppStore';

type Props = {
  active: Tab;
  onHome: () => void;
  onLists: () => void;
  onSettings: () => void;
};

export function BottomNav({ active, onHome, onLists, onSettings }: Props) {
  return (
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      <button className={active === 'home' ? 'is-active' : ''} type="button" onClick={onHome}>
        <span>⌂</span>
        ホーム
      </button>
      <button className={active === 'lists' ? 'is-active' : ''} type="button" onClick={onLists}>
        <span>☷</span>
        リスト
      </button>
      <button className={active === 'settings' ? 'is-active' : ''} type="button" onClick={onSettings}>
        <span>⚙</span>
        設定
      </button>
    </nav>
  );
}
