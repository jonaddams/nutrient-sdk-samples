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
            {/* The scan marker is INSIDE .doc-chip-name, not a sibling of it.
                That is the whole trick. The badge this replaces was a flex
                sibling, so in the 208px rail column it stole width from labels
                that already have to wrap — which is why #43 dropped it. As part
                of the name's text flow it wraps alongside the label instead of
                competing with it for width.

                Four of the ten documents have no text layer (verified against
                the files 2026-08-06, not merely trusted from the manifest), and
                before this only one of them said so — via a label that named the
                property rather than the document. `hasTextLayer` finally has a
                UI consumer. */}
            <span className="doc-chip-name">
              {d.label}
              {/* The space is load-bearing: margin-left is visual only, so
                  without it the button's accessible name concatenates to
                  "Lumenscan". Screen readers get "Lumen scan" instead. */}
              {!d.hasTextLayer && " "}
              {!d.hasTextLayer && (
                <span
                  className="doc-chip-scan"
                  title="No text layer — extraction reads the page image"
                >
                  scan
                </span>
              )}
            </span>
          </button>
        ))
      )}
    </nav>
  );
}
