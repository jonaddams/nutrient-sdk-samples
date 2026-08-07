# OCR Region Highlight Colour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Adaptive OCR results panel preset swatches, a colour picker and a hex field — without losing the confidence tint that is the reason it had none.

**Architecture:** A `By confidence | Custom` mode toggle. `IndexedCitation` already carries an optional per-box `hex` that overrides the component-level colour, and `resolveHex` is `citation.hex ?? fallback`, so **Custom mode is OCR omitting that override** and falling through to the studio-wide `citationHex` — the path structured extraction already takes. `useCitationAnnotations.ts` and `lib/citations.ts` need zero changes. The confidence→colour logic moves out of the component into `lib/ocr.ts` so the mode behaviour gets a direct unit test.

**Tech Stack:** Next.js App Router / React / TypeScript / vitest + Testing Library / Biome.

**Design doc:** `docs/specs/2026-08-07-ocr-highlight-color-design.md` — five settled decisions. This plan implements them, it does not reopen them.

## Global Constraints

- **`pnpm` is missing from non-interactive shells' PATH.** Prefix every command with `export PATH="$HOME/Library/pnpm/bin:$PATH"`.
- **A green `pnpm test` is NOT evidence for a type change** — vitest transpiles without typechecking. Run `pnpm exec tsc --noEmit` separately, every time.
- **Baseline entering this plan: 320 tests / 34 files.** The final count is **not simply additive** — one test moves between files and one test file is renamed. Expect **35 files**. Re-measure; never write a predicted number into a doc.
- **No CSS changes.** The `.citation-*` class names stay exactly as they are even though the component is renamed. `styles.css` has a trap — responsive overrides must remain at the END of the file or they silently do nothing — and renaming classes buys nothing a user can see.
- **`fieldIndex` is the index into the FULL `textElements` array**, not into the compacted result. Elements without a citation are dropped, so array position ≠ `fieldIndex`. Getting this wrong makes clicking a region select the wrong table row.
- **`confidenceHex`'s three values MUST match `.match-dot.good/.partial/.bad` in `styles.css`.** They diverged once and the dot beside an element and the box drawn for it were visibly different greens. The comment saying so travels with the code.
- Biome: `pnpm exec biome check <changed paths>` — 0 **new** errors. `lib/ocr.ts` already fails on `main` for import ordering and `OCR_LANGUAGES` array formatting; that is pre-existing debt, verified, and **not yours to fix**. Never run `biome check --write` — it reformats unrelated code.
- **This branch (`ocr-highlight-color`) is cut from `ocr-code-view`.** It must be rebased onto `main` once `#63` merges. Do not merge it before `#63`.

## File Structure

| File | Responsibility |
|---|---|
| `lib/ocr.ts` | **Gains** `OcrColorMode`, `confidenceTone`, `confidenceHex` (moved in), `ocrCitationsFor()` — all pure, all testable without a viewer |
| `lib/__tests__/ocr.test.ts` | Gains tests for the four above |
| `_components/HighlightColor.tsx` | **Renamed from** `CitationColor.tsx`; gains a `label` prop |
| `_components/__tests__/HighlightColor.test.tsx` | **Renamed from** `CitationColor.test.tsx` |
| `_components/StructuredResults.tsx` | Import rename; passes `label="Citation color"` |
| `_components/OcrResults.tsx` | Loses `confidenceTone`/`confidenceHex`; gains 4 props, the mode `Segmented`, and `HighlightColor` |
| `_components/__tests__/OcrResults.test.tsx` | Import update; new tests for the mode control |
| `page.tsx` | `ocrColorMode` state; calls `ocrCitationsFor`; passes 4 props |

---

### Task 1: Move the confidence logic to `lib/ocr.ts` and add `ocrCitationsFor`

Pure refactor plus one new function. **No user-visible behaviour changes in this task** — `page.tsx` calls the new function with the mode hardcoded to `"confidence"`, which is exactly what it does today.

**Files:**
- Modify: `app/python-sdk/extraction-studio/lib/ocr.ts`
- Modify: `app/python-sdk/extraction-studio/_components/OcrResults.tsx:1-32` (delete both functions, import one back)
- Modify: `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx:1-4,57-60` (import moves; the `confidenceTone` test moves out)
- Modify: `app/python-sdk/extraction-studio/page.tsx:11,122-136`
- Test: `app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts` (append)

**Interfaces:**
- Consumes: `IndexedCitation` and `Citation` from `lib/citations.ts` / `lib/api.ts`; `OcrElement` from `lib/ocr.ts` itself.
- Produces: `OcrColorMode = "confidence" | "custom"`; `confidenceTone(n: number): "good" | "partial" | "bad"`; `confidenceHex(n: number): string`; `ocrCitationsFor(elements: OcrElement[], mode: OcrColorMode): IndexedCitation[]`. Tasks 3 and 4 import `OcrColorMode`; Task 3 imports `confidenceTone`; Task 4 calls `ocrCitationsFor`.

- [ ] **Step 1: Confirm the branch**

```bash
cd ~/SE/code/nutrient-sdk-samples
git branch --show-current   # must print: ocr-highlight-color
```

If it prints anything else, stop and report — this branch is cut from `ocr-code-view` on purpose.

- [ ] **Step 2: Write the failing tests**

Append to `app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts`. Add `confidenceHex`, `confidenceTone` and `ocrCitationsFor` to whatever the file already imports from `../ocr`:

```ts
const ELEMENT = {
  readingOrder: 0,
  type: "paragraph",
  text: "Invoice",
  confidence: 0.95,
  page: 0,
  citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
};

test("confidenceTone bands a score into three tones", () => {
  expect(confidenceTone(0.95)).toBe("good");
  expect(confidenceTone(0.6)).toBe("partial");
  expect(confidenceTone(0.2)).toBe("bad");
});

test("confidenceHex returns the exact .match-dot values", () => {
  // Asserted as literals on purpose. These MUST equal
  // .match-dot.good/.partial/.bad in styles.css — they diverged once, and the
  // dot beside an element and the box drawn for that same element were
  // visibly different greens. A test that recomputed them would not have
  // caught that.
  expect(confidenceHex(0.95)).toBe("#4a9d6a");
  expect(confidenceHex(0.6)).toBe("#c9a227");
  expect(confidenceHex(0.2)).toBe("#c8553c");
});

test("confidence mode gives every region its own tint", () => {
  const out = ocrCitationsFor(
    [ELEMENT, { ...ELEMENT, readingOrder: 1, confidence: 0.2 }],
    "confidence",
  );
  expect(out.map((c) => c.hex)).toEqual(["#4a9d6a", "#c8553c"]);
});

test("custom mode omits hex entirely, rather than setting it undefined", () => {
  // resolveHex is `citation.hex ?? fallback`, so an explicit `hex: undefined`
  // would still fall back correctly today — but asserting absence pins the
  // shape the design relies on and survives a future `??` becoming `||` or a
  // spread that treats the key as present.
  const out = ocrCitationsFor([ELEMENT], "custom");
  expect(out).toHaveLength(1);
  expect("hex" in out[0]).toBe(false);
});

test("elements without a citation drop out, in both modes", () => {
  const withNone = { ...ELEMENT, readingOrder: 1, citation: null };
  expect(ocrCitationsFor([ELEMENT, withNone], "confidence")).toHaveLength(1);
  expect(ocrCitationsFor([ELEMENT, withNone], "custom")).toHaveLength(1);
});

test("fieldIndex is the position in the FULL element list, not the compacted one", () => {
  // The trap: the returned array is COMPACTED (uncited elements are dropped),
  // so array position is not fieldIndex. fieldIndex has to keep pointing at
  // the original textElements row, or clicking a region in the document
  // selects the wrong row in the table.
  const out = ocrCitationsFor(
    [
      { ...ELEMENT, citation: null },
      { ...ELEMENT, readingOrder: 1 },
    ],
    "confidence",
  );
  expect(out).toHaveLength(1);
  expect(out[0].fieldIndex).toBe(1);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test lib/__tests__/ocr.test.ts
```

Expected: failures — `confidenceTone is not a function` / `ocrCitationsFor is not a function` (or an import error naming them).

- [ ] **Step 4: Add the functions to `lib/ocr.ts`**

At the top of `lib/ocr.ts`, add to the existing imports:

```ts
import type { IndexedCitation } from "./citations";
```

(`lib/citations.ts` does not import `lib/ocr.ts`, so this introduces no cycle.)

Then add, below the `OcrElement` type so it can refer to it:

```ts
/** Which colour the OCR overlay paints its region boxes. */
export type OcrColorMode = "confidence" | "custom";

/** Bands a confidence score into the three tones `.match-dot` already styles.
 *
 *  A sibling of matchDotTone() in StructuredResults, NOT a reuse of it: that one
 *  keys on match strings ("exact", "not_found") while this takes a float.
 *  Conflating the two would mean one function with two unrelated input types. */
export function confidenceTone(n: number): "good" | "partial" | "bad" {
  if (n >= 0.85) return "good";
  if (n >= 0.5) return "partial";
  return "bad";
}

/** Fill colour for a region box, so the overlay shows WHERE OCR was unsure.
 *
 *  Values MUST match `.match-dot.good/.partial/.bad` in styles.css — that is
 *  the source of truth for these three tones. They used to diverge (this
 *  function had its own brighter #22c55e/#eab308/#ef4444), so the dot next to
 *  an element and the box drawn for that same element were visibly different
 *  greens. */
export function confidenceHex(n: number): string {
  const tone = confidenceTone(n);
  if (tone === "good") return "#4a9d6a";
  if (tone === "partial") return "#c9a227";
  return "#c8553c";
}

/** Build the document overlay's boxes for one OCR run.
 *
 *  `fieldIndex` is the index into the FULL element list, not into the array
 *  returned here: uncited elements are dropped, so the result is COMPACTED and
 *  its array position is not the row a click should select.
 *
 *  In `custom` mode each entry omits `hex` ENTIRELY rather than setting it to
 *  undefined, so resolveHex (`citation.hex ?? fallback`) falls through to the
 *  studio-wide picker value — the same path structured extraction takes. */
export function ocrCitationsFor(
  elements: OcrElement[],
  mode: OcrColorMode,
): IndexedCitation[] {
  return elements.flatMap((el, index) =>
    el.citation
      ? [
          {
            fieldIndex: index,
            citation: el.citation,
            ...(mode === "confidence"
              ? { hex: confidenceHex(el.confidence) }
              : {}),
          },
        ]
      : [],
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test lib/__tests__/ocr.test.ts
```

Expected: all pass, including the six new ones.

- [ ] **Step 6: Delete the originals from `OcrResults.tsx` and import instead**

In `_components/OcrResults.tsx`, delete lines 7-32 — both the `confidenceTone` and `confidenceHex` function declarations **and** their doc comments. Then change the import on line 3 from:

```tsx
import type { OcrResult } from "../lib/ocr";
```

to:

```tsx
import { confidenceTone, type OcrResult } from "../lib/ocr";
```

The component's own use of `confidenceTone` in the element table (around line 212) is unchanged.

Note: the old `confidenceHex` comment said "This is why OcrResults has no colour picker: a user-chosen colour would fight the confidence tint." That sentence is deliberately **not** carried over — Task 3 gives the panel a picker, so it would become a comment that contradicts the code.

- [ ] **Step 7: Update the two other importers**

In `_components/__tests__/OcrResults.test.tsx`, line 4 currently reads:

```tsx
import { confidenceTone, OcrResults } from "../OcrResults";
```

Change it to:

```tsx
import { confidenceTone } from "../../lib/ocr";
import { OcrResults } from "../OcrResults";
```

Then **delete** the `confidenceTone bands a score into three tones` test from that file (around lines 57-60) — it now lives in `lib/__tests__/ocr.test.ts`. Once deleted, `confidenceTone` is unused in this file, so drop it from the import too, leaving just:

```tsx
import { OcrResults } from "../OcrResults";
```

In `page.tsx`, line 11 currently reads:

```tsx
import { confidenceHex, OcrResults } from "./_components/OcrResults";
```

Change it to:

```tsx
import { OcrResults } from "./_components/OcrResults";
```

and add `ocrCitationsFor` to the existing `lib/ocr` import on line 25:

```tsx
import {
  extractOcr,
  ocrCitationsFor,
  type OcrRequest,
  type OcrResult,
} from "./lib/ocr";
```

- [ ] **Step 8: Rewrite the `ocrCitations` memo in `page.tsx`**

Replace the whole memo (lines ~118-136, including the comment block above it) with:

```tsx
  // Mode is hardcoded here and wired to state in a later task — this call is
  // byte-for-byte what the inline version produced.
  const ocrCitations = useMemo(
    () => ocrCitationsFor(ocrResult?.textElements ?? [], "confidence"),
    [ocrResult],
  );
```

- [ ] **Step 9: Run the full suite, typecheck and lint**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test
pnpm exec tsc --noEmit
pnpm exec biome check app/python-sdk/extraction-studio/lib/ocr.ts \
  app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts \
  app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx \
  app/python-sdk/extraction-studio/page.tsx
```

Expected: **325 tests across 34 files** (320 baseline, minus the 1 moved test, plus the 6 new ones). `tsc` silent. Biome: 0 new errors — `lib/ocr.ts`'s 2 pre-existing findings still report and are not yours.

- [ ] **Step 10: Commit**

```bash
git add app/python-sdk/extraction-studio/lib/ocr.ts \
  app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts \
  app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx \
  app/python-sdk/extraction-studio/page.tsx
git commit -m "$(cat <<'EOF'
refactor(extraction-studio): move the OCR confidence colours into lib/ocr.ts

confidenceTone and confidenceHex move together — confidenceHex calls
confidenceTone and both are pinned by comment to the .match-dot values in
styles.css, which they diverged from once already. page.tsx importing a colour
function from a component file was backwards; that goes away too.

Adds ocrCitationsFor(elements, mode), so the overlay's colour behaviour is a
pure function with a direct unit test instead of an inline memo reachable only
through a mocked viewer. Mode is hardcoded to "confidence" here: no behaviour
change in this commit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Rename `CitationColor` to `HighlightColor` with a `label` prop

**Files:**
- Rename: `app/python-sdk/extraction-studio/_components/CitationColor.tsx` → `HighlightColor.tsx`
- Rename: `app/python-sdk/extraction-studio/_components/__tests__/CitationColor.test.tsx` → `HighlightColor.test.tsx`
- Modify: `app/python-sdk/extraction-studio/_components/StructuredResults.tsx:4,95`

**Interfaces:**
- Consumes: `CITATION_PRESETS`, `hexToRgb`, `rgbToHex` from `lib/citations.ts` (unchanged).
- Produces: `HighlightColor({ label, value, onChange })` where `label: string` is required. Task 3 renders it with `label="Region color"`.

**The aria-labels must derive from `label`**, and for Structured they must come out **byte-identical to today's strings**, because the existing tests assert them:
- `Pick a custom ${label.toLowerCase()}` → `"Pick a custom citation color"` ✓
- `${label} hex value` → `"Citation color hex value"` ✓

- [ ] **Step 1: Write the failing test**

Append to `_components/__tests__/CitationColor.test.tsx` (you rename the file in Step 3):

```tsx
test("the label names the control and reaches both aria-labels", () => {
  // One component, two panels: structured calls these citations, OCR calls
  // them regions. A screen reader must hear the right noun in each.
  render(
    <HighlightColor label="Region color" value={AMBER} onChange={() => {}} />,
  );
  expect(screen.getByText("Region color")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Pick a custom region color"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Region color hex value")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test CitationColor
```

Expected: FAIL — `HighlightColor is not defined`.

- [ ] **Step 3: Rename both files with git**

```bash
cd ~/SE/code/nutrient-sdk-samples/app/python-sdk/extraction-studio/_components
git mv CitationColor.tsx HighlightColor.tsx
git mv __tests__/CitationColor.test.tsx __tests__/HighlightColor.test.tsx
```

Use `git mv`, not create-and-delete, so the history follows the file.

- [ ] **Step 4: Rename the component and thread the label**

In `HighlightColor.tsx`, make exactly these four changes.

The doc comment and signature:

```tsx
/**
 * Preset swatches plus a free color choice for a highlight layer.
 *
 * Shared by both results panels: structured extraction calls these citations,
 * OCR calls them regions, so the noun arrives as `label` rather than being
 * hardcoded — including in the aria-labels, which is the whole reason it is a
 * prop and not just a heading.
 *
 * The committed value is always a valid 6-digit hex, so the annotation layer
 * never has to defend against half-typed input. The text field keeps its own
 * draft state for exactly that reason: while someone types "#ff", that string is
 * unparseable and must not be pushed to the canvas.
 */
export function HighlightColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
```

The visible label — replace the hardcoded `Citation color`:

```tsx
      <span className="eyebrow">{label}</span>
```

The picker's aria-label:

```tsx
            aria-label={`Pick a custom ${label.toLowerCase()}`}
```

The hex field's aria-label:

```tsx
          aria-label={`${label} hex value`}
```

Leave everything else untouched — the `.citation-color` / `.citation-swatches` / `.citation-picker` / `.citation-dot` / `.citation-hex` class names all stay, and so does `placeholder="#ffc107"`.

- [ ] **Step 5: Update the test file's imports and calls**

In `__tests__/HighlightColor.test.tsx`, change line 4 to:

```tsx
import { HighlightColor } from "../HighlightColor";
```

Then replace every `<CitationColor ... />` with `<HighlightColor label="Citation color" ... />`. There are twelve render/rerender call sites. Passing `"Citation color"` keeps every existing aria-label assertion passing unchanged — that is the point of the byte-identical derivation above.

- [ ] **Step 6: Update `StructuredResults.tsx`**

Line 4:

```tsx
import { HighlightColor } from "./HighlightColor";
```

And the render site (around line 95):

```tsx
      {showCitations && (
        <HighlightColor
          label="Citation color"
          value={citationHex}
          onChange={onCitationHexChange}
        />
      )}
```

- [ ] **Step 7: Run the tests, typecheck and lint**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test
pnpm exec tsc --noEmit
pnpm exec biome check app/python-sdk/extraction-studio/_components/HighlightColor.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/HighlightColor.test.tsx \
  app/python-sdk/extraction-studio/_components/StructuredResults.tsx
```

Expected: **326 tests across 34 files** (325 + 1 new). `tsc` silent, biome 0 new errors. If `tsc` reports an unresolved `./CitationColor`, an importer was missed — grep for it.

- [ ] **Step 8: Commit**

```bash
cd ~/SE/code/nutrient-sdk-samples
git add -A app/python-sdk/extraction-studio/_components
git commit -m "$(cat <<'EOF'
refactor(extraction-studio): CitationColor becomes HighlightColor

Both results panels need the same swatches-picker-hex control, but structured
extraction calls them citations and OCR calls them regions. The noun is now a
prop, and the aria-labels derive from it, so a screen reader hears the right
word in each panel rather than "citation" in both.

Class names are untouched. Renaming .citation-* would buy nothing visible and
styles.css has a source-order trap that makes churn there expensive.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The mode control and colour picker in `OcrResults`

**Files:**
- Modify: `app/python-sdk/extraction-studio/_components/OcrResults.tsx`
- Test: `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`

**Interfaces:**
- Consumes: `HighlightColor({ label, value, onChange })` from Task 2; `OcrColorMode` from Task 1's `lib/ocr.ts`; the existing `Segmented({ options, value, onChange })`.
- Produces: `OcrResults` gains four props — `colorMode: OcrColorMode`, `onColorModeChange: (mode: OcrColorMode) => void`, `citationHex: string`, `onCitationHexChange: (hex: string) => void`. Task 4 supplies all four from `page.tsx`.

The block goes directly under `.results-meta` and **outside** the `empty ? … : …` ternary, gated on `showRegions` — mirroring how `StructuredResults` gates `HighlightColor` on `showCitations`. It renders even on an empty result, because `Show regions` itself already does; splitting the two would make the panel inconsistent with itself.

- [ ] **Step 1: Write the failing tests**

Append to `_components/__tests__/OcrResults.test.tsx`. The shared `props` object at the top of that file needs the four new props too — add them there:

```tsx
const props = {
  result: RESULT,
  activeIndex: null,
  onSelectElement: vi.fn(),
  showRegions: true,
  onShowRegionsChange: vi.fn(),
  colorMode: "confidence" as const,
  onColorModeChange: vi.fn(),
  citationHex: "#ffc107",
  onCitationHexChange: vi.fn(),
};
```

Then the new tests:

```tsx
test("offers the region colour mode when regions are shown", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("Region color")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "By confidence" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("hides the whole colour block when regions are hidden", () => {
  // It cannot do anything when nothing is drawn, and Show regions already
  // gates the overlay — same pairing StructuredResults uses.
  render(<OcrResults {...props} showRegions={false} />);
  expect(screen.queryByText("Region color")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "By confidence" }),
  ).not.toBeInTheDocument();
});

test("shows swatches only in Custom mode", () => {
  const { rerender } = render(<OcrResults {...props} />);
  // Confidence mode: the mode control is there, the swatches are not.
  expect(screen.queryByRole("button", { name: "Amber" })).not.toBeInTheDocument();

  rerender(<OcrResults {...props} colorMode="custom" />);
  expect(screen.getByRole("button", { name: "Amber" })).toBeInTheDocument();
  expect(
    screen.getByLabelText("Region color hex value"),
  ).toBeInTheDocument();
});

test("reports a mode change rather than owning the state", () => {
  // page.tsx owns it: the overlay is built there, so a locally-held mode
  // would show a Custom button that repainted nothing.
  const onColorModeChange = vi.fn();
  render(<OcrResults {...props} onColorModeChange={onColorModeChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  expect(onColorModeChange).toHaveBeenCalledWith("custom");
});

test("passes the hex through to the picker and reports changes", () => {
  const onCitationHexChange = vi.fn();
  render(
    <OcrResults
      {...props}
      colorMode="custom"
      citationHex="#00a3e0"
      onCitationHexChange={onCitationHexChange}
    />,
  );
  expect(screen.getByRole("button", { name: "Cyan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Magenta" }));
  expect(onCitationHexChange).toHaveBeenCalledWith("#d63384");
});

test("the colour block survives an empty result", () => {
  // Show regions is rendered above the No-text-found callout, so the control
  // paired with it must be too — otherwise the panel contradicts itself.
  render(
    <OcrResults
      {...props}
      result={{
        ...RESULT,
        textElements: [],
        statistics: { ...RESULT.statistics, totalElements: 0, textElements: 0 },
      }}
    />,
  );
  expect(screen.getByText(/no text found/i)).toBeInTheDocument();
  expect(screen.getByText("Region color")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test OcrResults
```

Expected: failures — no element with the text `Region color`, no button named `By confidence`.

- [ ] **Step 3: Add the imports and the four props**

In `OcrResults.tsx`, extend the imports:

```tsx
import { confidenceTone, type OcrColorMode, type OcrResult } from "../lib/ocr";
import { HighlightColor } from "./HighlightColor";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";
```

And the signature:

```tsx
export function OcrResults({
  result,
  activeIndex,
  onSelectElement,
  showRegions,
  onShowRegionsChange,
  colorMode,
  onColorModeChange,
  citationHex,
  onCitationHexChange,
}: {
  result: OcrResult;
  activeIndex: number | null;
  onSelectElement: (index: number) => void;
  showRegions: boolean;
  onShowRegionsChange: (value: boolean) => void;
  colorMode: OcrColorMode;
  onColorModeChange: (mode: OcrColorMode) => void;
  citationHex: string;
  onCitationHexChange: (hex: string) => void;
}) {
```

- [ ] **Step 4: Render the block under `.results-meta`**

Immediately after the closing `</div>` of `<div className="results-meta">` and **before** the `{empty ? (` line, insert:

```tsx
      {/* Paired with Show regions, exactly as StructuredResults pairs
          HighlightColor with Show citations: a colour control is meaningless
          when nothing is drawn.

          By confidence is the default and stays so. The tint is what makes the
          overlay say WHERE OCR was unsure, which is the reason this panel had
          no picker at all until now — Custom trades that signal away
          deliberately, and only on request. The element table's confidence
          dots are unaffected in either mode, so the signal never leaves the
          panel entirely. */}
      {showRegions && (
        <div className="citation-color">
          <span className="eyebrow">Region color</span>
          <Segmented
            options={[
              { label: "By confidence", value: "confidence" },
              { label: "Custom", value: "custom" },
            ]}
            value={colorMode}
            onChange={(v) => onColorModeChange(v as OcrColorMode)}
          />
          {colorMode === "custom" && (
            <HighlightColor
              label="Region color"
              value={citationHex}
              onChange={onCitationHexChange}
            />
          )}
        </div>
      )}
```

**The duplicate-label problem, and why `hideLabel` exists.** `HighlightColor` renders its own `<span className="eyebrow">{label}</span>`. Dropped into the block above as-is, "Region color" would appear twice in Custom mode. Removing the outer `<span>` instead is not the answer either — the label would then vanish in confidence mode, where no `HighlightColor` is rendered.

So the outer `<span>` stays and owns the heading in both modes, and `HighlightColor` gains a `hideLabel?: boolean` that suppresses **only** its visible label. The aria-labels still derive from `label`, so screen readers lose nothing.

**Amendment, post-merge:** the prop that actually shipped is `embedded`, not `hideLabel`, and it
suppresses more than the label — see `docs/specs/2026-08-07-ocr-highlight-color-design.md`'s
Interfaces section for what it does and why (double `.citation-color` padding, fixed in
`5cfbe02`). The steps below are left as written for the historical record of how the plan was
executed; do not copy the `hideLabel` name or signature from here.

Add the prop to `HighlightColor.tsx`:

```tsx
export function HighlightColor({
  label,
  hideLabel,
  value,
  onChange,
}: {
  label: string;
  /** Suppress the visible label when the parent already renders one. The
   *  aria-labels still derive from `label`, so nothing is lost to a screen
   *  reader — this only avoids printing the same words twice. */
  hideLabel?: boolean;
  value: string;
  onChange: (hex: string) => void;
}) {
```

and:

```tsx
      {!hideLabel && <span className="eyebrow">{label}</span>}
```

Then use `hideLabel` at the OCR call site in the block above:

```tsx
            <HighlightColor
              label="Region color"
              hideLabel
              value={citationHex}
              onChange={onCitationHexChange}
            />
```

`StructuredResults` does not pass `hideLabel`, so its visible label is unchanged.

**One more note on this block:** `Segmented`'s `onChange` is typed `(value: string) => void`, so the `as OcrColorMode` cast is load-bearing. It is safe because the two option values are the only members of the union, and the test asserting `onColorModeChange` receives `"custom"` pins it.

- [ ] **Step 5: Add the `hideLabel` test to Task 2's file**

Append to `_components/__tests__/HighlightColor.test.tsx`:

```tsx
test("hideLabel drops the visible label but keeps the aria-labels", () => {
  render(
    <HighlightColor
      label="Region color"
      hideLabel
      value={AMBER}
      onChange={() => {}}
    />,
  );
  expect(screen.queryByText("Region color")).not.toBeInTheDocument();
  expect(
    screen.getByLabelText("Pick a custom region color"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Region color hex value")).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the tests, typecheck and lint**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test
pnpm exec tsc --noEmit
pnpm exec biome check app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/HighlightColor.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/HighlightColor.test.tsx
```

Expected: **333 tests across 34 files** (326 + 6 + 1). `tsc` silent, biome 0 new errors.

`page.tsx` does not yet pass the four props, so `tsc` **will** fail here with "Property 'colorMode' is missing".

**Tasks 3 and 4 were merged into one task before execution** (Jon, 2026-08-07), precisely so this never happens: a task that ends with a red build is not independently reviewable, and telling a reviewer to expect it would be pre-judging a legitimate finding. Do Task 4's steps in the same task, and treat the `tsc` gate below as advisory until Task 4 Step 4 — the two halves are meaningless apart. Two commits are still correct; one review covers both.

- [ ] **Step 7: Commit**

```bash
git add app/python-sdk/extraction-studio/_components
git commit -m "$(cat <<'EOF'
feat(extraction-studio): region colour mode and picker for OCR results

By confidence stays the default, so the overlay still shows where OCR was
unsure out of the box. Custom hands the regions to the studio-wide highlight
colour, sharing the value with structured extraction's citations rather than
introducing a second one.

The swatch row renders only in Custom mode: a permanently-visible disabled
control is dead weight in the state the panel is usually in.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire it up in `page.tsx`, verify live, open the PR

**Files:**
- Modify: `app/python-sdk/extraction-studio/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: nothing.

- [ ] **Step 1: Add the state**

In `page.tsx`, beside the existing `showRegions` state (around line 49):

```tsx
  const [showRegions, setShowRegions] = useState(true);
  // Shared with structured extraction's citations on purpose — one studio-wide
  // highlight colour that survives a rail switch, not two knobs that look
  // linked and are not. Only the MODE is OCR's own.
  const [ocrColorMode, setOcrColorMode] = useState<OcrColorMode>("confidence");
```

and add the type to the `lib/ocr` import:

```tsx
import {
  extractOcr,
  type OcrColorMode,
  ocrCitationsFor,
  type OcrRequest,
  type OcrResult,
} from "./lib/ocr";
```

- [ ] **Step 2: Feed the mode into the memo**

Replace Task 1's hardcoded call:

```tsx
  const ocrCitations = useMemo(
    () => ocrCitationsFor(ocrResult?.textElements ?? [], ocrColorMode),
    [ocrResult, ocrColorMode],
  );
```

`ocrColorMode` must be in the dependency array — without it, flipping the mode leaves the memo stale and the overlay never repaints.

- [ ] **Step 3: Pass the four props**

At the `<OcrResults …>` call site (around line 365):

```tsx
                <OcrResults
                  result={ocrResult}
                  activeIndex={activeIndex}
                  onSelectElement={setActiveIndex}
                  showRegions={showRegions}
                  onShowRegionsChange={setShowRegions}
                  colorMode={ocrColorMode}
                  onColorModeChange={setOcrColorMode}
                  citationHex={citationHex}
                  onCitationHexChange={setCitationHex}
                />
```

- [ ] **Step 4: Run the tests, typecheck and lint**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test
pnpm exec tsc --noEmit
pnpm exec biome check app/python-sdk/extraction-studio/page.tsx
```

Expected: 333 across 34 files, `tsc` now **silent** (Task 3's expected failure is resolved), biome 0 new errors.

- [ ] **Step 5: Verify live**

Start the backend on `#35`'s branch and the studio:

```bash
cd ~/SE/code/python-fast-api && git checkout ocr-code-snippet
.venv/bin/uvicorn app.main:app --port 8080 --reload
```

```bash
cd ~/SE/code/nutrient-sdk-samples
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm dev
```

`--reload` matters: without it uvicorn serves the code as of startup, and a correct change reads as "not taken". If HMR is not connecting, verify the *served* bundle rather than the source.

Open `http://localhost:3000/python-sdk/extraction-studio`, pick the OCR feature and a scanned document, Run. Then confirm each of these by **looking at the document overlay**, not just the panel:

1. Default is `By confidence`, and the boxes are green/amber/red.
2. Click `Custom` — every box repaints to the current highlight colour, one colour throughout.
3. Click a different preset — the boxes repaint again.
4. Type a hex into the field — the boxes follow, and a half-typed value like `#ff` does not blank them.
5. Click `By confidence` — the green/amber/red tint comes back.
6. Toggle `Show regions` off — the whole colour block disappears with the boxes.
7. Switch the rail to Structured Extraction and run it: the citations use the **same** colour you picked in OCR.
8. The element table's confidence dots are unchanged in both modes.

- [ ] **Step 6: Commit and open the PR**

```bash
cd ~/SE/code/nutrient-sdk-samples
git add app/python-sdk/extraction-studio/page.tsx
git commit -m "$(cat <<'EOF'
feat(extraction-studio): wire the OCR region colour mode into the page

ocrColorMode is OCR's own; the colour value is the studio-wide citationHex,
shared with structured extraction. ocrColorMode is in the memo's dependency
array — without it the overlay keeps the stale citations and never repaints.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git push -u origin ocr-highlight-color
gh pr create --base main --title "feat(extraction-studio): region highlight colour for OCR results" --body "$(cat <<'EOF'
## What

The OCR results panel gets preset swatches, a colour picker and a hex field —
the same control Structured Extraction has — behind a `By confidence | Custom`
mode toggle.

**Stacked on `#63`.** This branch is cut from `ocr-code-view` and must be
rebased onto `main` after `#63` merges. Do not merge it first.

Design: `docs/specs/2026-08-07-ocr-highlight-color-design.md`.
Plan: `docs/plans/2026-08-07-ocr-highlight-color.md`.

## Why it is a mode toggle and not just a picker

`OcrResults` deliberately had no colour picker, and said so in a comment: region
boxes are painted green/amber/red by each element's confidence, so the overlay
shows **where OCR was unsure**, and a single user-chosen colour would erase
that. The toggle keeps the tint as the default and makes Custom an explicit
trade. The element table's confidence dots are untouched in both modes, so the
signal never leaves the panel entirely.

## No new drawing code

`IndexedCitation` already carries an optional per-box `hex` that overrides the
component-level colour, and `resolveHex` is `citation.hex ?? fallback`. Custom
mode is OCR **omitting** that override and falling through to the shared
`citationHex` — the path structured extraction already takes.
`useCitationAnnotations.ts` and `lib/citations.ts` are unchanged.

## Also in here

- `confidenceTone`/`confidenceHex` move from `OcrResults.tsx` into `lib/ocr.ts`
  alongside the new `ocrCitationsFor()`, so the behaviour that defines this
  feature has a direct unit test rather than one through a mocked viewer. They
  had to move together — `confidenceHex` calls `confidenceTone` and both are
  pinned to the `.match-dot` values in `styles.css`, which they diverged from
  once already.
- `CitationColor` → `HighlightColor` with a `label` prop, so one component
  serves both panels and screen readers hear the right noun in each.
- No CSS changes; `.citation-*` class names are untouched.

## Verified live

Both modes against a real scan on the backend from `python-fast-api#35`:
default confidence tint, Custom repainting every box, preset and hex changes
following, `Show regions` hiding the block with the boxes, and the colour
persisting across a switch to Structured Extraction.

## Tests

333 across 34 files (was 320). `tsc --noEmit` clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- **Spec coverage.** Design decision 1 (mode toggle) → Task 3 Step 4 + Task 1's `ocrCitationsFor`; 2 (shared colour value) → Task 4 Steps 1/3, passing `citationHex`/`setCitationHex`; 3 (`HighlightColor` + `label`) → Task 2; 4 (`Segmented` above swatches, swatches only in Custom) → Task 3 Step 4 and its `shows swatches only in Custom mode` test; 5 (pure functions in `lib/ocr.ts`) → Task 1. The spec's testing section maps to Task 1 Step 2, Task 2 Step 1, Task 3 Steps 1/5, Task 4 Step 5.
- **The duplicate-label problem was found while writing Task 3** and is why `hideLabel` was planned. It is not in the design doc, because it only appears once you put `HighlightColor` inside a block that already has a heading. Flagged rather than silently added: if a reviewer prefers dropping the outer `<span>` and letting the label vanish in confidence mode, that is a smaller diff but a worse panel. **Amendment:** `hideLabel` did not survive to the shipped code — a follow-up fix (`5cfbe02`) renamed it to `embedded` and widened what it suppresses, to stop Custom mode double-applying `.citation-color`'s padding. See the design doc's Interfaces section.
- **Tasks 3 and 4 were merged before execution** (Jon, 2026-08-07). Task 3 alone would have ended with `tsc` red, since `page.tsx` cannot supply the new props until Task 4 — not independently reviewable, and warning the reviewer off it would be pre-judging. They run as one task with two commits and one review gate.
- **Test counts are cumulative predictions** (325 → 326 → 333). Re-measure rather than trusting them; one test moves files in Task 1, so the total is not a simple sum of additions.
