"use client";

import { useEffect } from "react";
import styles from "./StatsPopup.module.css";

interface StatsPopupProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  /** Auto-dismiss timeout in milliseconds. Set to 0 to disable. Default: 3000 (3 seconds) */
  autoCloseDelay?: number;
}

/**
 * Statistics Popup Component
 * Displays success messages with operation statistics in a centered modal overlay
 *
 * Features:
 * - Centered on screen with overlay effect
 * - Green success color scheme
 * - Checkmark icon for visual feedback
 * - Fade-in animation
 * - Auto-dismiss after configurable delay (default: 3 seconds)
 * - Dismissible with close button
 * - CSS modules for maintainable styling
 * - Accessible with ARIA attributes
 *
 * @param props - Component props
 * @param props.isVisible - Whether the popup is visible
 * @param props.message - Success message to display (e.g., "Replaced 5 instances")
 * @param props.onClose - Callback when close button is clicked
 * @param props.autoCloseDelay - Auto-dismiss timeout in ms (default: 3000). Set to 0 to disable.
 *
 * @example
 * ```tsx
 * <StatsPopup
 *   isVisible={showPopup}
 *   message="Replaced 10 instances"
 *   onClose={() => setShowPopup(false)}
 *   autoCloseDelay={5000}
 * />
 * ```
 */
export function StatsPopup({
  isVisible,
  message,
  onClose,
  autoCloseDelay = 3000,
}: StatsPopupProps) {
  // Auto-dismiss after delay
  useEffect(() => {
    if (!isVisible || autoCloseDelay === 0) {
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [isVisible, autoCloseDelay, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <output
      className={styles.popup}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.header}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className={styles.icon}
          aria-hidden="true"
        >
          <title>Success</title>
          <path
            fill="white"
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
          />
        </svg>
        Success!
      </div>
      <div className={styles.message}>{message}</div>
      <button
        type="button"
        onClick={onClose}
        className={styles.closeButton}
        aria-label="Close success message"
      >
        Close
      </button>
    </output>
  );
}
