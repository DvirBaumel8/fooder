import { useEffect } from "react";

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 4000;

export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="toast ledger-toast" role="status" aria-live="polite">
      <p className="toast-message">{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="toast-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      <button type="button" className="toast-dismiss" aria-label="סגירת ההתראה" onClick={onDismiss}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
