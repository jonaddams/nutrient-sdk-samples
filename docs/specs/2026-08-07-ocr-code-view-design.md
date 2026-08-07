# OCR Code view — design

Written 2026-08-07. Closes item 1 of `docs/extraction-studio-todo.md`'s "Next session" list:
the OCR results panel has no Code segment though the spec calls for one.

**Status: design agreed on all five points, no open questions, not yet implemented.** Written
mid-brainstorm so a session restart does not lose it. Jon chose "build it" over "amend the
spec to three segments" on 2026-08-07.

---

## Why this exists

The Adaptive OCR spec's `OcrResults` section calls for four segments — Text / Elements /
JSON / **Code** — and only three shipped. It was dropped in the *plan*, not in
implementation, so all eight tasks built faithfully to a plan that had already lost it.

Structured extraction **does** have a Code segment, so a prospect told "every result gives
you the code that produced it" loses that promise by clicking one rail entry.

---

## The finding that shaped the whole design

**The OCR path is not one SDK call, and the obvious short snippet would fail on every
document the feature demos.**

Structured extraction is a clean one-to-one: `_prepared_document` → one `Document.open` →
one `extract_structured`. That is why `_build_code()` can print a faithful 12-line snippet.

OCR is not. `_run_vision` is wrapped in `_prepared_pages`, which rasterizes PDFs to one JPEG
per page and runs Vision once per page, then merges. That is not an optimisation — per the
docstring, image-only PDFs **fail** Vision's InputImage stage (NAPY-8), and once one Vision
call fails the SDK enters a process-wide bad state where every later call fails identically
(NAPY-7).

All four of the studio's OCR documents are PDFs: `lumen-invoice.pdf`,
`scanned-invoice.pdf`, `westbridge-engineering-submittal-form.pdf`, `bill-of-lading.pdf`.

So `Document.open("scan.pdf")` → `Vision.set(doc).extract_content()` is short, clean, mirrors
structured — and errors on every document a prospect would paste it against. Worse than no
Code view: it makes the SDK look broken in the one artifact designed to prove it is not.

---

## Decisions (all four are Jon's, 2026-08-07)

1. **Faithful snippet, including the prerender loop.** Runnable as printed on the studio's
   own PDFs, at ~48 lines, even though it puts a workaround for two of our own SDK defects
   in prospect-facing material. Rejected: the ~9-line short form (fails on the demo corpus)
   and branching on input type (the corpus is all PDFs, so the short branch would almost
   never be seen).
2. **Minimal merge in the JSON branch.** Rewrite `pageNumber` and `readingOrder`, concatenate
   elements. Teaches the trap that actually bites and skips the page-dimension harvesting the
   studio needs only for drawing overlay boxes. Rejected: the full `merge_element_pages`
   including the `metadata` width/height collection (~18 lines, overlay-specific), and no
   merge at all (leaves the reader a list whose pages all claim to be page 1, unmentioned).
3. **Both output modes get a Code segment.** JSON mode: `Elements | Text | JSON | Code`.
   Markdown mode: `Markdown | Code | JSON`. Rejected: JSON-only, which satisfies the spec
   literally but makes Code vanish when a reviewer flips the Output control — a smaller
   version of the same disappearing-promise problem, one control deeper.
4. **Capability framing in the prerender comment, not defect framing.** "Adaptive OCR reads
   page images, so render each PDF page to a JPEG first." True on its own terms, reads as
   ordinary API guidance. Rejected: naming NAPY-8 explicitly (advertises a known bug in a
   sales artifact) and no comment at all (invites the question live instead of answering it
   on our terms).

---

## Decision 5 — Copy/Download row: YES (Jon, 2026-08-07)

**`OcrResults` gets the same actions row as `StructuredResults`.**

`StructuredResults` has one next to its `Segmented` (`.results-actions` /
`.results-actions-btns`, with `payload()` keyed to the current view and a deferred
`revokeObjectURL`). `OcrResults` has **none**.

A Code view you cannot copy is half a feature — copying is the entire point of the snippet.
So: the same actions row, payload keyed to the current view, `.py` for code and `.json` /
`.md` otherwise, with the deferred `revokeObjectURL`. It widens the diff beyond the strict
spec gap and closes the same consistency complaint that drove this item.

Rejected: no row at all (smallest diff, but leaves the snippet uncopyable) and Copy-only
(dodges the Blob plumbing but diverges from `StructuredResults` for no stated reason).

---

## Approach

**`_build_ocr_code()` in `app/services/extraction.py`, beside `extract_text_ocr`.** Each
service owns its own builder, mirroring `_build_code()` in `structured.py`.

Rejected: a shared `code_snippets.py` — the two builders share nothing real (OCR has no
provider, key or schema; structured has no prerender or merge), so the "common" module would
be two unrelated functions in one file. Also rejected: building in the frontend from
`result.config`, since the frontend does not know the SDK and structured's precedent is
server-side.

---

## Backend

```python
def _build_ocr_code(filename: str, echo: dict, *, table_detection: bool) -> str
```

Called in `extract_text_ocr` after `result["config"]` is set, on **both** branches, so the
key set stays identical. The existing backend test
`test_ocr_endpoint_markdown_key_set_matches_json` therefore covers `code` for free.

`languages` and `table_detection` interpolate from `echo`, so the snippet reflects the run
that produced it.

### Two traps the snippet must carry

Both found while drafting it; both would ship silently broken code.

- **`sorted(glob.glob("page-*.jpg"))` is lexicographic**, so `page-10` sorts before `page-2`.
  The real `_collect_rendered_jpegs` sorts numerically for exactly this reason.
- **Single-page documents are written to `page.jpg` with no suffix at all**, so
  `glob("page-*.jpg")` returns an empty list and the snippet prints nothing. Given the corpus
  is short scans, this is the likeliest thing a prospect would hit.

### JSON branch, ~48 lines

```python
import glob, json, re
from nutrient_sdk import (Document, ImageExportFormat, Vision,
                          VisionEngine, VisionFeatures)

# Adaptive OCR reads page images, so render each PDF page to a JPEG
# first. export_as_image() does the whole document in one call.
with Document.open("scanned-invoice.pdf") as document:
    images = document.get_settings().get_image_settings()
    images.set_export_format(ImageExportFormat.JPEG)
    document.export_as_image("page.jpg")

# Multi-page writes page-1.jpg, page-2.jpg, …; a single-page document
# is written to page.jpg itself. Sort numerically so 10 follows 9.
paths = sorted(glob.glob("page-*.jpg"),
               key=lambda p: int(re.search(r"-(\d+)\.jpg$", p).group(1)))
paths = paths or ["page.jpg"]

raws = []
for path in paths:
    with Document.open(path) as page:
        settings = page.get_settings()
        vision = settings.get_vision_settings()
        vision.set_engine(VisionEngine.ADAPTIVE_OCR)
        vision.set_features(VisionFeatures.ALL.value)
        settings.get_ocr_settings().set_default_languages("eng")
        settings.get_ocr_settings().set_enable_table_detection(True)
        raws.append(Vision.set(page).extract_content())

elements, next_order = [], 0
for page_idx, raw in enumerate(raws, start=1):
    payload = json.loads(raw)
    page_elements = payload.get("elements", [])
    page_elements.sort(key=lambda e: e.get("readingOrder", 0))
    for element in page_elements:
        # Each per-page call reports pageNumber=1 and restarts
        # readingOrder at 0 — rewrite both or the pages interleave.
        element["pageNumber"] = page_idx
        element["readingOrder"] = next_order
        next_order += 1
        elements.append(element)

print(json.dumps(elements, indent=2))
```

### Markdown branch, ~30 lines

Identical through the loop, plus `vision.set_output_format(VisionOutputFormat.MARKDOWN)`, no
merge at all, ending:

```python
print("\n\n---\n\n".join(raws))
```

That separator is `PAGE_BREAK` (`extraction.py:56`) verbatim.

### API style note

`_build_code()` prints property style (`document.settings.ai_processing_settings`) while
`_run_vision` uses getter style (`doc.get_settings()`). This snippet mirrors **`_run_vision`**,
because that is the path proven to execute. Whether structured's printed style actually runs
was not verified and is out of scope here.

---

## Frontend

- `OcrResult` gains `code?: string` — **optional deliberately**, matching `StructuredResults`,
  because the frontend response type is a claim about the backend rather than a check on it.
- `OcrResults.tsx`: Code joins both segment lists; renders `<pre className="mono">`.
- Fallback when `code` is absent: a `#`-prefixed placeholder. Structured's fallback uses
  `//`, which is not Python — worth fixing in passing.
- Copy/Download row: the `StructuredResults` pattern, per decision 5.

---

## Testing

**Backend**

- `compile()` the output on both branches. This is the rule from `_build_code`'s fix rounds —
  string-matching the snippet is what let the undefined-`SCHEMA` bug through.
- Assert every referenced name is bound (the `NameError` class of bug).
- Assert `languages`, `table_detection` and `output_format` are each reflected in the output.
- The key-set parity test already exists and extends for free.

**Frontend**

- Code segment present in **both** modes.
- Renders the snippet.
- Degrades to the placeholder when `code` is absent.

**Live**

Against the backend on 8080, both output formats, and **at minimum one single-page scan** —
that is the `paths or ["page.jpg"]` fallback, and it is the branch most likely to be wrong.

Baselines to beat: frontend 310 tests / 34 files; backend pure subset 77 in ~1s. Run
`tsc --noEmit` separately — a green vitest run is not evidence for a type change.

---

## Where this was in the process

Brainstorming was at step 5 of 9 (write the design doc) when the session was interrupted by a
terminal rendering problem. Design approved in full 2026-08-07, including decision 5. Next:
the `writing-plans` skill produces the implementation plan. Two repos, so two PRs —
`python-fast-api` first, since the frontend needs the `code` field to exist.
