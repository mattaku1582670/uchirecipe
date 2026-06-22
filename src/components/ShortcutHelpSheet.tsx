type Props = {
  open: boolean;
  onClose: () => void;
  onPreview: () => void;
};

export function ShortcutHelpSheet({ open, onClose, onPreview }: Props) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet" aria-label="取り込みショートカット手順" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>取り込みショートカット</h2>
        <ol className="steps">
          <li>iOSのショートカットで「共有シートに表示」を有効にします。</li>
          <li>共有されたURL、タイトル、画像、説明を取得します。</li>
          <li>このPWAの `/share?url=&title=&image=&desc=` を開きます。</li>
        </ol>
        <button className="primary-button" type="button" onClick={onPreview}>
          サンプルをプレビュー
        </button>
      </section>
    </div>
  );
}
