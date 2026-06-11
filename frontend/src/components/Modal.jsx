import { useEffect, useState } from "react";

let modalLayerCounter = 0;
let activeTopModalLayer = 0;

export function Modal({
  open,
  title,
  children,
  onConfirm,
  onClose,
  confirmLabel = "Confirmar (Enter)",
  cancelLabel = "Cancelar (Esc)",
  hideCancel = false,
  className = "",
  backdropClassName = "",
  footerActions = null,
  confirmDisabled = false,
  disableBackdropClose = false,
}) {
  const [modalLayer, setModalLayer] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    modalLayerCounter += 1;
    const nextLayer = modalLayerCounter;
    activeTopModalLayer = nextLayer;
    setModalLayer(nextLayer);
    return () => {
      if (activeTopModalLayer === nextLayer) {
        activeTopModalLayer = Math.max(0, nextLayer - 1);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (modalLayer !== activeTopModalLayer) return;

      if (event.key === "Enter") {
        if (onConfirm && !confirmDisabled) {
          onConfirm();
          return;
        }
        onClose?.();
      }

      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onConfirm, confirmDisabled, modalLayer]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const backdropZIndex = 20000 + (modalLayer * 10);

  return (
    <div
      className={`sicfla-modal-backdrop ${backdropClassName}`.trim()}
      style={{ zIndex: backdropZIndex }}
      role="presentation"
      onClick={disableBackdropClose ? undefined : onClose}
    >
      <section
        className={`sicfla-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <div className="sicfla-modal-body">{children}</div>
        <footer className="sicfla-modal-actions">
          {footerActions}
          {hideCancel ? null : (
            <button type="button" className="sicfla-button ghost" onClick={onClose}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className="sicfla-button"
            onClick={onConfirm || onClose}
            disabled={confirmDisabled}
            style={{ minHeight: "44px", touchAction: "manipulation" }}
          >
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
