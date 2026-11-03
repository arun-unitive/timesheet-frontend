import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const UnsavedChangesContext = createContext(null);

/**
 * Guards in-app navigation while a page holds unsaved edits.
 *
 * A page marks itself dirty with `setDirty(true)`, and every navigation entry
 * point (sidebar links, header menu, sign out) runs through `confirm(action)`
 * so the user is warned before the edits are lost.
 */
export function UnsavedChangesProvider({ children }) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(null);

  // Native "leave site?" prompt for refreshes and tab closes.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /** Runs `action` straight away, or asks first when there are unsaved edits. */
  const confirm = useCallback(
    (action) => {
      if (!dirty) {
        action();
        return;
      }
      setPending({ action });
    },
    [dirty]
  );

  const discardAndLeave = useCallback(() => {
    const action = pending?.action;
    setPending(null);
    setDirty(false);
    if (action) action();
  }, [pending]);

  const value = useMemo(() => ({ dirty, setDirty, confirm }), [dirty, confirm]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={discardAndLeave}
        title="Unsaved changes"
        message="You have task updates that have not been saved. If you leave this page now, those changes will be lost."
        confirmLabel="Leave without saving"
        cancelLabel="Stay on page"
        tone="danger"
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  return ctx;
}
