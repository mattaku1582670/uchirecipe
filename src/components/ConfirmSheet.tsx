type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet confirm-sheet" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>{title}</h2>
        <p className="sheet-sub">{message}</p>
        <div className="action-row">
          <button className="secondary-button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button className="primary-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
