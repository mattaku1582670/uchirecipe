import { useEffect } from 'react';
import type { ToastState } from '../store/AppStore';

type Props = {
  toast: ToastState;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast]);

  if (!toast) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
