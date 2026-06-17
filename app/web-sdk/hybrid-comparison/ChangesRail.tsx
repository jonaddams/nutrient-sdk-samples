"use client";

import type { ChangeEntry } from "./changes";

interface ChangesRailProps {
  changes: ChangeEntry[];
  selectedId: string | null;
  markupCount: number;
  onSelect: (change: ChangeEntry) => void;
}

export function ChangesRail({
  changes,
  selectedId,
  markupCount,
  onSelect,
}: ChangesRailProps) {
  return (
    <div
      style={{
        width: 260,
        borderLeft: "1px solid #e0e0ea",
        overflowY: "auto",
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          color: "#666",
          marginBottom: 8,
        }}
      >
        Text changes ({changes.length})
      </div>
      {changes.length === 0 ? (
        <div style={{ fontSize: 13, color: "#888" }}>
          No text changes on this page.
        </div>
      ) : (
        changes.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => onSelect(c)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 8px",
              marginBottom: 4,
              borderRadius: 4,
              border: "1px solid #e0e0ea",
              background: selectedId === c.id ? "#eef0ff" : "#fff",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: c.type === "insert" ? "#1a8f3c" : "#c0392b",
              }}
            >
              {c.type === "insert" ? "+ INSERTED" : "− DELETED"}
            </span>
            <div
              style={{ fontSize: 13, color: "#222", wordBreak: "break-word" }}
            >
              {c.text}
            </div>
          </button>
        ))
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        Reviewer markup: {markupCount}
      </div>
    </div>
  );
}
