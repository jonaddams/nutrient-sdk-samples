# OCR region highlight colour — design

Written 2026-08-07. Adds preset swatches, a colour picker and a hex field to the Adaptive OCR
results panel, mirroring `CitationColor` in Structured Extraction.

**Status: five decisions settled, no open questions, not yet implemented.**

**Depends on `#63` (the OCR Code view).** This work modifies `OcrResults.tsx` as that PR leaves
it. Branch `ocr-highlight-color` is cut from `ocr-code-view`, so it must be rebased onto `main`
once `#63` merges — and `#63` in turn wants `python-fast-api#35` merged first.

---

## Why this needs a design at all

The obvious reading — "copy `CitationColor` into `OcrResults`" — collides with a decision the
code already records. `OcrResults.tsx` carries this comment above `confidenceHex`:

> This is why OcrResults has no colour picker: a user-chosen colour would fight the confidence
> tint.

OCR region boxes are painted green / amber / red by each element's confidence, so the overlay
shows **where OCR was unsure**. That is a real demo asset and a differentiator; a single
user-chosen colour would erase it. So the feature is not "add a picker" but "add a picker
without losing the confidence story."

---

## Decisions (all five are Jon's, 2026-08-07)

1. **A mode toggle, not a replacement.** `By confidence` (default, current behaviour) or
   `Custom` (one picked colour for every region). Rejected: replacing the tint outright
   (deletes the differentiated talking point) and hue-from-picker/opacity-from-confidence
   (darker is a much weaker cue for "unsure" than red-vs-green, and it makes the picked colour
   look inconsistent across the page).
2. **The colour value is shared with Structured Extraction.** OCR reuses the existing
   `citationHex` state rather than introducing a second one. One studio-wide highlight colour
   that persists as a prospect moves between rail features. Rejected: an independent `ocrHex`,
   which duplicates state and prop-threading for two controls that look shared but are not.
3. **`CitationColor` is renamed `HighlightColor` and takes a `label` prop.** Structured passes
   `"Citation color"`, OCR passes `"Region color"`, and the aria-labels derive from it so
   screen readers stay accurate in both. Rejected: keeping the name (a component called
   `CitationColor` rendering "Region color" is a name that lies) and duplicating the component
   (~90 lines including the draft-state and invalid-hex handling — exactly the subtle logic you
   do not want two copies of).
4. **Mode is a `Segmented` above the swatches; the swatch row renders only in Custom.** The
   panel already uses `Segmented` for Elements / Text / JSON / Code, so this needs no new
   visual vocabulary, and the default state stays clean. Rejected: an always-visible greyed
   swatch row (dead weight that invites clicks that do nothing) and no mode control at all
   (the way back is a text link that is easy to miss, with no indicator of the current mode).
5. **The confidence→colour logic moves to `lib/ocr.ts` as pure functions.** So the behaviour
   that defines this feature has a direct unit test rather than an indirect one through a
   mocked viewer. Rejected: leaving the mapping inline in `page.tsx`'s `useMemo`.

---

## The mechanism — no new drawing code

`IndexedCitation` already carries an optional per-box `hex` that overrides the component-level
colour, and `resolveHex` is `citation.hex ?? fallback`. Its docstring already describes both
halves of what this feature needs:

> OCR gives every region its own confidence colour; structured extraction sets none and falls
> back to the picker's value.

So **Custom mode is simply OCR omitting the per-box `hex`** and taking the structured path.

| Mode | `IndexedCitation.hex` | What `resolveHex` returns |
|---|---|---|
| `confidence` (default) | `confidenceHex(el.confidence)` | the per-element tint |
| `custom` | absent | the shared `citationHex` |

`useCitationAnnotations.ts` and `lib/citations.ts` need **zero changes**. That is the whole
point of the override mechanism, which was built for OCR in the first place.

---

## File structure

| File | Change |
|---|---|
| `lib/ocr.ts` | Gains `confidenceTone`, `confidenceHex` (moved), and new `ocrCitationsFor()` |
| `lib/__tests__/ocr.test.ts` | Gains tests for all three |
| `_components/CitationColor.tsx` | Renamed `HighlightColor.tsx`; `label` prop added |
| `_components/__tests__/CitationColor.test.tsx` | Renamed to match; gains a `label` test |
| `_components/StructuredResults.tsx` | Import rename; passes `label="Citation color"` |
| `_components/OcrResults.tsx` | Four new props; mode `Segmented`; `HighlightColor`; imports `confidenceTone` from `lib/ocr.ts` instead of defining it |
| `_components/__tests__/OcrResults.test.tsx` | Import update; new tests for the mode control |
| `page.tsx` | `ocrColorMode` state; calls `ocrCitationsFor`; passes four props |

No CSS changes. The `.citation-*` class names stay as they are — renaming them buys nothing a
user can see and risks the `styles.css` source-order trap (responsive overrides must remain at
the end of the file or they silently do nothing).

### `confidenceTone` and `confidenceHex` move together

They cannot be split: `confidenceHex` calls `confidenceTone`, and both are pinned by comment to
the `.match-dot.good/.partial/.bad` values in `styles.css`. They already diverged once — the
dot beside an element and the box drawn for that element were visibly different greens — so the
comment tying them to the CSS must travel with them.

Only three consumers exist today, all updated by this change:

- `page.tsx:11` imports `confidenceHex` from the component file (backwards — a page importing a
  colour function from a component; the move fixes that in passing)
- `OcrResults.tsx` uses `confidenceTone` in the element table
- `OcrResults.test.tsx:4` imports `confidenceTone`

---

## Interfaces

```ts
// lib/ocr.ts
export type OcrColorMode = "confidence" | "custom";

export function confidenceTone(n: number): "good" | "partial" | "bad";
export function confidenceHex(n: number): string;

/** Build the overlay's citations for a run. In `custom` mode each entry omits
 *  `hex`, so resolveHex falls back to the studio-wide picker value. */
export function ocrCitationsFor(
  elements: OcrElement[],
  mode: OcrColorMode,
): IndexedCitation[];
```

```tsx
// _components/HighlightColor.tsx
export function HighlightColor({ label, value, onChange }: {
  label: string;                      // "Citation color" | "Region color"
  value: string;
  onChange: (hex: string) => void;
}): JSX.Element;
```

`OcrResults` gains four props, the same shape `StructuredResults` already takes:
`colorMode`, `onColorModeChange`, `citationHex`, `onCitationHexChange`.

---

## Layout

The block sits directly under `.results-meta`, gated on `showRegions` — mirroring how
`StructuredResults` gates `CitationColor` on `showCitations`.

```
0.8s   2 elements   90% avg confidence      [Show regions ●]

Region color
( By confidence | Custom )
■ ■ ■ ■  ◈  [#ffc107]        ← only when Custom
```

Presets are the existing four (`Amber #ffc107`, `Green #34c759`, `Cyan #00a3e0`,
`Magenta #d63384`), unchanged and shared.

It renders whether or not the result is empty, because `Show regions` itself already does. A
colour control above a "No text found" callout is mildly useless, but splitting the two would
make the panel inconsistent with itself for no gain.

---

## Deliberately out of scope

- **The element table's confidence dots stay in both modes.** So Custom mode hides the
  confidence signal on the overlay but never removes it from the panel — the percentages and
  coloured dots per row are untouched.
- **`Show regions` is inert in Markdown mode** (regions derive from `textElements`, which the
  markdown branch returns empty). The colour block follows `Show regions` exactly, so it is
  equally inert there. That is a pre-existing open item in
  `docs/extraction-studio-todo.md` and remains Jon's call — this design neither fixes it nor
  worsens it.

---

## Testing

**`lib/__tests__/ocr.test.ts`** — the core of the feature:

- `confidenceTone` bands a score into three tones (moved from `OcrResults.test.tsx`).
- `confidenceHex` returns the three `.match-dot` values, and **matches the CSS** — assert the
  literal hexes, since silent divergence from `styles.css` is the failure that already happened
  once.
- `ocrCitationsFor(elements, "confidence")` gives every entry its own `hex`.
- `ocrCitationsFor(elements, "custom")` produces entries with **no `hex` key at all** — assert
  absence, not `undefined`, since `resolveHex` uses `??`.
- Elements with a null `citation` drop out in both modes.

**`_components/__tests__/OcrResults.test.tsx`:**

- The mode `Segmented` renders when `showRegions` is on and disappears when it is off.
- Swatches render only in Custom mode.
- Clicking `Custom` calls `onColorModeChange` with `"custom"`.
- Default is `By confidence`, with that button `aria-pressed`.

**`_components/__tests__/HighlightColor.test.tsx`** — the existing `CitationColor` tests move
across unchanged, plus: the `label` prop renders as the visible label and reaches the
aria-labels.

**Live:** both modes against a real scan, confirming the overlay repaints on a preset click and
that switching back to `By confidence` restores the green/amber/red tint.

Baselines: frontend **320 tests / 34 files** at `#63`'s head. Note the final count is **not
simply additive** — `confidenceTone`'s test moves out of `OcrResults.test.tsx` into a new
`lib/__tests__/ocr.test.ts`, and `CitationColor.test.tsx` is renamed rather than added. Expect
**35 files**, and re-measure rather than predicting the test total. Run `pnpm exec tsc --noEmit`
separately — a green vitest run is not evidence for a type change.
