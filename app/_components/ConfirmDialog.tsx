"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive action (uses --code-coral). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click cancels the dialog; keyboard equivalent is the Escape handler bound on window above.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="panel floating" style={{ width: "min(420px, 100%)" }}>
        <div className="panel-head">
          <strong>{title}</strong>
          <button
            type="button"
            className="panel-close"
            aria-label="Cancel"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <div className="panel-body">
          <p
            style={{
              margin: 0,
              color: "var(--ink-2)",
              fontSize: "var(--text-sm)",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <button type="button" className="panel-button" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className="panel-button primary"
              onClick={onConfirm}
              style={
                destructive
                  ? {
                      background: "var(--code-coral)",
                      borderColor: "var(--code-coral)",
                      color: "white",
                    }
                  : undefined
              }
              // biome-ignore lint/a11y/noAutofocus: Primary action focus on dialog open is expected for confirm modals.
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
