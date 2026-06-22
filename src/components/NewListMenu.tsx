type Props = {
  open: boolean;
  onClose: () => void;
  onManual: () => void;
  onSmart: () => void;
};

export function NewListMenu({ open, onClose, onManual, onSmart }: Props) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet" aria-label="新規リスト作成" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>新しいリスト</h2>
        <button className="choice-row" type="button" onClick={onManual}>
          <span className="choice-icon choice-icon--solid" />
          <span>
            <strong>手動リスト</strong>
            <small>好きなレシピを並べて保存</small>
          </span>
        </button>
        <button className="choice-row" type="button" onClick={onSmart}>
          <span className="choice-icon choice-icon--dashed" />
          <span>
            <strong>スマートリスト</strong>
            <small>タグや評価で自動抽出</small>
          </span>
        </button>
      </section>
    </div>
  );
}
