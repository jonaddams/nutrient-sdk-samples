"use client";
import { CATEGORY_ORDER, labelFor } from "../lib/categories";
import type { DocSummary } from "../lib/docs";

export function CategoryTabs({
  docs,
  value,
  onSelect,
}: {
  docs: DocSummary[];
  value: string;
  onSelect: (category: string) => void;
}) {
  const present = new Set(docs.map((d) => d.category));

  // Declared order first, so the tab row is stable regardless of the order
  // documents arrive in. The active category is kept even when it has no
  // documents, so a tab cannot vanish under the user mid-interaction.
  const known: string[] = CATEGORY_ORDER.filter(
    (id) => present.has(id) || id === value,
  );

  // A category the code has no preset for still gets a tab. A document with no
  // way to reach it is worse than an unlabelled tab.
  const unknown = [...present]
    .filter((c) => !CATEGORY_ORDER.includes(c as CategoryOrderMember))
    .sort();

  const shown = [...known, ...unknown];
  if (!shown.length) return null;

  return (
    // aria-pressed rather than role="tab": this switches a filter, it does not
    // reveal a panel, and it matches the Segmented/DocStrip pattern already used
    // throughout this sample.
    <nav className="category-tabs" aria-label="Document categories">
      {shown.map((category) => (
        <button
          key={category}
          type="button"
          className="category-tab"
          aria-pressed={category === value}
          onClick={() => onSelect(category)}
        >
          {labelFor(category)}
        </button>
      ))}
    </nav>
  );
}

/** Narrowing helper for the CATEGORY_ORDER.includes check above. */
type CategoryOrderMember = (typeof CATEGORY_ORDER)[number];
