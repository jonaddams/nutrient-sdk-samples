"use client";
import { CATEGORY_ORDER, labelFor } from "../lib/categories";
import type { DocSummary } from "../lib/docs";

/**
 * A select, not a row of tabs. The rail column is 240px (208px usable) and the
 * six category labels need 506px laid out horizontally, so tabs could only fit
 * as an overflow-x strip that hides categories. Collapsing to one control also
 * buys the ~210px of vertical space the document list needs, so the category
 * choice AND the documents are both visible without scrolling — which is the
 * whole reason they live in the rail.
 */
export function CategorySelect({
  docs,
  value,
  onSelect,
}: {
  docs: DocSummary[];
  value: string;
  onSelect: (category: string) => void;
}) {
  const present = new Set(docs.map((d) => d.category));

  // Declared order first, so the list is stable regardless of the order
  // documents arrive in. The active category is kept even when it has no
  // documents, so the current selection cannot vanish under the user.
  const known: string[] = CATEGORY_ORDER.filter(
    (id) => present.has(id) || id === value,
  );

  // A category the code has no preset for still gets an option. A document with
  // no way to reach it is worse than an unlabelled option.
  const unknown = [...present]
    .filter((c) => !CATEGORY_ORDER.includes(c as CategoryOrderMember))
    .sort();

  const shown = [...known, ...unknown];
  if (!shown.length) return null;

  return (
    <div className="category-select">
      {/* A real <label>, not an eyebrow div: it names the control for screen
          readers and makes the visible header a click target. */}
      <label className="eyebrow" htmlFor="studio-category">
        Document type
      </label>
      <select
        id="studio-category"
        value={value}
        onChange={(e) => onSelect(e.target.value)}
      >
        {shown.map((category) => (
          <option key={category} value={category}>
            {labelFor(category)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Narrowing helper for the CATEGORY_ORDER.includes check above. */
type CategoryOrderMember = (typeof CATEGORY_ORDER)[number];
