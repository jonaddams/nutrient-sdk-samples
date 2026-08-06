# Adaptive OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the `adaptive_ocr` rail entry in the extraction studio with a configurable options panel, a Run button, and a results display including confidence-tinted region overlay.

**Architecture:** Extend the existing `POST /api/extraction/ocr` with three verified option parameters guarded by a server-side allowlist, carry page dimensions through so element bounds normalise to the same fractional `Citation` shape structured extraction already uses, then add `OcrConfig`/`OcrResults` panels that `page.tsx` selects on its existing `feature` state.

**Tech Stack:** FastAPI + `nutrient-sdk` 1.0.9 (backend, `~/SE/code/python-fast-api`); Next.js App Router + React + TypeScript + vitest + Biome (frontend, this repo).

**Design spec:** `docs/specs/2026-08-06-adaptive-ocr-design.md` — read it first.

## Global Constraints

- **Two repositories.** Tasks 1–3 are in `~/SE/code/python-fast-api`. Tasks 4–8 are in this repo. They ship as two PRs.
- **`VisionFeatures` stays `VisionFeatures.ALL`.** Narrowing it breaks `extract_content()` with error 3024 (SDK-041 / NAPY-20).
- **Exactly three options get controls:** `languages`, `table_detection`, `output_format`. `favor_accuracy`, `enable_preprocessing`, `enable_skew_detection` and `WordsDetectionSettings.confidence_threshold` are **verified no-ops** and must get no parameter and no control.
- **Language codes join with `+` only.** The twenty verified codes: `eng deu fra spa ita por nld swe dan pol rus jpn kor chi_sim chi_tra ara heb hin tur ell`. Any other separator returns an empty document silently.
- **Backend test command:** `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest <path> -v`. Do **not** run the full suite: it takes ~7 minutes and makes real provider calls.
- **`-k "not extract"` silently deselects whole files.** pytest matches `-k` against the module name too, so any filter containing `not extract` drops every test in `tests/test_extraction_geometry.py` and `tests/test_extraction.py`. A run can report `48 passed, 17 deselected` and look green while never executing the tests you just wrote. Run new geometry/extraction test files UNFILTERED, in their own command.
- **Frontend test command:** `export PATH="$HOME/Library/pnpm/bin:$PATH"` first (pnpm is missing from non-interactive shells), then `pnpm exec vitest run <path>`.
- **Frontend baseline before starting:** 273 tests / 31 files. `app/globals.css` reports 2 Biome errors / 8 warnings and always has; `styles.css` carries 8 `noDescendingSpecificity` warnings. Neither is yours.
- **CSS source-order trap:** every rule in `app/python-sdk/extraction-studio/styles.css` is scoped under `.studio-shell` with identical specificity, so **source order alone decides**. The `@media (max-width: 1024px)` block must remain the LAST rules for its selectors.
- **Verify the served bundle, not the source.** A `styles.css` or `globals.css` edit the dev server did not recompile will silently serve stale CSS, and the chunk hash does not change. `curl` the served chunk and grep it.

---

## File Structure

**Backend (`~/SE/code/python-fast-api`)**

| File | Responsibility |
|---|---|
| `app/services/geometry.py` | **new** — `normalize_bbox()`, shared by structured and OCR |
| `app/services/structured.py` | imports `normalize_bbox` from geometry instead of defining it |
| `app/services/ocr_options.py` | **new** — the language/format allowlists and their validation, one source for listing and validating |
| `app/services/extraction.py` | carries page `metadata` through merge and format; emits `pages` and per-element `citation` |
| `app/routers/extraction.py` | `/ocr` gains three Form params and maps validation errors to 400 |
| `tests/test_ocr_options.py` | **new** — allowlist tests, pure |
| `tests/test_extraction_geometry.py` | **new** — normalisation and metadata passthrough, pure |

**Frontend (this repo)**

| File | Responsibility |
|---|---|
| `app/python-sdk/extraction-studio/lib/ocr.ts` | **new** — `OcrResult` types, `OCR_LANGUAGES`, `extractOcr()` |
| `app/python-sdk/extraction-studio/lib/citations.ts` | `IndexedCitation` gains optional per-citation `hex` |
| `app/python-sdk/extraction-studio/_components/useCitationAnnotations.ts` | paints `citation.hex ?? citationHex` |
| `app/python-sdk/extraction-studio/_components/OcrConfig.tsx` | **new** — the three controls |
| `app/python-sdk/extraction-studio/_components/OcrResults.tsx` | **new** — meta row, four views, element table |
| `app/python-sdk/extraction-studio/_components/FeatureRail.tsx` | `adaptive_ocr` → `enabled: true` |
| `app/python-sdk/extraction-studio/page.tsx` | feature-keyed panels; clears results on feature change |
| `app/python-sdk/extraction-studio/styles.css` | `.lang-chip`, `.ocr-*` rules — inserted **before** the responsive block |

---

## Task 1: Share `normalize_bbox`

`normalize_bbox()` lives in `structured.py`; OCR needs the same conversion. Importing service-to-service in that direction is wrong, so it moves to a module both own.

**Files:**
- Create: `app/services/geometry.py`
- Create: `tests/test_extraction_geometry.py`
- Modify: `app/services/structured.py` (delete the function, import it)

**Interfaces:**
- Consumes: nothing.
- Produces: `normalize_bbox(raw: dict, page_w: float, page_h: float) -> dict` returning `{"x0","y0","x1","y1"}` floats clamped to 0..1. Tasks 2 and 3 use it.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_extraction_geometry.py
import pytest

from app.services.geometry import normalize_bbox


def test_converts_raster_pixels_to_fractional_coordinates():
    box = normalize_bbox({"x": 827, "y": 1169, "width": 827, "height": 1169}, 1654, 2338)
    assert box == {"x0": 0.5, "y0": 0.5, "x1": 1.0, "y1": 1.0}


def test_clamps_overflowing_boxes_into_range():
    # OCR bounds can exceed the raster by a pixel or two; a citation outside
    # 0..1 would place an annotation off the page rather than at its edge.
    box = normalize_bbox({"x": -10, "y": -10, "width": 5000, "height": 5000}, 100, 100)
    assert box == {"x0": 0.0, "y0": 0.0, "x1": 1.0, "y1": 1.0}


def test_rejects_non_positive_page_dimensions():
    # Dividing by a zero page dimension would yield inf/nan and paint nothing,
    # which is harder to diagnose than a raised error.
    with pytest.raises(ValueError):
        normalize_bbox({"x": 0, "y": 0, "width": 1, "height": 1}, 0, 100)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/test_extraction_geometry.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.geometry'`

- [ ] **Step 3: Create the module**

```python
# app/services/geometry.py
"""Bounding-box conversion shared by the structured and OCR extraction paths.

Lived in structured.py until 2026-08-06. OCR needs the identical conversion to
produce citations the studio's existing overlay can draw, and importing it from
structured.py would make the OCR path depend on an unrelated service.
"""


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def normalize_bbox(raw: dict, page_w: float, page_h: float) -> dict:
    """Convert a raw SDK bbox {x, y, width, height} (raster pixels, origin
    top-left; the 'unit' field is unreliable and ignored) to fractional page
    coords in 0..1, where page_w/page_h are the raster px dims for that page."""
    if page_w <= 0 or page_h <= 0:
        raise ValueError("page dimensions must be positive")
    x, y = float(raw["x"]), float(raw["y"])
    right, bottom = x + float(raw["width"]), y + float(raw["height"])
    return {
        "x0": _clamp01(x / page_w),
        "y0": _clamp01(y / page_h),
        "x1": _clamp01(right / page_w),
        "y1": _clamp01(bottom / page_h),
    }
```

- [ ] **Step 4: Point structured.py at it**

In `app/services/structured.py`, delete the `_clamp01` and `normalize_bbox` definitions and add to the imports:

```python
from app.services.geometry import normalize_bbox
```

- [ ] **Step 5: Run both test files to verify nothing regressed**

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/test_extraction_geometry.py -q && .venv/bin/python -m pytest tests/test_structured.py -q -k "not live and not endpoint and not extract"`
Expected: `3 passed` then `48 passed`.

**Two commands, deliberately.** `-k "not extract"` matches the MODULE name as well
as test names, so `tests/test_extraction_geometry.py` — which contains "extract" —
is silently deselected by that filter. A combined run reports `48 passed, 17
deselected` and looks green while never executing the new tests. Verified
2026-08-06. Keep the geometry run unfiltered and separate.

- [ ] **Step 6: Commit**

```bash
cd ~/SE/code/python-fast-api
git add app/services/geometry.py app/services/structured.py tests/test_extraction_geometry.py
git commit -m "refactor(extraction): share normalize_bbox between structured and OCR"
```

---

## Task 2: Carry page dimensions through, and emit citations

`merge_element_pages()` returns `{"elements": [...]}` and drops the `metadata` array that carries page dimensions. `_format_extraction_result()` then has no way to normalise bounds. Both change.

**Files:**
- Modify: `app/services/extraction.py` — `merge_element_pages`, `_format_extraction_result`
- Modify: `tests/test_extraction_geometry.py`

**Interfaces:**
- Consumes: `normalize_bbox` from Task 1.
- Produces: the `/ocr` response gains `pages: [{"page": int, "width": float, "height": float}]`, and each entry in `textElements` gains `page: int` (0-based) and `citation: {"page","x0","y0","x1","y1"} | None`. Task 4 types these.

- [ ] **Step 1: Write the failing test**

```python
# append to tests/test_extraction_geometry.py
import json

from app.services.extraction import _format_extraction_result, merge_element_pages

RAW_PAGE = json.dumps(
    {
        "metadata": [{"pageNumber": 1, "width": 1654, "height": 2338, "dpiX": 96, "dpiY": 96}],
        "elements": [
            {
                "type": "paragraph",
                "text": "Invoice",
                "readingOrder": 0,
                "pageNumber": 1,
                "confidence": 0.95,
                "bounds": {"x": 827, "y": 1169, "width": 827, "height": 1169},
                "words": [
                    {
                        "text": "Invoice",
                        "confidence": 0.9503,
                        "bounds": {"x": 827, "y": 1169, "width": 100, "height": 50},
                    }
                ],
            }
        ],
    }
)


def test_merge_preserves_page_dimensions():
    # Without this the OCR path has no way to normalise bounds, because each
    # per-page Vision call reports its own metadata and merge dropped it.
    merged = merge_element_pages([RAW_PAGE, RAW_PAGE])
    assert merged["pages"] == [
        {"page": 1, "width": 1654, "height": 2338},
        {"page": 2, "width": 1654, "height": 2338},
    ]
    assert len(merged["elements"]) == 2


def test_format_emits_a_fractional_citation_per_element():
    merged = merge_element_pages([RAW_PAGE])
    result = _format_extraction_result(merged, "scan.pdf", "ADAPTIVE_OCR")
    element = result["textElements"][0]
    assert element["page"] == 0  # 0-based, as the viewer expects
    assert element["citation"] == {"page": 0, "x0": 0.5, "y0": 0.5, "x1": 1.0, "y1": 1.0}
    assert result["pages"] == [{"page": 1, "width": 1654, "height": 2338}]


def test_format_tolerates_missing_page_dimensions():
    # A payload with no metadata must still return elements, just uncited —
    # dropping the text because geometry is unavailable would be worse.
    merged = {"elements": json.loads(RAW_PAGE)["elements"], "pages": []}
    result = _format_extraction_result(merged, "scan.pdf", "ADAPTIVE_OCR")
    assert result["textElements"][0]["citation"] is None
    assert result["textElements"][0]["text"] == "Invoice"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/test_extraction_geometry.py -v`
Expected: FAIL — `KeyError: 'pages'` from `merge_element_pages`.

- [ ] **Step 3: Preserve metadata in the merge**

In `app/services/extraction.py`, replace the body of `merge_element_pages` with:

```python
    merged: list[dict] = []
    pages: list[dict] = []
    next_order = 0
    for page_idx, raw in enumerate(raw_jsons, start=1):
        payload = json.loads(raw)

        # Page dimensions travel in a top-level `metadata` array. They are the
        # only way to convert raster-pixel bounds into the fractional citation
        # coords the viewer draws, so they must survive the merge. Each
        # per-page call reports pageNumber=1, so the index is authoritative.
        for meta in payload.get("metadata", []) or []:
            width, height = meta.get("width"), meta.get("height")
            if width and height:
                pages.append({"page": page_idx, "width": width, "height": height})

        elements = payload.get("elements", [])
        elements.sort(key=lambda e: e.get("readingOrder", 0))
        for el in elements:
            el["pageNumber"] = page_idx
            el["readingOrder"] = next_order
            next_order += 1
            merged.append(el)
    return {"elements": merged, "pages": pages}
```

- [ ] **Step 4: Emit citations in the formatter**

In `_format_extraction_result`, add near the top (after `elements = merged.get("elements", [])`):

```python
    pages = merged.get("pages", []) or []
    page_dims = {p["page"]: (p["width"], p["height"]) for p in pages}
```

Then, immediately before `summary["bounds"] = element.get("bounds")`, insert:

```python
        # 0-based page and a fractional citation, matching exactly what
        # /structured returns — that is what lets the studio's existing overlay
        # draw OCR regions with no new drawing code.
        page_1 = element.get("pageNumber")
        summary["page"] = (page_1 - 1) if isinstance(page_1, int) else None
        bounds = element.get("bounds")
        citation = None
        if bounds and page_1 in page_dims:
            w, h = page_dims[page_1]
            citation = {"page": summary["page"], **normalize_bbox(bounds, w, h)}
        summary["citation"] = citation
```

Add `"pages": pages,` to the returned dict, and add the import:

```python
from app.services.geometry import normalize_bbox
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/test_extraction_geometry.py -v`
Expected: PASS — 6 tests.

- [ ] **Step 6: Check no other caller broke**

`merge_element_pages` is shared with the ICR/VLM/tables paths, which now receive an extra `pages` key they ignore.

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/ --ignore=tests/sdk -q -k "not live and not endpoint and not extract and not vlm and not describe and not markdown and not tables and not ocr and not icr and not fields"`
Expected: PASS — 50 passed, 1 xfailed (the pre-change baseline).

Note this filter also deselects `tests/test_extraction_geometry.py` and
`tests/test_extraction.py`, because `not extract` matches their module names. That
is fine HERE — this step exists to prove the other services still work — but it
means this command alone never proves the geometry tests pass. Step 5 above is
what does that.

- [ ] **Step 7: Commit**

```bash
cd ~/SE/code/python-fast-api
git add app/services/extraction.py tests/test_extraction_geometry.py
git commit -m "feat(extraction): carry page dimensions through and emit fractional citations"
```

---

## Task 3: OCR options with a shared allowlist

**Files:**
- Create: `app/services/ocr_options.py`
- Create: `tests/test_ocr_options.py`
- Modify: `app/services/extraction.py` — `extract_text_ocr`, `_extract_with_engine`, `_run_with_prerender`, `_run_vision`
- Modify: `app/routers/extraction.py` — the `/ocr` endpoint

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `OCR_LANGUAGES: tuple[str, ...]` — the twenty verified codes
  - `OCR_OUTPUT_FORMATS: tuple[str, ...]` — `("json", "markdown")`
  - `UnsupportedOcrOption(ValueError)`
  - `validate_ocr_options(languages: str, output_format: str) -> dict` returning `{"languages": str, "outputFormat": str}`, raising `UnsupportedOcrOption`
  - `extract_text_ocr(image_bytes, original_filename, *, languages="eng", table_detection=True, output_format="json") -> dict`, whose result carries `config` and `timingMs`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ocr_options.py
import pytest

from app.services.ocr_options import (
    OCR_LANGUAGES,
    UnsupportedOcrOption,
    validate_ocr_options,
)


def test_accepts_every_verified_language_code():
    # All twenty were confirmed against the SDK on 2026-08-06; the picker in the
    # studio offers exactly this set.
    for code in OCR_LANGUAGES:
        assert validate_ocr_options(code, "json")["languages"] == code


def test_accepts_plus_joined_combinations():
    assert validate_ocr_options("eng+deu+fra", "json")["languages"] == "eng+deu+fra"


@pytest.mark.parametrize("bad", ["eng,deu", "eng;deu", "eng|deu", "eng deu", "en,de"])
def test_rejects_the_separators_that_silently_return_nothing(bad):
    # THE reason this allowlist exists. Every one of these makes the SDK return
    # 154 chars / 0 elements with no exception, so a typo reads as a blank page.
    # These are regressions against observed behaviour, not invented cases.
    with pytest.raises(UnsupportedOcrOption, match="language"):
        validate_ocr_options(bad, "json")


def test_rejects_an_unknown_code_naming_the_offender():
    with pytest.raises(UnsupportedOcrOption, match="klingon"):
        validate_ocr_options("eng+klingon", "json")


def test_rejects_an_empty_language_string():
    with pytest.raises(UnsupportedOcrOption):
        validate_ocr_options("", "json")


def test_rejects_an_unknown_output_format():
    with pytest.raises(UnsupportedOcrOption, match="output format"):
        validate_ocr_options("eng", "pdf")


def test_the_listed_codes_are_exactly_the_validated_ones():
    # Listing and validation must be one source. The Bedrock work shipped a bug
    # where available_providers() and the validator disagreed about the same env
    # var (fixed in python-fast-api#33); this asserts the shape that prevents it.
    for code in OCR_LANGUAGES:
        assert validate_ocr_options(code, "json")
    assert "klingon" not in OCR_LANGUAGES
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/test_ocr_options.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.ocr_options'`

- [ ] **Step 3: Write the module**

```python
# app/services/ocr_options.py
"""Adaptive OCR option validation.

ONE source for both listing and validating. The Bedrock work shipped a bug where
available_providers() read an env var raw while the validator stripped it, so the
dropdown offered a provider the request then rejected (python-fast-api#33). The
studio's language picker is built from OCR_LANGUAGES and the request is checked
against OCR_LANGUAGES, so they cannot disagree.

Why an allowlist at all: `OcrSettings.set_default_languages` accepts ONLY '+' as
a separator. Given "eng,deu" — the obvious first guess — the SDK returns 154
chars and zero elements, silently, raising nothing. A caller concludes the page
was blank. Verified 2026-08-06 across two documents; also true of ';', '|', a
space, and two-letter codes.
"""

# Verified accepted by the SDK on 2026-08-06 against
# public/documents/input_ocr_multiple_languages.png. Order is the order the
# studio offers them: the Latin-script languages a demo is most likely to want
# first, then the other scripts.
OCR_LANGUAGES: tuple[str, ...] = (
    "eng", "deu", "fra", "spa", "ita", "por", "nld", "swe", "dan", "pol",
    "tur", "ell", "rus", "jpn", "kor", "chi_sim", "chi_tra", "ara", "heb", "hin",
)

OCR_OUTPUT_FORMATS: tuple[str, ...] = ("json", "markdown")

# The separator is '+', per the SDK's own get_default_languages() default of
# 'eng' and the live probe. Do not make this configurable.
LANGUAGE_SEPARATOR = "+"


class UnsupportedOcrOption(ValueError):
    """A caller asked for an option the OCR path does not offer. Mapped to 400."""


def validate_ocr_options(languages: str, output_format: str) -> dict:
    """Return the normalised options, or raise UnsupportedOcrOption."""
    if output_format not in OCR_OUTPUT_FORMATS:
        raise UnsupportedOcrOption(
            f"unsupported output format {output_format!r}; "
            f"expected one of {', '.join(OCR_OUTPUT_FORMATS)}"
        )

    codes = [c for c in languages.split(LANGUAGE_SEPARATOR)]
    if not languages or any(not c for c in codes):
        raise UnsupportedOcrOption(
            "languages must be one or more codes joined with "
            f"{LANGUAGE_SEPARATOR!r}, e.g. 'eng' or 'eng+deu'"
        )
    for code in codes:
        if code not in OCR_LANGUAGES:
            raise UnsupportedOcrOption(
                f"unsupported language code {code!r}; expected one of "
                f"{', '.join(OCR_LANGUAGES)} joined with {LANGUAGE_SEPARATOR!r}. "
                "Note that a comma or space produces an EMPTY result from the "
                "SDK rather than an error, which is why this is rejected here."
            )
    return {"languages": languages, "outputFormat": output_format}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/SE/code/python-fast-api && .venv/bin/python -m pytest tests/test_ocr_options.py -v`
Expected: PASS — 11 tests (7 plus 5 parametrised minus overlap; the exact count is 11).

- [ ] **Step 5: Thread the options through the service**

In `app/services/extraction.py`:

Change `_run_vision`'s signature to add two keyword params and apply them:

```python
def _run_vision(
    path: str,
    engine: str,
    *,
    provider: str | None = None,
    features: int | None = None,
    output_format: VisionOutputFormat | None = None,
    languages: str | None = None,
    table_detection: bool | None = None,
) -> str:
```

Immediately after `vs.set_features(...)`, add:

```python
        # Only these two OCR settings measurably change the output. favor_accuracy,
        # enable_preprocessing, enable_skew_detection and the words-detection
        # confidence threshold were all byte-identical on two documents on
        # 2026-08-06 — do not add controls for them.
        if languages is not None:
            s.get_ocr_settings().set_default_languages(languages)
        if table_detection is not None:
            s.get_ocr_settings().set_enable_table_detection(table_detection)
```

Add the same two keyword params to `_run_with_prerender` and forward them to `_run_vision`, and to `_extract_with_engine`, forwarding to `_run_with_prerender`.

Replace `extract_text_ocr` with:

```python
def extract_text_ocr(
    image_bytes: bytes,
    original_filename: str,
    *,
    languages: str = "eng",
    table_detection: bool = True,
    output_format: str = "json",
) -> dict:
    """Adaptive OCR. Runs entirely locally — no provider, no API key, no network."""
    import time

    from app.services.ocr_options import validate_ocr_options

    echo = validate_ocr_options(languages, output_format)
    start = time.perf_counter()
    if echo["outputFormat"] == "markdown":
        md, total_pages, processed_pages = _run_with_prerender(
            image_bytes,
            original_filename,
            "OCR",
            output_format=VisionOutputFormat.MARKDOWN,
            languages=languages,
            table_detection=table_detection,
        )
        result: dict = {
            "engine": "ADAPTIVE_OCR",
            "filename": original_filename,
            "markdown": md,
            "totalPages": total_pages,
            "processedPages": processed_pages,
        }
    else:
        result = _extract_with_engine(
            image_bytes,
            original_filename,
            "OCR",
            languages=languages,
            table_detection=table_detection,
        )
    result["config"] = {**echo, "tableDetection": table_detection}
    result["timingMs"] = int((time.perf_counter() - start) * 1000)
    return result
```

- [ ] **Step 6: Wire the endpoint**

In `app/routers/extraction.py`, replace the `/ocr` endpoint:

```python
@router.post("/ocr")
async def ocr(
    file: UploadFile = File(...),
    languages: str = Form(
        "eng",
        description="One or more codes joined with '+', e.g. 'eng' or 'eng+deu'. "
        "A comma or space makes the SDK return an EMPTY document, so anything "
        "outside the allowlist is rejected here with a 400.",
    ),
    table_detection: bool = Form(True, description="Detect tables as structured elements."),
    output_format: str = Form("json", description="'json' (elements) or 'markdown'."),
):
    try:
        data = await file.read()
        return extract_text_ocr(
            data,
            file.filename or "input",
            languages=languages,
            table_detection=table_detection,
            output_format=output_format,
        )
    except UnsupportedOcrOption as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Add to the imports at the top of the router:

```python
from app.services.ocr_options import UnsupportedOcrOption
```

- [ ] **Step 7: Verify against a real document**

```bash
cd ~/SE/code/python-fast-api
.venv/bin/uvicorn app.main:app --port 8080 &
sleep 6
D=~/SE/code/nutrient-sdk-samples/public/documents/scanned-invoice.pdf
# happy path — expect 200, a citation on the first element, and config echoed
curl -s -X POST http://localhost:8080/api/extraction/ocr \
  -F "file=@$D" -F "languages=eng+deu" -F "table_detection=true" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('config', d['config']); print('pages', d['pages']); print('first citation', d['textElements'][0]['citation']); print('timingMs', d['timingMs'])"
# the silent-empty separator — expect 400, not an empty document
curl -s -o /dev/null -w "eng,deu -> %{http_code}\n" -X POST \
  http://localhost:8080/api/extraction/ocr -F "file=@$D" -F "languages=eng,deu"
pkill -f "uvicorn app.main:app"
```

Expected: first call prints a config echo, a `pages` array with width/height, a fractional citation with all four coords in 0..1, and a timing; second call prints `eng,deu -> 400`.

- [ ] **Step 8: Commit**

```bash
cd ~/SE/code/python-fast-api
git add app/services/ocr_options.py app/services/extraction.py app/routers/extraction.py tests/test_ocr_options.py
git commit -m "feat(extraction): configurable Adaptive OCR with a language allowlist"
```

---

## Task 4: Frontend OCR client and types

**Files:**
- Create: `app/python-sdk/extraction-studio/lib/ocr.ts`
- Create: `app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts`

**Interfaces:**
- Consumes: the `/ocr` response from Task 3.
- Produces:
  - `OCR_LANGUAGES: readonly string[]` (mirrors the backend list, same order)
  - `type OcrWord = { text: string; confidence: number }`
  - `type OcrElement = { readingOrder: number; type: string; role?: string; text: string; confidence: number; page: number | null; citation: Citation | null; words?: OcrWord[] }`
  - `type OcrResult = { engine: string; filename: string; statistics: { totalElements: number; textElements: number; averageConfidence: number; lowConfidenceElements: number }; fullText: string; textElements: OcrElement[]; pages: { page: number; width: number; height: number }[]; markdown?: string; config: { languages: string; outputFormat: string; tableDetection: boolean }; timingMs: number }`
  - `type OcrRequest = { docPath: string; filename: string; languages: string[]; tableDetection: boolean; outputFormat: "json" | "markdown" }`
  - `extractOcr(req: OcrRequest): Promise<OcrResult>`

Tasks 6, 7 and 8 use these.

- [ ] **Step 1: Write the failing test**

```ts
// app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts
import { afterEach, expect, test, vi } from "vitest";
import { extractOcr, OCR_LANGUAGES } from "../ocr";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const RESULT = {
  engine: "ADAPTIVE_OCR",
  filename: "scan.pdf",
  statistics: {
    totalElements: 1,
    textElements: 1,
    averageConfidence: 0.95,
    lowConfidenceElements: 0,
  },
  fullText: "[0] Invoice",
  textElements: [
    {
      readingOrder: 0,
      type: "paragraph",
      text: "Invoice",
      confidence: 0.95,
      page: 0,
      citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
    },
  ],
  pages: [{ page: 1, width: 1654, height: 2338 }],
  config: { languages: "eng", outputFormat: "json", tableDetection: true },
  timingMs: 812,
};

function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const calls: { url: string; body?: BodyInit | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ?? null });
      if (String(url).startsWith("/")) {
        return { ok: true, blob: async () => new Blob(["pdf"]) } as unknown as Response;
      }
      return response as Response;
    }) as unknown as typeof fetch,
  );
  return calls;
}

test("offers exactly the twenty verified language codes", () => {
  // Must mirror the backend allowlist. A code here that the backend rejects
  // would 400 on Run; one missing is a capability silently hidden.
  expect(OCR_LANGUAGES).toHaveLength(20);
  expect(OCR_LANGUAGES[0]).toBe("eng");
  expect(OCR_LANGUAGES).toContain("chi_sim");
});

test("joins selected languages with '+'", async () => {
  // A comma makes the SDK return an empty document; the backend rejects it, but
  // the client must never produce it in the first place.
  const calls = stubFetch({ ok: true, json: async () => RESULT });
  await extractOcr({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: ["eng", "deu"],
    tableDetection: true,
    outputFormat: "json",
  });
  const post = calls.find((c) => c.url.includes("/api/extraction/ocr"));
  const form = post?.body as FormData;
  expect(form.get("languages")).toBe("eng+deu");
});

test("sends table detection and output format", async () => {
  const calls = stubFetch({ ok: true, json: async () => RESULT });
  await extractOcr({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: ["eng"],
    tableDetection: false,
    outputFormat: "markdown",
  });
  const form = (calls.find((c) => c.url.includes("/api/extraction/ocr"))
    ?.body as FormData);
  expect(form.get("table_detection")).toBe("false");
  expect(form.get("output_format")).toBe("markdown");
});

test("defaults to eng when nothing is selected", async () => {
  // An empty languages string is a 400. Falling back to the SDK's own default
  // keeps an empty picker usable rather than an error.
  const calls = stubFetch({ ok: true, json: async () => RESULT });
  await extractOcr({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: [],
    tableDetection: true,
    outputFormat: "json",
  });
  const form = (calls.find((c) => c.url.includes("/api/extraction/ocr"))
    ?.body as FormData);
  expect(form.get("languages")).toBe("eng");
});

test("surfaces the backend's detail message", async () => {
  // The allowlist 400 names the offending code; a generic "500" would hide it.
  stubFetch({
    ok: false,
    status: 400,
    json: async () => ({ detail: "unsupported language code 'klingon'" }),
  });
  await expect(
    extractOcr({
      docPath: "/documents/scan.pdf",
      filename: "scan.pdf",
      languages: ["eng"],
      tableDetection: true,
      outputFormat: "json",
    }),
  ).rejects.toThrow("klingon");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts`
Expected: FAIL — cannot resolve `../ocr`.

- [ ] **Step 3: Write the module**

```ts
// app/python-sdk/extraction-studio/lib/ocr.ts
import { API_BASE } from "./api";
import type { Citation } from "./api";

/**
 * Adaptive OCR — runs entirely on the backend machine. No provider, no API key,
 * no network call, so unlike the LM Studio provider this works on the hosted
 * deployment too.
 */

/** Mirrors OCR_LANGUAGES in the backend's app/services/ocr_options.py, in the
 *  same order. Verified accepted by the SDK 2026-08-06. Adding a code here that
 *  the backend does not know earns a 400 on Run. */
export const OCR_LANGUAGES = [
  "eng", "deu", "fra", "spa", "ita", "por", "nld", "swe", "dan", "pol",
  "tur", "ell", "rus", "jpn", "kor", "chi_sim", "chi_tra", "ara", "heb", "hin",
] as const;

/** The ONLY separator the SDK accepts. A comma, semicolon, pipe or space makes
 *  it return an empty document silently rather than raising. */
const LANGUAGE_SEPARATOR = "+";

export type OcrWord = { text: string; confidence: number };

export type OcrElement = {
  readingOrder: number;
  type: string;
  role?: string;
  text: string;
  confidence: number;
  /** 0-based, matching the viewer. */
  page: number | null;
  /** Same fractional shape /structured returns, so the existing overlay draws it. */
  citation: Citation | null;
  words?: OcrWord[];
};

export type OcrResult = {
  engine: string;
  filename: string;
  statistics: {
    totalElements: number;
    textElements: number;
    averageConfidence: number;
    lowConfidenceElements: number;
  };
  fullText: string;
  textElements: OcrElement[];
  pages: { page: number; width: number; height: number }[];
  /** Present only when outputFormat was "markdown". */
  markdown?: string;
  config: { languages: string; outputFormat: string; tableDetection: boolean };
  timingMs: number;
};

export type OcrRequest = {
  docPath: string;
  filename: string;
  languages: string[];
  tableDetection: boolean;
  outputFormat: "json" | "markdown";
};

export async function extractOcr(req: OcrRequest): Promise<OcrResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));
  // Falls back to the SDK's own default rather than sending an empty string,
  // which the backend allowlist rejects — an empty picker stays usable.
  form.append(
    "languages",
    req.languages.length ? req.languages.join(LANGUAGE_SEPARATOR) : "eng",
  );
  form.append("table_detection", String(req.tableDetection));
  form.append("output_format", req.outputFormat);

  const resp = await fetch(`${API_BASE}/api/extraction/ocr`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    // The allowlist 400 names the offending code; surfacing it is the whole
    // point of validating server-side instead of returning a blank page.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `OCR failed: ${resp.status}`);
  }
  return (await resp.json()) as OcrResult;
}
```

`Citation` is already exported from `lib/api.ts` (line 1), so no change is needed there.

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/python-sdk/extraction-studio/lib/ocr.ts app/python-sdk/extraction-studio/lib/__tests__/ocr.test.ts app/python-sdk/extraction-studio/lib/api.ts
git commit -m "feat(extraction-studio): OCR client and result types"
```

---

## Task 5: Per-citation colour in the overlay

Confidence tinting needs each box to carry its own colour. `PaintedStyle` already includes `hex`, so `diffStyles` detects per-annotation changes correctly — the change is only where the hex comes from.

**Files:**
- Modify: `app/python-sdk/extraction-studio/lib/citations.ts`
- Modify: `app/python-sdk/extraction-studio/_components/useCitationAnnotations.ts`
- Modify: `app/python-sdk/extraction-studio/_components/__tests__/` — add a test file if one exists for citations, else `lib/__tests__/citations.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `IndexedCitation` — which is `{ fieldIndex: number; citation: Citation }`, a WRAPPER, not a flattened citation — gains `hex?: string`. When set it wins over the component-level `citationHex`. Task 8 supplies it.

**Read before editing:** the four invariants documented at the top of `useCitationAnnotations.ts`. In particular **invariant 4** — anything affecting appearance must be part of `PaintedStyle`, which `hex` already is. Do **not** add a "restyle everything" bypass, and do not make `enqueue` return a value.

- [ ] **Step 1: Write the failing test**

```ts
// app/python-sdk/extraction-studio/lib/__tests__/citations.test.ts
// (append to the existing file if one is already there)
import { expect, test } from "vitest";
import { diffStyles, type PaintedStyle } from "../citations";

test("a per-citation colour change registers as a diff", () => {
  // Invariant 4: anything affecting appearance must be inside PaintedStyle, or
  // diffStyles reports no change and the boxes never repaint — which is exactly
  // how the colour picker once looked dead.
  const before = new Map<number, PaintedStyle>([[0, { style: "idle", hex: "#22c55e" }]]);
  const after = new Map<number, PaintedStyle>([[0, { style: "idle", hex: "#ef4444" }]]);
  expect(diffStyles(before, after).length).toBe(1);
});

test("an unchanged per-citation colour is not a diff", () => {
  const same = (): Map<number, PaintedStyle> =>
    new Map([[0, { style: "idle", hex: "#22c55e" }]]);
  expect(diffStyles(same(), same()).length).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/lib/__tests__/citations.test.ts`
Expected: PASS — `hex` is already part of `PaintedStyle`, so this documents the invariant the next step relies on. If it FAILS, stop: `PaintedStyle` does not contain `hex` and the plan's assumption is wrong.

- [ ] **Step 3: Add the optional per-citation hex**

In `lib/citations.ts`, add to the `IndexedCitation` type:

```ts
  /** Overrides the component-level citationHex for THIS box only. Used by OCR to
   *  tint each region by its confidence. Absent for structured extraction, where
   *  one user-chosen colour applies to every citation. */
  hex?: string;
```

- [ ] **Step 4: Paint it**

In `useCitationAnnotations.ts`, the restyle loop is around line 97:

```ts
  for (const { fieldIndex } of citations) {
    next.set(fieldIndex, { style: styleFor(fieldIndex, activeIndex), hex });
  }
```

Take the per-citation hex from the entry being iterated:

```ts
  for (const { fieldIndex, hex: ownHex } of citations) {
    next.set(fieldIndex, {
      style: styleFor(fieldIndex, activeIndex),
      // A citation's own hex wins. OCR gives every region a confidence colour;
      // structured extraction sets none and falls back to the picker's value.
      hex: ownHex ?? hex,
    });
  }
```

**Do not write `citations[fieldIndex]?.hex`.** `citations` is a compacted array of
`IndexedCitation` — a field with no citation is absent — so its array positions are
not field indexes. That misalignment is the bug fixed in `77fa9c1`, which is why
`IndexedCitation` carries `fieldIndex` explicitly. Destructuring from the loop
avoids the lookup entirely.

Apply the same `ownHex ?? hex` treatment at the annotation-creation site (the
`for (const entry of citations)` loop around line 280 and the `hex: citationHex`
it passes around line 362), so a box is created with its confidence colour rather
than created in the picker's colour and then repainted.

The dependency arrays already include `citations` and `citationHex`, so no
dependency change is needed — which is the point of routing this through the
existing `PaintedStyle`.

- [ ] **Step 5: Run the studio suite to verify nothing regressed**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio`
Expected: PASS — the existing studio tests plus the 2 new ones.

- [ ] **Step 6: Commit**

```bash
git add app/python-sdk/extraction-studio/lib/citations.ts app/python-sdk/extraction-studio/_components/useCitationAnnotations.ts app/python-sdk/extraction-studio/lib/__tests__/citations.test.ts
git commit -m "feat(extraction-studio): allow a citation to carry its own colour"
```

---

## Task 6: `OcrConfig`

**Files:**
- Create: `app/python-sdk/extraction-studio/_components/OcrConfig.tsx`
- Create: `app/python-sdk/extraction-studio/_components/__tests__/OcrConfig.test.tsx`
- Modify: `app/python-sdk/extraction-studio/styles.css`

**Interfaces:**
- Consumes: `OCR_LANGUAGES`, `OcrRequest` from Task 4.
- Produces: `<OcrConfig docPath={string} filename={string} onRun={(req: OcrRequest) => void} runSignal={number} />`. Task 8 renders it.

- [ ] **Step 1: Write the failing test**

```tsx
// app/python-sdk/extraction-studio/_components/__tests__/OcrConfig.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { OcrConfig } from "../OcrConfig";

const props = {
  docPath: "/documents/scan.pdf",
  filename: "scan.pdf",
  onRun: vi.fn(),
};

test("offers a chip per verified language, with English preselected", () => {
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  expect(screen.getByRole("button", { name: "eng" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "deu" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("mounting with a runSignal does not fire onRun", () => {
  const onRun = vi.fn();
  render(<OcrConfig {...props} onRun={onRun} runSignal={3} />);
  expect(onRun).not.toHaveBeenCalled();
});

test("incrementing runSignal emits the current configuration", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: ["eng"],
    tableDetection: true,
    outputFormat: "json",
  });
});

test("selecting a second language adds it to the request", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "deu" }));
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({ languages: ["eng", "deu"] }),
  );
});

test("deselecting every language is allowed and falls back at the client", () => {
  // The client sends "eng" for an empty selection, so an empty picker must not
  // be blocked here — the fallback lives in one place, in extractOcr.
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "eng" }));
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ languages: [] }));
});

test("table detection and output format are configurable", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  fireEvent.click(screen.getByLabelText("Detect tables"));
  fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({ tableDetection: false, outputFormat: "markdown" }),
  );
});

test("offers no control for the verified no-op options", () => {
  // favor_accuracy, preprocessing, skew detection and the word-confidence
  // threshold were byte-identical on two documents on 2026-08-06. A control
  // that provably does nothing is the Multimodal toggle deleted the same day.
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  for (const label of [
    /favor accuracy/i,
    /preprocessing/i,
    /deskew/i,
    /skew/i,
    /word confidence/i,
  ]) {
    expect(screen.queryByText(label)).toBeNull();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/_components/__tests__/OcrConfig.test.tsx`
Expected: FAIL — cannot resolve `../OcrConfig`.

- [ ] **Step 3: Write the component**

```tsx
// app/python-sdk/extraction-studio/_components/OcrConfig.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { OCR_LANGUAGES, type OcrRequest } from "../lib/ocr";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

/**
 * Adaptive OCR options.
 *
 * THREE controls, because only three of the SDK's OCR settings measurably
 * change the output. favor_accuracy, enable_preprocessing,
 * enable_skew_detection and WordsDetectionSettings.confidence_threshold were
 * byte-identical across both values on two documents (2026-08-06) and get no
 * control — a control a prospect can flip that provably does nothing is the
 * Multimodal toggle that was deleted the same day.
 *
 * No provider select and no readiness gating: OCR runs locally with no
 * credentials, so none of StructuredConfig's fetchProviders machinery applies.
 */
export function OcrConfig({
  docPath,
  filename,
  onRun,
  runSignal,
}: {
  docPath: string;
  filename: string;
  onRun: (req: OcrRequest) => void;
  runSignal: number;
}) {
  const [languages, setLanguages] = useState<string[]>(["eng"]);
  const [tableDetection, setTableDetection] = useState(true);
  const [outputFormat, setOutputFormat] = useState("json");

  // Same signal pattern as StructuredConfig: Run lives in the panel head so it
  // is reachable from the Results tab, so the click arrives as an incrementing
  // number. Skip the initial render — a mount is not a request to run.
  const lastSignal = useRef(runSignal);
  useEffect(() => {
    if (runSignal === lastSignal.current) return;
    lastSignal.current = runSignal;
    onRun({
      docPath,
      filename,
      languages,
      tableDetection,
      outputFormat: outputFormat === "markdown" ? "markdown" : "json",
    });
  }, [runSignal, docPath, filename, languages, tableDetection, outputFormat, onRun]);

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

  return (
    <div>
      <PanelSection title="Recognition">
        <Field
          label="Languages"
          help="Pick the languages actually on the page — naming them correctly raises the confidence scores. Codes are joined with a plus sign, which is the only separator the SDK accepts."
        >
          {/* Chips rather than <select multiple>, which is poor on touch and in
              a narrow panel. aria-pressed carries the state, matching how
              CitationColor's preset swatches already work. */}
          <div className="lang-chips">
            {OCR_LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                className="lang-chip"
                aria-pressed={languages.includes(code)}
                onClick={() => toggleLanguage(code)}
              >
                {code}
              </button>
            ))}
          </div>
        </Field>
      </PanelSection>

      <PanelSection title="Output">
        <Field label="Format" htmlFor="ocr-format" help="Structured elements with positions and confidence, or a Markdown rendering of the page.">
          <Segmented
            options={[
              { label: "Elements", value: "json" },
              { label: "Markdown", value: "markdown" },
            ]}
            value={outputFormat}
            onChange={setOutputFormat}
          />
        </Field>
        <Toggle
          checked={tableDetection}
          onChange={setTableDetection}
          label="Detect tables"
          description="Recognise tables as structured elements. Turning it off returned fewer elements and slightly lower confidence on a table-bearing invoice."
        />
      </PanelSection>
    </div>
  );
}
```

- [ ] **Step 4: Add the chip styles**

In `app/python-sdk/extraction-studio/styles.css`, insert these rules **before** the
`/* ── Rail responsive overrides ─` block — every selector here shares the
`.studio-shell` prefix and therefore the same specificity, so source order alone
decides, and the responsive block must stay last:

```css
/* Language chips. A wrapped row rather than a select: twenty short codes read
   better as a grid, and aria-pressed gives each one an honest toggle state. */
.studio-shell .lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.studio-shell .lang-chip {
  padding: 3px var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--r-1);
  background: var(--surface);
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    color 0.12s var(--ease),
    border-color 0.12s var(--ease),
    background 0.12s var(--ease);
}

.studio-shell .lang-chip:hover {
  color: var(--ink);
  border-color: var(--line-strong);
}

.studio-shell .lang-chip[aria-pressed="true"] {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--ink);
  font-weight: 600;
}

.studio-shell .lang-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/_components/__tests__/OcrConfig.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add app/python-sdk/extraction-studio/_components/OcrConfig.tsx app/python-sdk/extraction-studio/_components/__tests__/OcrConfig.test.tsx app/python-sdk/extraction-studio/styles.css
git commit -m "feat(extraction-studio): OCR configuration panel"
```

---

## Task 7: `OcrResults`

**Files:**
- Create: `app/python-sdk/extraction-studio/_components/OcrResults.tsx`
- Create: `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`
- Modify: `app/python-sdk/extraction-studio/styles.css`

**Interfaces:**
- Consumes: `OcrResult`, `OcrElement` from Task 4.
- Produces:
  - `confidenceTone(n: number): "good" | "partial" | "bad"` — exported for reuse and testing
  - `confidenceHex(n: number): string`
  - `<OcrResults result={OcrResult} activeIndex={number | null} onSelectElement={(i: number) => void} showRegions={boolean} onShowRegionsChange={(v: boolean) => void} />`

Task 8 renders it and derives citations from `result.textElements`.

- [ ] **Step 1: Write the failing test**

```tsx
// app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { OcrResult } from "../../lib/ocr";
import { confidenceTone, OcrResults } from "../OcrResults";

const RESULT: OcrResult = {
  engine: "ADAPTIVE_OCR",
  filename: "scan.pdf",
  statistics: {
    totalElements: 2,
    textElements: 2,
    averageConfidence: 0.9,
    lowConfidenceElements: 1,
  },
  fullText: "[0] Invoice\n[1] Total",
  textElements: [
    {
      readingOrder: 0,
      type: "paragraph",
      text: "Invoice",
      confidence: 0.95,
      page: 0,
      citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
    },
    {
      readingOrder: 1,
      type: "paragraph",
      text: "Total",
      confidence: 0.32,
      page: 0,
      citation: { page: 0, x0: 0.3, y0: 0.3, x1: 0.4, y1: 0.4 },
    },
  ],
  pages: [{ page: 1, width: 1654, height: 2338 }],
  config: { languages: "eng", outputFormat: "json", tableDetection: true },
  timingMs: 812,
};

const props = {
  result: RESULT,
  activeIndex: null,
  onSelectElement: vi.fn(),
  showRegions: true,
  onShowRegionsChange: vi.fn(),
};

test("confidenceTone bands a score into three tones", () => {
  expect(confidenceTone(0.95)).toBe("good");
  expect(confidenceTone(0.6)).toBe("partial");
  expect(confidenceTone(0.2)).toBe("bad");
});

test("shows timing, element count and average confidence", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("0.8s")).toBeInTheDocument();
  expect(screen.getByText(/2 elements/)).toBeInTheDocument();
  expect(screen.getByText(/90%/)).toBeInTheDocument();
});

test("lists every element with its confidence", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("Invoice")).toBeInTheDocument();
  expect(screen.getByText("Total")).toBeInTheDocument();
  expect(screen.getByText("95%")).toBeInTheDocument();
  expect(screen.getByText("32%")).toBeInTheDocument();
});

test("clicking an element selects it", () => {
  const onSelectElement = vi.fn();
  render(<OcrResults {...props} onSelectElement={onSelectElement} />);
  fireEvent.click(screen.getByText("Total"));
  expect(onSelectElement).toHaveBeenCalledWith(1);
});

test("switches to the text view", () => {
  render(<OcrResults {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Text" }));
  expect(screen.getByText(/\[0\] Invoice/)).toBeInTheDocument();
});

test("names an empty result instead of showing a blank table", () => {
  // Silent emptiness is this feature's characteristic failure — a malformed
  // language string returns zero elements with no error — so the UI says so.
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
});

test("shows the markdown view when that format was requested", () => {
  render(
    <OcrResults
      {...props}
      result={{
        ...RESULT,
        markdown: "# Invoice",
        config: { ...RESULT.config, outputFormat: "markdown" },
      }}
    />,
  );
  expect(screen.getByText("# Invoice")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`
Expected: FAIL — cannot resolve `../OcrResults`.

- [ ] **Step 3: Write the component**

```tsx
// app/python-sdk/extraction-studio/_components/OcrResults.tsx
"use client";
import { useState } from "react";
import type { OcrResult } from "../lib/ocr";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

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
 *  This is why OcrResults has no colour picker: a user-chosen colour would
 *  fight the confidence tint. */
export function confidenceHex(n: number): string {
  const tone = confidenceTone(n);
  if (tone === "good") return "#22c55e";
  if (tone === "partial") return "#eab308";
  return "#ef4444";
}

export function OcrResults({
  result,
  activeIndex,
  onSelectElement,
  showRegions,
  onShowRegionsChange,
}: {
  result: OcrResult;
  activeIndex: number | null;
  onSelectElement: (index: number) => void;
  showRegions: boolean;
  onShowRegionsChange: (value: boolean) => void;
}) {
  const [view, setView] = useState("elements");
  const isMarkdown = result.config.outputFormat === "markdown";
  const empty = result.textElements.length === 0 && !result.markdown;

  return (
    <div>
      <div className="results-meta">
        <span className="mono muted">{(result.timingMs / 1000).toFixed(1)}s</span>
        <span className="mono muted">
          {result.statistics.textElements} elements
        </span>
        <span className="mono muted">
          {Math.round(result.statistics.averageConfidence * 100)}% avg confidence
        </span>
        <Toggle
          checked={showRegions}
          onChange={onShowRegionsChange}
          label="Show regions"
        />
      </div>

      {empty ? (
        // Named, never a blank table. A malformed language string makes the SDK
        // return zero elements without raising, so "nothing here" has to be an
        // explicit state or it reads as a broken studio.
        <div className="callout" role="status">
          <span className="callout-label">No text found</span>
          <p>
            OCR completed but found no text in this document. If you selected
            languages, try the ones actually printed on the page.
          </p>
        </div>
      ) : (
        <>
          <Segmented
            options={
              isMarkdown
                ? [
                    { label: "Markdown", value: "markdown" },
                    { label: "JSON", value: "raw" },
                  ]
                : [
                    { label: "Elements", value: "elements" },
                    { label: "Text", value: "text" },
                    { label: "JSON", value: "raw" },
                  ]
            }
            value={isMarkdown ? "markdown" : view}
            onChange={setView}
          />

          {isMarkdown && view !== "raw" ? (
            <pre className="ocr-text mono">{result.markdown}</pre>
          ) : view === "raw" ? (
            <pre className="ocr-text mono">{JSON.stringify(result, null, 2)}</pre>
          ) : view === "text" ? (
            <pre className="ocr-text mono">{result.fullText}</pre>
          ) : (
            <table className="field-table ocr-elements">
              <tbody>
                {result.textElements.map((el, index) => (
                  <tr
                    key={`${el.readingOrder}-${el.text.slice(0, 12)}`}
                    aria-selected={index === activeIndex}
                    onClick={() => onSelectElement(index)}
                  >
                    <td className="mono muted">{el.readingOrder}</td>
                    <td className="mono muted">{el.type}</td>
                    <td>{el.text}</td>
                    <td className="mono">
                      <span
                        className={`match-dot ${confidenceTone(el.confidence)}`}
                        role="img"
                        aria-label={`confidence ${Math.round(el.confidence * 100)}%`}
                      />
                      {Math.round(el.confidence * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the text-block style**

Insert **before** the responsive block in `styles.css`:

```css
/* Extracted text and JSON. Scrolls inside itself so a long document cannot make
   the panel — or the page — scroll horizontally. */
.studio-shell .ocr-text {
  max-height: 420px;
  overflow: auto;
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--bg-elev);
  font-size: var(--text-xs);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.studio-shell .ocr-elements tr {
  cursor: pointer;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add app/python-sdk/extraction-studio/_components/OcrResults.tsx app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx app/python-sdk/extraction-studio/styles.css
git commit -m "feat(extraction-studio): OCR results panel with confidence tones"
```

---

## Task 8: Wire the shell and enable the rail entry

**Files:**
- Modify: `app/python-sdk/extraction-studio/page.tsx`
- Modify: `app/python-sdk/extraction-studio/_components/FeatureRail.tsx`
- Modify: `app/python-sdk/extraction-studio/__tests__/page.test.tsx`
- Modify: `app/python-sdk/extraction-studio/_components/__tests__/FeatureRail.test.tsx`

**Interfaces:**
- Consumes: `OcrConfig` (Task 6), `OcrResults` + `confidenceHex` (Task 7), `extractOcr`/`OcrResult` (Task 4), per-citation `hex` (Task 5).
- Produces: nothing further.

- [ ] **Step 1: Write the failing tests**

```tsx
// append to app/python-sdk/extraction-studio/_components/__tests__/FeatureRail.test.tsx
import { FEATURES } from "../FeatureRail";

test("adaptive OCR is enabled and the other SOON entries are not", () => {
  const byId = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
  expect(byId.structured.enabled).toBe(true);
  expect(byId.adaptive_ocr.enabled).toBe(true);
  for (const id of ["icr", "vlm_icr", "multilingual", "fast_ocr", "text", "describe"]) {
    expect(byId[id].enabled).toBe(false);
  }
});

test("every enabled feature is one the studio can render", () => {
  // Flipping an `enabled` flag without wiring a panel renders an empty shell.
  // This is the guard: enabling a rail entry must fail here until it is wired.
  const RENDERABLE = new Set(["structured", "adaptive_ocr"]);
  for (const f of FEATURES.filter((x) => x.enabled)) {
    expect(RENDERABLE.has(f.id)).toBe(true);
  }
});
```

```tsx
// append to app/python-sdk/extraction-studio/__tests__/page.test.tsx
// `fireEvent` is needed; add it to the existing import from
// "@testing-library/react" at the top of this file.

/** The existing stubProvidersFetch() THROWS on any unexpected URL, so an OCR
 *  test has to account for all three fetches the flow makes: the providers
 *  endpoint, the document itself from public/, and the OCR endpoint. */
function stubOcrFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/extraction/providers")) {
        return { ok: true, status: 200, json: async () => ({ providers: [] }) };
      }
      if (u.includes("/api/extraction/ocr")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            engine: "ADAPTIVE_OCR",
            filename: "scan.pdf",
            statistics: {
              totalElements: 1,
              textElements: 1,
              averageConfidence: 0.9,
              lowConfidenceElements: 0,
            },
            fullText: "[0] Invoice",
            textElements: [
              {
                readingOrder: 0,
                type: "paragraph",
                text: "Invoice",
                confidence: 0.9,
                page: 0,
                citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
              },
            ],
            pages: [{ page: 1, width: 1654, height: 2338 }],
            config: { languages: "eng", outputFormat: "json", tableDetection: true },
            timingMs: 800,
          }),
        };
      }
      // the document fetched from public/ before upload
      return { ok: true, status: 200, blob: async () => new Blob(["pdf"]) };
    }) as unknown as typeof fetch,
  );
}

test("Adaptive OCR is selectable and swaps in its own panel", () => {
  stubOcrFetch();
  render(<ExtractionStudio />);
  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  // OCR's own control appears...
  expect(screen.getByText("Languages")).toBeInTheDocument();
  // ...and structured extraction's schema builder is gone.
  expect(screen.queryByText("Schema builder")).toBeNull();
});

test("Run is enabled for OCR even with no providers configured", async () => {
  // OCR needs no credentials. Gating its Run button on the providers fetch
  // would leave it permanently disabled on a backend with no LLM keys.
  stubOcrFetch();
  render(<ExtractionStudio />);
  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /run extraction/i }),
    ).not.toBeDisabled(),
  );
});

test("switching feature clears the previous feature's results", async () => {
  // Stale structured results under an OCR panel is the obvious bug in a
  // feature-switching shell.
  stubOcrFetch();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() => expect(screen.getByText("Invoice")).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: /structured extraction/i }));
  expect(screen.queryByText("Invoice")).toBeNull();
});
```

If the rail buttons are not reachable by accessible name in this file's setup,
select them with `container.querySelector('.rail-item[data-id="adaptive_ocr"]')`
or the equivalent for the markup `FeatureRail` actually renders — check it before
writing, rather than assuming the name.

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio/_components/__tests__/FeatureRail.test.tsx`
Expected: FAIL — `adaptive_ocr.enabled` is `false`.

- [ ] **Step 3: Enable the rail entry**

In `FeatureRail.tsx`, set the `adaptive_ocr` entry's `enabled` to `true` and give it a `blurb`:

```ts
    id: "adaptive_ocr",
    group: "OCR",
    label: "Adaptive OCR",
    enabled: true,
    blurb: "Reads a scan into structured content, entirely on this machine.",
```

- [ ] **Step 4: Wire the panels in `page.tsx`**

Add the imports:

```tsx
import { extractOcr, type OcrResult } from "./lib/ocr";
import { OcrConfig } from "./_components/OcrConfig";
import { confidenceHex, OcrResults } from "./_components/OcrResults";
```

Add state beside the existing structured state:

```tsx
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [showRegions, setShowRegions] = useState(true);
```

Clear results whenever the feature changes:

```tsx
  // Switching feature must not leave the previous feature's results on screen.
  useEffect(() => {
    setResult(null);
    setOcrResult(null);
    setError(null);
    setActiveIndex(null);
  }, [feature]);
```

Derive the citations the viewer draws from whichever feature is active, giving
each OCR region its confidence colour:

```tsx
  // OCR elements already arrive as fractional citations from the backend, so the
  // existing overlay draws them with no new drawing code. Each carries its own
  // hex, which is why IndexedCitation has an optional per-citation colour.
  // IndexedCitation is { fieldIndex, citation } — a wrapper. Spreading the
  // citation's own fields in would produce the wrong shape and paint nothing.
  const ocrCitations = useMemo(
    () =>
      (ocrResult?.textElements ?? []).flatMap((el, index) =>
        el.citation
          ? [
              {
                fieldIndex: index,
                citation: el.citation,
                hex: confidenceHex(el.confidence),
              },
            ]
          : [],
      ),
    [ocrResult],
  );

  const viewerCitations = feature === "structured" ? citations : ocrCitations;
  const viewerShow = feature === "structured" ? showCitations : showRegions;
```

Pass `viewerCitations` and `viewerShow` to `DocViewer` in place of `citations` and
`showCitations`, then render the feature's panels:

```tsx
            {feature === "structured" ? (
              <StructuredConfig … />
            ) : (
              <OcrConfig
                docPath={current.path}
                filename={current.filename}
                runSignal={runSignal}
                onRun={async (req) => {
                  setBusy(true);
                  setError(null);
                  setOcrResult(null);
                  try {
                    setOcrResult(await extractOcr(req));
                    setTab("results");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "OCR failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
```

In the results tab, render whichever results component matches the feature:

```tsx
            {feature === "structured" ? (
              result && <StructuredResults … />
            ) : (
              ocrResult && (
                <OcrResults
                  result={ocrResult}
                  activeIndex={activeIndex}
                  onSelectElement={setActiveIndex}
                  showRegions={showRegions}
                  onShowRegionsChange={setShowRegions}
                />
              )
            )}
```

Leave the existing `StructuredResults` invocation's props exactly as they are —
only the surrounding conditional is new.

The Run button's `disabled={busy || !providersReady}` must become
`disabled={busy || (feature === "structured" && !providersReady)}` — OCR needs no
providers, so gating it on the provider fetch would leave Run permanently
disabled when no LLM keys are configured.

- [ ] **Step 5: Run the whole studio suite**

Run: `export PATH="$HOME/Library/pnpm/bin:$PATH" && pnpm exec vitest run app/python-sdk/extraction-studio && pnpm exec tsc --noEmit`
Expected: PASS, and typecheck clean.

- [ ] **Step 6: Verify in a real browser against a live backend**

```bash
cd ~/SE/code/python-fast-api && .venv/bin/uvicorn app.main:app --port 8080 &
cd ~/SE/code/nutrient-sdk-samples && export PATH="$HOME/Library/pnpm/bin:$PATH"
rm -rf .next && pnpm exec next dev --turbopack &
sleep 20
# Confirm the SERVED css carries the new rules — a stale bundle keeps the old
# stylesheet at an unchanged chunk hash.
curl -s http://localhost:3000/python-sdk/extraction-studio \
  | grep -oE '/_next/static/[^"]*styles[^"]*\.css' | sort -u \
  | while read -r c; do curl -s "http://localhost:3000$c" | grep -c "lang-chip"; done
```

Then in the browser, on `/python-sdk/extraction-studio`:

- Select Adaptive OCR in the rail; the panel head shows its label and blurb.
- Pick a `SCAN` document (Lumen, Vandelay Industries, Westbridge, bill of lading) and Run. Expect elements, a confidence average, and coloured boxes on the page.
- Click an element row; its box emphasises on the page.
- Add `deu` to the languages and Run again; the average confidence should change.
- Turn off Detect tables on a table-bearing document; the element count should change.
- Switch to Markdown and Run; the Markdown view appears.
- Switch back to Structured extraction; the OCR results must disappear.
- Check both themes and a 900px-wide window.

- [ ] **Step 7: Commit**

```bash
git add app/python-sdk/extraction-studio/page.tsx app/python-sdk/extraction-studio/_components/FeatureRail.tsx app/python-sdk/extraction-studio/__tests__/page.test.tsx app/python-sdk/extraction-studio/_components/__tests__/FeatureRail.test.tsx
git commit -m "feat(extraction-studio): enable Adaptive OCR in the rail"
```

- [ ] **Step 8: Update the studio TODO**

In `docs/extraction-studio-todo.md`, note under the rail discussion that
`adaptive_ocr` is live, that six `SOON` entries remain, and that **Multilingual
OCR is now known to be buildable** — multi-language works with `+`, verified
2026-08-06 — so its rail entry is a decision rather than an unknown.

```bash
git add docs/extraction-studio-todo.md
git commit -m "docs: record Adaptive OCR shipping and what it settles"
```

---

## Self-review notes

Checked against the spec:

- Three options with controls; four no-ops explicitly excluded and asserted absent — Task 6.
- Language allowlist shared by listing and validation, rejecting the exact separators observed to empty silently — Task 3.
- Page dimensions carried through; citations in the same fractional shape — Task 2.
- Confidence-tinted regions, no colour picker — Tasks 5 and 7.
- Explicit no-text-found state — Task 7.
- Feature-keyed panels, results cleared on switch, structured-only state kept out of the shell — Task 8.
- Enabled-rail-entries guard — Task 8.
- `VisionFeatures` untouched; `IR_LITE` not exposed — Task 3.

Deliberately deferred, as the spec says: word-level overlay, the other six rail features, filing SDK-049, and retiring the existing OCR sample.

Three errors found and fixed during this review, all of which would have cost
the implementer time:

- `IndexedCitation` is `{ fieldIndex, citation }`, a wrapper — Task 8 originally
  spread the citation's fields in, which would have produced the wrong shape and
  painted nothing.
- Task 5 originally looked up `citations[fieldIndex]`, but `citations` is
  compacted, so array position is not field index. That is the misalignment
  `77fa9c1` fixed. Destructuring from the loop removes the lookup.
- Task 8's `page.test.tsx` addition was described rather than written. It is now
  complete code, including the fact that the existing `stubProvidersFetch` throws
  on unexpected URLs and so all three fetches must be stubbed.

Every test in this plan is now complete code.
