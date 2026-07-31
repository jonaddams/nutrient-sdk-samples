"use client";
import { labelFor } from "../lib/categories";
import type { DocSummary } from "../lib/docs";

export function DocStrip({
  docs,
  value,
  category,
  onSelect,
}: {
  docs: DocSummary[];
  value: string;
  /** Only used to name the category in the empty state. */
  category: string;
  onSelect: (docId: string) => void;
}) {
  return (
    <nav className="doc-strip" aria-label="Sample documents">
      {docs.length === 0 ? (
        <p className="muted doc-strip-empty">
          No documents in the {labelFor(category)} category.
        </p>
      ) : (
        docs.map((d) => (
          <button
            key={d.docId}
            type="button"
            className="doc-chip"
            aria-pressed={d.docId === value}
            onClick={() => onSelect(d.docId)}
          >
            {/* The manifest's readable label, not the docId — this gallery is
					    prospect-facing, and "Atlas Construction invoice" reads better
					    than "invoice-ac20251047". docId stays the selection key. */}
            <span className="doc-chip-name">{d.label}</span>
            <span className="tag">{d.hasTextLayer ? "text" : "scanned"}</span>
          </button>
        ))
      )}
    </nav>
  );
}
