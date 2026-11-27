import { useId, useLayoutEffect, useRef } from "react";

export default function ConfirmationDialog({
  action, pending, disabled, error, onConfirm, onDismiss, fallbackFocusRef,
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const dismissRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const open = Boolean(action);
  const destructive = action?.destructive ?? false;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dismissRef.current.autofocus = destructive;
      confirmRef.current.autofocus = !destructive;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, destructive]);

  function didClose(event) {
    if (event.currentTarget.open) return;
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && (!opener.isConnected || opener.matches(":disabled"))) {
      fallbackFocusRef?.current?.focus({ preventScroll: true });
    }
    if (open) onDismiss();
  }

  return (
    <dialog
      className="doin-confirmation"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { if (pending) event.preventDefault(); }}
      onClose={didClose}
    >
      <h2 id={titleId}>{action?.title}</h2>
      <p id={descriptionId}>{action?.description}</p>

      <form onSubmit={(event) => {
        event.preventDefault();
        if (!pending && !disabled) onConfirm();
      }}>
        <div className="doin-confirmation-actions">
          <button
            type="button"
            className="doin-button doin-button--secondary"
            ref={dismissRef}
            disabled={pending}
            onClick={() => dialogRef.current.close()}
          >
            {action?.dismissLabel}
          </button>
          <button
            type="submit"
            ref={confirmRef}
            className={`doin-button doin-button--${destructive ? "danger" : "primary"}`}
            aria-busy={pending}
            disabled={pending || disabled}
          >
            {pending ? action?.pendingLabel : action?.confirmLabel}
          </button>
        </div>
        {pending && <p className="doin-sr-only" role="status">{action?.pendingLabel}</p>}
        {error && <p className="doin-field-error" role="alert">{error}</p>}
      </form>
    </dialog>
  );
}
