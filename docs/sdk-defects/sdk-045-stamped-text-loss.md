# SDK-045 — text under a rotated stamp is silently discarded by the layout stage

Registry id **SDK-045**. **Not yet filed upstream** — see "Filing status" below.

This file exists because the evidence previously lived only in a gitignored
`DEFECTS.md` in the backend repo plus the body of PR #44, so it did not survive a clean
checkout. The repro is committed beside it at
[`repro/napy_045_stamp_text_loss.py`](repro/napy_045_stamp_text_loss.py) and is
self-contained — it builds its own fixture. The ready-to-file NAPY body is at
[`napy-ticket-sdk-045.md`](napy-ticket-sdk-045.md).

| | |
|---|---|
| **Symptom** | A required field returns `""` from `Vision.extract_structured()` although the value is plainly printed and present in the text layer |
| **Root cause** | The layout stage replaces a page region with a `{"type": "picture"}` element and discards every text block inside it |
| **Trigger** | A rotated stamp/watermark drawn across the text |
| **Severity** | High — silent data loss, reports success |
| **Verified on** | `nutrient-sdk` / `nutrient-sdk-native` **1.0.9** (compiled 2026-07-09), Python 3.12.13, macOS Darwin 25.6.0 arm64 |
| **Verified** | 2026-08-06 |
| **Provider** | Reproduces with **no LLM provider at all** (`extract_content()`); caller-visible symptom shown with OpenAI `gpt-5.4` |

## The correction that matters

**The earlier framing of SDK-045 was wrong and should not be repeated.** The registry
entry and PR #44 described this as *"`0.40` with no citation is the SDK's ungrounded
marker, and it is handled inconsistently — a real value is suppressed here while
fabrications pass through elsewhere."*

That mechanism is disproven. `admissionDate` comes back `""` with
`include_confidence = False` **and** `include_source_locations = False` — i.e. with
grounding switched off entirely. Nothing is being suppressed by a grounding check,
because the value is already empty before grounding runs.

`groundingScore: 0.40` and `match: "not_found"` are **downstream symptoms**, not the
cause. They are what the grounding stage reports when asked to locate an empty value.
Chasing them is what cost the original investigation six runs, three schema variants and
two providers — the field was never the model's to get right.

## What actually happens

The model never sees the text. In order:

1. The text **is** in the text layer. `export_as_text()` on the real worksheet returns
   2,400 chars containing both `Date of Admission` and `12/04/2016`, on their own line.
2. The document graph **drops it**. The region containing the date is emitted as a single
   `{"type": "picture", "classification": "logo"}` element, and the text blocks inside
   that element's bounds are gone.
3. `extract_structured()` serialises that graph to the IR-lite payload it sends the
   provider, so the outbound request contains `JOHN DOE` and `9920` but **neither
   `Date of Admission` nor `12/04/2016`** — confirmed by capturing the request body
   (8,033 bytes; `messages[1].content` = two `text` parts, no image).
4. The model returns `""`, correctly, for a field it was shown no evidence for.
5. Grounding cannot locate `""`, so it reports `match: "not_found"` and
   `groundingScore: 0.40`.

There is no escape hatch. `include_page_images = True` does not help, because it is
itself a no-op on `extract_structured()` — no image ever reaches the wire (separate
unfiled defect). So the model can see neither the text nor the pixels.

## Evidence

### 1. The trigger is the stamp, and only the stamp

Four PDFs built from one HTML template, identical text, differing only in decoration
around the date line. Run by the committed repro:

| variant | `export_as_text` | `extract_content` | picture element |
|---|---|---|---|
| plain | FOUND | FOUND | – |
| dashed border around the region | FOUND | FOUND | – |
| **rotated stamp across the date** | FOUND | **LOST** | `line_chart` |
| **both** | FOUND | **LOST** | `line_chart` |

The dashed border is irrelevant. A stamp that does *not* overlap the date does not
trigger it either — an earlier attempt with the stamp placed elsewhere on the page
extracted the date fine. **Overlap is the condition.**

### 2. What the caller sees

Same four PDFs, `extract_structured()` with OpenAI `gpt-5.4`, `admissionDate` **required**:

| variant | `admissionDate` | `match` | `groundingScore` |
|---|---|---|---|
| plain | `'12/04/2016'` | `id_match` | 0.95 |
| dashed border | `'12/04/2016'` | `id_match` | 0.95 |
| **stamp** | `''` | `not_found` | **0.40** |
| **both** | `''` | `not_found` | **0.40** |

An empty string, not `null` and not an error, for a field the schema marks required. The
envelope reports success.

### 3. The element that eats the text

From `extract_content()` on the stamped variant:

```json
{
  "type": "picture",
  "classification": "line_chart",
  "classificationConfidence": 0.4668875,
  "altDescription": "",
  "readingOrder": 3,
  "pageNumber": 1,
  "bounds": { "x": 2928.4182, "y": 191.15796, "width": 923.5818, "height": 298.61615 }
}
```

Two things to notice. A rotated text stamp is classified as a **`line_chart`**, at
**0.467 confidence** — and that low-confidence guess is still allowed to destroy the text
in its bounds. And `altDescription` is empty, so nothing replaces what was removed.

### 4. Two blocks lost, not one

Comparing the IR-lite payloads for the synthetic pair shows the region is collapsed
wholesale. Unstamped — six blocks, the date at `b3`:

```json
[["b0",["h2","EMERGENCY DEPARTMENT BILLING WORKSHEET"]],
 ["b1","Clinical Archive Dept | System Registry: LOC-99201-B"],
 ["b2","PATIENT NAME: JOHN DOE"],
 ["b3","Date of Admission: 12/04/2016"],
 ["b4","RECORD ID: #9920-A (MASKED FILE ID)"],
 ["b5","FACILITY SUB-TOTAL: $4,300.00"]]
```

Stamped — five blocks, and **both** the date line and the RECORD ID line are gone:

```json
[["b0",["h2","EMERGENCY DEPARTMENT BILLING WORKSHEET"]],
 ["b1","Clinical Archive Dept | System Registry: LOC-99201-B"],
 ["b2","PATIENT NAME: JOHN DOE"],
 ["b3",{"type":"picture","classification":"line_chart"}],
 ["b4","FACILITY SUB-TOTAL: $4,300.00"]]
```

Everything geometrically inside the picture's bounds is discarded, not just the line the
stamp touches.

### 5. It is not confined to the Vision path

On the real worksheet, three independent consumers lose the date and only the raw text
export keeps it:

| Export | `12/04/2016` |
|---|---|
| `export_as_text()` | FOUND |
| `export_as_markdown()` | **LOST** |
| `export_as_html()` | **LOST** |
| `Vision.extract_content()` | **LOST** |
| `Vision.extract_structured()` | **LOST** |

So this is the shared layout/document-graph stage, and it silently corrupts PDF→Markdown
and PDF→HTML conversion as well — both licensed features in their own right.

The synthetic pair does *not* reproduce the markdown/HTML half (both keep the date), so
those pipelines are not identical to the Vision one. The real worksheet's markdown output
also drops words unrelated to the stamp — `EMERGENCY` from the title,
`Archive Dept | System Registry:` from the following line, `NAME:` after `PATIENT`.

That turned out to be a **separate and much broader defect**, now written up as
**[SDK-046](sdk-046-markdown-column-word-loss.md)**: markdown/HTML conversion drops words
at inferred table column boundaries, on 16 of this repo's 39 sample documents, up to 40%
of a document's tokens. It is not this defect — the Vision IR carries the worksheet's
prose paragraph complete while markdown drops seven words from it — and the two are
filed separately.

## Reproducing

```bash
pip install nutrient-sdk nutrient-sdk-native python-dotenv
export NUTRIENT_LICENSE_KEY=...   # stage 1 needs only this
export OPENAI_API_KEY=...         # stage 2, the caller-visible symptom
python docs/sdk-defects/repro/napy_045_stamp_text_loss.py
```

Stage 1 needs no LLM provider, which is the point: the loss is upstream of any model, so
nothing about prompting or model choice is implicated.

The real document is `public/documents/emergency-dept-billing-worksheet.pdf` in this
repo. Its stamp is page content — a rotated vector box with rotated text — not an
annotation: the file has no `/Annots` and no image XObjects.

## Why this matters beyond one sample

Stamps and watermarks over content are ordinary in the documents customers actually
process: `ARCHIVED`, `VOID`, `PAID`, `DRAFT`, `CONFIDENTIAL`, `SUPERSEDED`. Any of them
landing across a field is enough to delete that field's value from every layout-aware
output, with a success envelope and a confidence number that points at the model.

For the extraction studio specifically: pick the **Healthcare** category and press Run,
and a required field comes back empty. That is the only remaining item in the studio's
TODO that fails visibly in a demo. The preset is correct, so `admissionDate` stays
**required** rather than being softened to optional to make the gate pass — see
`docs/extraction-studio-todo.md`.

## Not established here

The old registry entry paired the suppression above with a **fabrication** claim: on
`meridian-income-statement.pdf`, `provider=local` (`qwen2.5-vl-7b` via LM Studio)
returned `totalAssets` 9,700,000 and `totalLiabilities` 3,580,000 — also at 0.40 with no
bbox — for two optional fields whose values appear nowhere in the document.

That observation is **not re-verified as of 2026-08-06** and is **not** part of this
defect. `LM_STUDIO_API_URL` is absent from the current environment, so the Local provider
is not listed and the run could not be repeated. It is a distinct mechanism from the text
loss documented here — a small model inventing values is not the layout stage dropping
them — and pairing the two under one id is what produced the wrong "inconsistent handling
of the ungrounded marker" framing in the first place. If it is worth pursuing, it needs
its own id and its own repro.

## Filing status

**Blocked on Jira permissions, 2026-08-06.** The ticket body is written and ready at
[`napy-ticket-sdk-045.md`](napy-ticket-sdk-045.md) — paste it into a new **NAPY** Bug,
priority **High**, labels `python-sdk` `sdk-defect-hunting` `vision`, and record the
issue key back into this file's header.

Creating it programmatically failed: `You do not have permission to create issues in
this project`. Querying Jira for creatable projects returns **83 projects, and NAPY is
not one of them**, so this is a project-permission gap rather than a bad request — even
though NAPY-7 through NAPY-20 were filed from this same account. Worth checking whether
NAPY's permission scheme changed, since it blocks every future SDK defect filing too.

## Related

- **NAPY-15 / SDK-037** — `VisionFeatures.KEY_VALUE_REGION` is a no-op. Same family:
  a licensed capability that silently produces nothing.
- **NAPY-20 / SDK-041** — narrow `VisionFeatures` selection breaks `extract_content()`;
  why the repro requests `VisionFeatures.ALL`.
- **`include_page_images` no-op** — unfiled. Why there is no escape hatch here.
- **PR #44** in this repo — the original per-field run tables, including the six runs and
  three schema variants that the corrected mechanism explains.
