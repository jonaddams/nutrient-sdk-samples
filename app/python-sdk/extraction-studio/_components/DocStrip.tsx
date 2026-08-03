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
            {/* No text/scanned badge: this list now lives in the 208px rail
                column, where the badge competed with a label that already has
                to wrap. `hasTextLayer` therefore has no UI consumer — it stays
                in the manifest as documented metadata (docs.test.ts still pins
                it) and is what an OCR-oriented sample would key on. */}
            <span className="doc-chip-name">{d.label}</span>
          </button>
        ))
      )}
    </nav>
  );
}
