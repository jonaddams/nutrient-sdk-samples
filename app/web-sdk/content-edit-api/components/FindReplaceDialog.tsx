"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./FindReplaceDialog.module.css";

interface FindReplaceDialogProps {
  isVisible: boolean;
  findText: string;
  replaceText: string;
  replacementResult: string;
  /** Whether the replacement result represents an error state */
  isError?: boolean;
  isProcessing: boolean;
  onFindTextChange: (text: string) => void;
  onReplaceTextChange: (text: string) => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

/**
 * Find and Replace Dialog Component
 * Provides an interactive UI for finding and replacing text in PDF documents
 *
 * Features:
 * - Auto-focus on find input when dialog opens
 * - Validates find text before allowing replacement
 * - Shows processing state during operations
 * - Displays result messages (success/error)
 * - Keyboard accessible with escape key support
 * - Focus trap to prevent tabbing outside dialog
 * - CSS modules for maintainable styling
 * - WCAG 2.1 compliant
 *
 * @param props - Component props
 * @param props.isVisible - Whether the dialog is visible
 * @param props.findText - Current find text value
 * @param props.replaceText - Current replace text value
 * @param props.replacementResult - Result message to display after operation
 * @param props.isProcessing - Whether a replacement operation is in progress
 * @param props.onFindTextChange - Callback when find text changes
 * @param props.onReplaceTextChange - Callback when replace text changes
 * @param props.onReplaceAll - Callback when Replace All button is clicked
 * @param props.onClose - Callback when dialog should close
 *
 * @example
 * ```tsx
 * <FindReplaceDialog
 *   isVisible={showDialog}
 *   findText={findText}
 *   replaceText={replaceText}
 *   replacementResult={result}
 *   isProcessing={isProcessing}
 *   onFindTextChange={setFindText}
 *   onReplaceTextChange={setReplaceText}
 *   onReplaceAll={handleReplace}
 *   onClose={() => setShowDialog(false)}
 * />
 * ```
 */
export function FindReplaceDialog({
  isVisible,
  findText,
  replaceText,
  replacementResult,
  isError = false,
  isProcessing,
  onFindTextChange,
  onReplaceTextChange,
  onReplaceAll,
  onClose,
}: FindReplaceDialogProps) {
  const findInputId = useId();
  const replaceInputId = useId();
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the find input when the dialog opens
  useEffect(() => {
    if (isVisible && findInputRef.current) {
      findInputRef.current.focus();
    }
  }, [isVisible]);

  // Handle escape key to close dialog
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, onClose]);

  // Focus trap: keep focus within dialog
  useEffect(() => {
    if (!isVisible) return;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      // Get all focusable elements in the dialog
      const focusableElements = [
        findInputRef.current,
        replaceInputRef.current,
        replaceButtonRef.current,
        closeButtonRef.current,
      ].filter((el): el is HTMLInputElement | HTMLButtonElement => el !== null && !el.hasAttribute("disabled"));

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // Shift + Tab: moving backwards
      if (event.shiftKey) {
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab: moving forwards
      else {
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className={styles.dialog}
      role="dialog"
      aria-labelledby="dialog-title"
      aria-modal="true"
    >
      <div className={styles.content}>
        <h3 id="dialog-title" className={styles.title}>
          Find & Replace
        </h3>

        <div className={styles.inputGroup}>
          <label htmlFor={findInputId} className={styles.label}>
            Find:
          </label>
          <input
            id={findInputId}
            ref={findInputRef}
            type="text"
            value={findText}
            onChange={(e) => onFindTextChange(e.target.value)}
            className={styles.input}
            placeholder="Enter text to find"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor={replaceInputId} className={styles.label}>
            Replace with:
          </label>
          <input
            id={replaceInputId}
            ref={replaceInputRef}
            type="text"
            value={replaceText}
            onChange={(e) => onReplaceTextChange(e.target.value)}
            className={styles.input}
            placeholder="Enter replacement text"
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            ref={replaceButtonRef}
            type="button"
            onClick={onReplaceAll}
            disabled={isProcessing || !findText.trim()}
            className={`${styles.button} ${styles.replaceButton}`}
          >
            {isProcessing ? "Processing..." : "Replace All"}
          </button>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`${styles.button} ${styles.closeButton}`}
          >
            Close
          </button>
        </div>

        {replacementResult && (
          <div
            className={`${styles.resultMessage} ${isError ? styles.error : styles.success}`}
            role={isError ? "alert" : "status"}
            aria-live="polite"
          >
            {replacementResult}
          </div>
        )}
      </div>
    </div>
  );
}
