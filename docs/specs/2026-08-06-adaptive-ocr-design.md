# Adaptive OCR in the extraction studio — design

Written 2026-08-06. Agreed with Jon in brainstorming the same day.

Enables the `adaptive_ocr` rail entry in `app/python-sdk/extraction-studio/`, giving it a
configurable options panel, a Run button, and a results display — the second live feature in
the rail after Structured extraction.

**This file is committed on purpose.** The skill's default location,
`docs/superpowers/specs/`, is gitignored in this repo; that is why the SDK-045 evidence did
not survive a clean checkout and had to be moved into a committed `docs/sdk-defects/`.

---

## Why Adaptive OCR, and not Local ICR

Local ICR was the original request. It was set aside because the corpus does not support it:
ICR is for handwriting and awkward print, and the studio's manifest is ten business documents.
Jon's words: "I don't have a great selection of handwriting sample documents."

Adaptive OCR needs **no new documents**. The manifest already holds four with *zero* text
layer — verified against the files, not trusted from metadata:

| Document | Category | Words extracted |
|---|---|---|
| Lumen | invoices | **0** |
| Vandelay Industries | invoices | **0** |
| Westbridge submittal transmittal | construction | **0** |
| Straight bill of lading | logistics | **0** |

Two are invoices, the flagship category, and PR #56 just gave exactly these four a `SCAN`
marker in the document rail. Corpus, marker and feature line up: *these four say SCAN — here
is what OCR makes of them.*

It is also genuinely local. `VisionEngine.ADAPTIVE_OCR` with no provider makes no network call
and needs no API key, so unlike the LM Studio provider it works on the Railway-hosted demo.
The on-prem story holds in front of a prospect.

---

## Verified facts this design rests on

Measured 2026-08-06 on SDK 1.0.9 across two documents (`scanned-invoice.pdf`,
`input_ocr_multiple_languages.png`), each variant in a fresh subprocess because a failed
Vision call poisons the process (NAPY-7 / SDK-003).

### Options that work

| Option | Evidence |
|---|---|
| `OcrSettings.set_default_languages` | `eng` conf 0.9322 · `deu` 0.8952 · `eng+deu` 0.9381 · `eng+deu+fra` **0.9485** |
| `OcrSettings.set_enable_table_detection` | invoice 129,060 → 88,249 chars, 53 → 50 elements. No effect on a table-free page, so document-dependent. |
| `VisionSettings.set_output_format` | JSON elements ~190k chars vs MARKDOWN ~1.9k |

Adding correct language hints visibly raises the confidence number. That is the demo.

### Options that are verified NO-OPS — they get no control

Byte-identical output on **both** documents:

- `set_favor_accuracy` — both `True` and `False`. Timings flat at ~760–900 ms either way.
- `set_enable_preprocessing`
- `set_enable_skew_detection`
- `WordsDetectionSettings.set_confidence_threshold`

**Exposing any of these would recreate the Multimodal toggle** that was deleted on 2026-08-06
for being a control a prospect could flip that provably changed nothing. `favor_accuracy` is
the tempting one — speed versus accuracy is a great knob — and it does nothing here.

### `VisionFeatures` cannot be a control

Narrowing the bitmask breaks `extract_content()` with error 3024 (SDK-041 / NAPY-20). The
backend already pins `VisionFeatures.ALL` with a comment saying so. Leave it.

### Language codes

`get_default_languages()` returns `'eng'`, and the separator is **`+`**. All twenty codes
tried were accepted:

```
eng deu fra spa ita por nld swe dan pol rus jpn kor chi_sim chi_tra ara heb hin tur ell
```

**Any other separator returns an empty document, silently.** `eng,deu`, `eng;deu`, `eng|deu`,
`eng deu` and two-letter codes all yield 154 chars / 0 elements with no exception raised.
`eng,deu` is the obvious first guess, so a caller would conclude the page was blank. This is
the single most important fact in this document and the reason for the allowlist below.

Worth filing as **SDK-049**: a malformed `default_languages` string should raise, not return
an empty document.

### The result shape

`extract_content()` returns page dimensions *and* per-word geometry:

```json
{
  "metadata": [{"pageNumber": 1, "width": 1654, "height": 2338, "dpiX": 96, "dpiY": 96}],
  "elements": [{"type": "...", "role": "...", "text": "...", "readingOrder": 0,
                "pageNumber": 1, "bounds": {"x":173,"y":107,"width":298,"height":150},
                "confidence": 0.95,
                "words": [{"text":"Invoice","bounds":{...},"confidence":0.9503}]}]
}
```

`metadata[]` carries what `pages[]` carries for `/structured`, so the existing
`normalize_bbox()` converts element bounds to the same fractional `Citation` shape and the
citation overlay is reused unchanged. **`_format_extraction_result()` currently discards
`metadata` — it must carry it through.**

---

## Backend

Extend `POST /api/extraction/ocr`, which today accepts only a file.

| Param | Type | Default |
|---|---|---|
| `languages` | `str`, `+`-joined | `"eng"` |
| `table_detection` | `bool` | `true` |
| `output_format` | `"json"` \| `"markdown"` | `"json"` |

`VisionOutputFormat` also offers `IR_LITE`. It is deliberately not exposed: it is the SDK's
internal layout representation, not an output a prospect would consume, and it is the format
whose text-loss behaviour SDK-045 documents.

**`languages` is validated against a server-side allowlist of the twenty verified codes**,
rejecting anything else with a 400 naming the offending code. Without it a typo returns a
blank page and the feature looks broken.

This reuses the `_ALLOWED_MODELS` pattern from the Bedrock work — and repeats its lesson: the
code that *lists* what is allowed and the code that *validates* against it must be the same
code. Listing and validation disagreeing about a whitespace-only key was the bug fixed in
`python-fast-api#33`. One allowlist constant, both paths.

`output_format` is validated the same way. `table_detection` needs no validation.

Settings are applied in `_run_vision()`, which already takes `output_format`; it gains
`languages` and `table_detection`. `VisionFeatures` stays `ALL`.

The response keeps its current shape and gains:

- `config` — echo of what actually ran, as `/structured` does
- `timingMs`
- page dimensions carried through from `metadata`, and element/word bounds normalised to
  fractional coordinates

`merge_element_pages()` must preserve `metadata` across pages, since multi-page scans merge
per-page results.

---

## Frontend

### Structure

`page.tsx` switches both panels on the existing `feature` state:

```tsx
{feature === "structured" ? <StructuredConfig … /> : <OcrConfig … />}
```

Rail, category control, document strip, viewer and the Run button stay shared and untouched.
No feature registry and no per-feature routes: with two of eight features built, a shared
contract would be inferred from a sample of two whose shapes genuinely differ — schema-in /
fields-out versus options-in / elements-out. Extract the abstraction when a third feature
shows what is actually common.

Two changes to the shell that are part of this work, not separate refactoring:

1. **Results clear when `feature` changes.** Stale structured results under an OCR panel is
   the obvious bug in a feature-switching shell.
2. **Structured-specific state moves out of the shell.** `citations` and `citationHex` are
   meaningless to OCR; leaving them in `page.tsx` tangles the two features immediately.

`FEATURES` in `FeatureRail.tsx` sets `adaptive_ocr` to `enabled: true`. The other six stay
disabled.

### `OcrConfig.tsx`

Same contract as `StructuredConfig`: `{docPath, filename, onRun, runSignal}`, owns its own
state, emits on the run signal.

| Control | Component | Notes |
|---|---|---|
| Languages | chip multi-select (**new control**) | the twenty verified codes, `eng` preselected, joined with `+` in code |
| Table detection | `Toggle` | on by default |
| Output | `Segmented` | Elements / Markdown |

The language control is the only genuinely new UI in this feature — the studio has no
multi-select today. It is a row of toggleable chips built from the existing `.chip` styling
with `aria-pressed`, matching how `CitationColor`'s preset swatches already work, rather than a
`<select multiple>` which is poor on touch and in a 208px-adjacent panel.

No provider select and no loading state: OCR needs no credentials, so the whole
`fetchProviders` gating that `StructuredConfig` carries does not apply.

Help text says what each option does in plain language, and — for languages — that picking the
document's actual languages raises confidence, which is the observable effect.

### `OcrResults.tsx`

Same shape as `StructuredResults`:

- **Meta row** — timing, element count, average confidence
- **`Segmented`** — Text / Elements / JSON / Code
- **Elements view** — table of reading order, type, text, confidence; clicking a row boxes
  that element on the page
- **Text view** — the full extracted text
- **Code view** — a runnable snippet. Per `python-fast-api#33`, it must define every name it
  references; no undefined placeholders.

**Boxes are tinted by confidence, so there is no colour picker.** `CitationColor` is
deliberately not reused: a user-chosen colour would fight the confidence tint. A "Show
regions" toggle is the only display control. This is an intentional divergence from Structured
extraction.

Confidence is rendered as a coloured dot plus a percentage, reusing the existing `.match-dot`
styling and its `good` / `partial` / `bad` tones so the two features read consistently.

This needs a **new** helper: `matchDotTone()` keys on match strings (`exact`, `not_found`),
whereas OCR confidence is a float. So a sibling `confidenceTone(n: number)` with explicit
thresholds, living beside it and sharing its CSS. Not a reuse of `matchDotTone` itself — the
inputs are different types and conflating them would be a false economy.

---

## Error handling

| Case | Behaviour |
|---|---|
| Invalid language code | 400 from the allowlist, surfaced in the panel like the provider-failure text |
| Invalid `output_format` | 400, same treatment |
| **Zero elements returned** | An explicit "no text found in this document" state, never an empty table |
| Backend unreachable | The existing error path |
| Vision failure mid-document | Backend already fails fast and prefixes the failing page |

The zero-elements state matters more than it looks. Silent emptiness is this feature's known
failure mode — it is what a malformed language string produces — so the UI names it rather
than rendering a blank panel that looks like a bug in the studio.

---

## Testing

### Backend (pure, no SDK, no network)

- The allowlist accepts all twenty verified codes.
- It rejects the exact strings that silently emptied: `eng,deu`, `eng;deu`, `eng|deu`,
  `eng deu`, `en,de`. These are regression tests for a real observed failure, not invented
  cases.
- Listing and validation agree — the same assertion style used for the Bedrock key parity fix,
  because that is the bug this pattern previously had.
- `output_format` validation; `config` echo contents.

### Frontend

- `OcrConfig` emits the expected request on `runSignal`, with languages joined by `+`.
- **No control exists for the four no-op options** — same spirit as the Multimodal absence
  test, so re-adding one is a decision that updates a test.
- Each results view renders; confidence formats correctly.
- Switching feature clears results.
- **Every `enabled` rail entry is a feature `page.tsx` can render** — flipping a rail flag
  without wiring it should fail loudly rather than render an empty panel.

### Manual verification

Against a live backend, per this repo's standing practice of checking the served bundle rather
than the source:

- All four SCAN documents extract, and the three digital documents also work (OCR pre-renders).
- Confidence climbs as correct languages are added — the demo claim, verified in the UI.
- Table detection off changes the result on a table-bearing document.
- Both themes, and the ≤1024px stacked layout.

---

## Explicitly out of scope

- The other six rail features. **Multilingual OCR is now buildable** — multi-language works
  with `+` — but it is a separate feature and a separate decision.
- Word-level overlay of every word on the page. Element-level reuses the citation layer as-is;
  hundreds of word boxes is new overlay code and a later increment if wanted.
- Filing SDK-049. Worth doing, but the NAPY Jira permission is already blocking four finished
  write-ups; this one joins the queue rather than holding up the feature.
- Retiring the existing `/python-sdk/ocr-extraction` sample. Per the standing decision,
  samples retire only once the rail feature genuinely replaces them, one at a time.
