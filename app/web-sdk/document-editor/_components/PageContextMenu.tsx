"use client";

import { useEffect, useRef } from "react";

interface PageContextMenuProps {
  x: number;
  y: number;
  pageIndex: number;
  documentType: "source" | "target";
  onClose: () => void;
  onDelete: () => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  onDuplicate: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
}

export default function PageContextMenu({
  x,
  y,
  pageIndex,
  documentType,
  onClose,
  onDelete,
  onRotateClockwise,
  onRotateCounterClockwise,
  onDuplicate,
  onMoveToTop,
  onMoveToBottom,
}: PageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 shadow-lg rounded-lg overflow-hidden"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: "var(--white)",
        border: "1px solid var(--warm-gray-400)",
        minWidth: "200px",
      }}
    >
      {/* Page Move Operations */}
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--neutral)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Move Pages
        </div>
        <button
          type="button"
          onClick={() => handleAction(onMoveToTop)}
          className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <span>↑</span>
          <span>Move To Top</span>
        </button>
        <button
          type="button"
          onClick={() => handleAction(onMoveToBottom)}
          className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <span>↓</span>
          <span>Move To Bottom</span>
        </button>
      </div>

      <div style={{ height: "1px", backgroundColor: "var(--warm-gray-400)" }} />

      {/* Page Orientation */}
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--neutral)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Page Orientation
        </div>
        <button
          type="button"
          onClick={() => handleAction(onRotateClockwise)}
          className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <span>↻</span>
          <span>Rotate Clockwise</span>
        </button>
        <button
          type="button"
          onClick={() => handleAction(onRotateCounterClockwise)}
          className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <span>↺</span>
          <span>Rotate Counterclockwise</span>
        </button>
      </div>

      <div style={{ height: "1px", backgroundColor: "var(--warm-gray-400)" }} />

      {/* Page Manipulation */}
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--neutral)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Page Manipulation
        </div>
        <button
          type="button"
          onClick={() => handleAction(onDuplicate)}
          className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <span>📋</span>
          <span>Duplicate</span>
        </button>
        <button
          type="button"
          onClick={() => handleAction(onDelete)}
          className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: "var(--code-coral)" }}
        >
          <span>🗑️</span>
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
