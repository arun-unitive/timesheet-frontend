import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * Confirmation dialog for destructive / important actions.
 * Controlled declaratively so pages keep the state next to the action.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`stat__icon ${tone === 'danger' ? 'stat__icon--danger' : 'stat__icon--warning'}`}
          style={{ width: 38, height: 38 }}
        >
          <AlertTriangle size={18} />
        </span>
        <p className="text-secondary" style={{ margin: 0 }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
