type Props = {
  open: boolean;
  onClose: () => void;
  onBlank: () => void;
  onImport: () => void;
};

export function FabMenu({ open, onClose, onBlank, onImport }: Props) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fab-menu" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onBlank}>
          <span>＋</span>
          空のレシピを作る
        </button>
        <button type="button" onClick={onImport}>
          <span>↗</span>
          URLから取り込む
        </button>
      </div>
    </div>
  );
}
