import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };

/** Fixed-position toast stack. Mounted once in the app shell. */
export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span className="toast__icon">
              <Icon size={18} />
            </span>
            <div className="flex-1">
              <div className="toast__title">{t.title}</div>
              {t.message && <div className="toast__msg">{t.message}</div>}
            </div>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
