# OCR Code View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Extraction Studio's Adaptive OCR results panel the Code segment its spec calls for — a faithful, runnable Python snippet — plus the Copy/Download row `StructuredResults` already has.

**Architecture:** The backend builds the snippet (`_build_ocr_code()` in `app/services/extraction.py`, beside `extract_text_ocr`, mirroring `_build_code()` in `structured.py`) and returns it as a new `code` key on both output-format branches. The frontend adds `code?: string` to `OcrResult`, a `Code` segment to both segment lists, and an actions row. Two repos, so two PRs — `python-fast-api` first, because the frontend degrades to a placeholder until the `code` field exists.

**Tech Stack:** Python 3 / FastAPI / pytest / `nutrient-sdk` (backend, `~/SE/code/python-fast-api`); Next.js App Router / React / TypeScript / vitest + Testing Library / Biome (frontend, this repo).

**Design doc:** `docs/specs/2026-08-07-ocr-code-view-design.md` — all five decisions are settled there; this plan implements them, it does not reopen them.

## Global Constraints

- **The snippet must run as printed on the studio's own PDFs.** `compile()` it in a test — string-matching is what let structured's undefined-`SCHEMA` bug through.
- **Capability framing, never defect framing.** The prerender comment reads "Adaptive OCR reads page images, so render each PDF page to a JPEG first." Do **not** name NAPY-7, NAPY-8, or "workaround" anywhere in snippet text — this is prospect-facing sales material.
- **The snippet mirrors `_run_vision`'s getter style** (`doc.get_settings()`), not `_build_code`'s property style (`document.settings.…`). `_run_vision` is the path proven to execute.
- **Both output branches return the identical key set.** `extract_text_ocr` sets `code` after `result["config"]`, on both branches. `tests/test_extraction.py::test_ocr_endpoint_markdown_key_set_matches_json` enforces this and extends for free.
- **Never print a secret or an env value in the snippet.** OCR has no provider and no key, so there is nothing to print — do not add any.
- **Backend baseline to beat:** pure subset **77 passed / 14 deselected in ~1s**.
- **Frontend baseline to beat:** **310 tests across 34 files** (measured 2026-08-07), `pnpm exec tsc --noEmit` clean, `pnpm exec biome check <changed paths>` 0 errors.
- **A green `pnpm test` is NOT evidence for a type change** — vitest transpiles without typechecking. Run `tsc --noEmit` separately.
- **`uvicorn` without `--reload` serves the code as of startup.** Restart the backend before concluding a backend change did not land.
- **Never use `pytest -k "not extract"`** — `-k` matches module names and zeroes every `test_extraction*.py` file.
- **`pnpm` is missing from non-interactive shells' PATH.** Prefix with `export PATH="$HOME/Library/pnpm/bin:$PATH"`.

## File Structure

**Backend (`~/SE/code/python-fast-api`)**

| File | Responsibility |
|---|---|
| `app/services/extraction.py` | Add `_build_ocr_code()`; set `result["code"]` in `extract_text_ocr` |
| `tests/test_extraction_code.py` | **New.** Unit tests for `_build_ocr_code` — pure, no SDK, no network |

**Frontend (this repo)**

| File | Responsibility |
|---|---|
| `app/python-sdk/extraction-studio/lib/ocr.ts` | Add `code?: string` to `OcrResult` |
| `app/python-sdk/extraction-studio/_components/OcrResults.tsx` | Code segment (both modes), render chain, actions row |
| `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx` | Tests for both of the above |
| `app/python-sdk/extraction-studio/_components/StructuredResults.tsx` | One-line fix: `//` placeholder → `#` (it is Python) |
| `docs/extraction-studio-todo.md` | Close item 1, close the stale markdown-meta-row item, refresh baselines |

No CSS changes. `.results-actions` has no rule of its own — it composes `.panel-row-h panel-row`, and `.results-actions-btns` (`styles.css:692`) is already defined. This sidesteps the CSS source-order trap entirely.

---

### Task 1: Backend — `_build_ocr_code()` and the `code` key

**Repo:** `~/SE/code/python-fast-api` — this is **PR 1**, and it merges before Task 2 starts.

**Files:**
- Modify: `app/services/extraction.py` (add function near `extract_text_ocr` at line 180; add one line inside `extract_text_ocr`)
- Test: `tests/test_extraction_code.py` (create)

**Interfaces:**
- Consumes: `PAGE_BREAK` (`extraction.py:56`), and the `echo` dict returned by `validate_ocr_options` — exactly `{"languages": str, "outputFormat": "json" | "markdown"}`.
- Produces: `_build_ocr_code(filename: str, echo: dict, *, table_detection: bool) -> str`, and a new `code: str` key on every `/api/extraction/ocr` response body. Task 2 relies on that key's name and on it being a Python source string.

- [ ] **Step 1: Create the branch**

```bash
cd ~/SE/code/python-fast-api
git checkout main && git pull
git checkout -b ocr-code-snippet
```

- [ ] **Step 2: Write the failing tests**

Create `tests/test_extraction_code.py`:

```python
"""Unit tests for the OCR Code snippet. Pure — no SDK, no network, no fixtures.

The rule these enforce comes from _build_code's fix rounds in structured.py:
string-matching a snippet is what let `request.schema = SCHEMA` ship against a
name nothing assigned. A snippet whose entire purpose is being copied verbatim
has to be compiled, and every name it references has to be bound.
"""

import ast
import builtins

from app.services.extraction import _build_ocr_code

JSON_ECHO = {"languages": "eng", "outputFormat": "json"}
MARKDOWN_ECHO = {"languages": "eng", "outputFormat": "markdown"}


def unbound_names(code: str) -> set[str]:
    """Every Name the snippet reads that nothing imports, assigns or binds.

    compile() only proves the snippet parses; this proves it would not raise
    NameError on the first run — the class of bug that actually shipped once.
    """
    tree = ast.parse(code)
    bound: set[str] = set(dir(builtins))
    used: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                bound.add(alias.asname or alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                bound.add(alias.asname or alias.name)
        elif isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Store):
                bound.add(node.id)
            else:
                used.add(node.id)
        elif isinstance(node, ast.arg):
            bound.add(node.arg)
    return used - bound


class TestBuildOcrCode:
    def test_json_snippet_is_valid_python_with_every_name_bound(self):
        code = _build_ocr_code("scanned-invoice.pdf", JSON_ECHO, table_detection=True)
        compile(code, "<snippet>", "exec")
        assert unbound_names(code) == set()

    def test_markdown_snippet_is_valid_python_with_every_name_bound(self):
        code = _build_ocr_code("scan.pdf", MARKDOWN_ECHO, table_detection=True)
        compile(code, "<snippet>", "exec")
        assert unbound_names(code) == set()

    def test_the_snippet_reflects_the_run_that_produced_it(self):
        code = _build_ocr_code(
            "scan.pdf",
            {"languages": "eng+deu+fra", "outputFormat": "json"},
            table_detection=False,
        )
        assert 'set_default_languages("eng+deu+fra")' in code
        assert "set_enable_table_detection(False)" in code
        assert "scan.pdf" in code

    def test_only_the_markdown_branch_sets_the_output_format(self):
        md = _build_ocr_code("scan.pdf", MARKDOWN_ECHO, table_detection=True)
        js = _build_ocr_code("scan.pdf", JSON_ECHO, table_detection=True)
        assert "VisionOutputFormat.MARKDOWN" in md
        assert "VisionOutputFormat" not in js

    def test_the_markdown_branch_joins_pages_with_the_real_separator(self):
        # Not a lookalike string: the studio's own PAGE_BREAK, so what a
        # prospect runs produces what the studio showed them.
        from app.services.extraction import PAGE_BREAK

        code = _build_ocr_code("scan.pdf", MARKDOWN_ECHO, table_detection=True)
        assert repr(PAGE_BREAK) in code
        assert "json.loads" not in code  # markdown does not merge elements

    def test_the_json_branch_rewrites_page_number_and_reading_order(self):
        # The trap the merge exists for: each per-page call reports
        # pageNumber=1 and restarts readingOrder at 0.
        code = _build_ocr_code("scan.pdf", JSON_ECHO, table_detection=True)
        assert 'element["pageNumber"] = page_idx' in code
        assert 'element["readingOrder"] = next_order' in code

    def test_the_glob_sorts_numerically_and_falls_back_to_the_single_page_name(self):
        # Two ways this snippet ships silently broken: sorted(glob(...)) is
        # lexicographic, so page-10 lands before page-2; and a single-page
        # document is written to page.jpg with no suffix at all, so the glob
        # returns nothing and the snippet prints an empty list. The studio's
        # corpus is short scans, so the second is the likelier hit.
        code = _build_ocr_code("scan.pdf", JSON_ECHO, table_detection=True)
        assert "int(re.search" in code
        assert 'paths = paths or ["page.jpg"]' in code

    def test_the_snippet_frames_the_prerender_as_capability_not_defect(self):
        # Prospect-facing material. Naming our own open SDK issues in it
        # advertises a known bug in the artefact meant to prove the SDK works.
        code = _build_ocr_code("scan.pdf", JSON_ECHO, table_detection=True)
        assert "Adaptive OCR reads page images" in code
        for leak in ("NAPY", "workaround", "bug", "fails"):
            assert leak not in code

    def test_a_filename_containing_a_quote_still_compiles(self):
        # Filenames are user-supplied. Interpolating one raw into a double-quoted
        # literal is a one-character break, so the name goes through json.dumps.
        code = _build_ocr_code('he"llo\\scan.pdf', JSON_ECHO, table_detection=True)
        compile(code, "<snippet>", "exec")
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
cd ~/SE/code/python-fast-api && .venv/bin/pytest tests/test_extraction_code.py -q
```

Expected: collection error — `ImportError: cannot import name '_build_ocr_code' from 'app.services.extraction'`.

- [ ] **Step 4: Implement `_build_ocr_code`**

In `app/services/extraction.py`, insert immediately **above** `def extract_text_ocr(` (line 180):

```python
def _build_ocr_code(filename: str, echo: dict, *, table_detection: bool) -> str:
    """The snippet the UI shows as 'how you'd do this yourself' for Adaptive OCR.

    Deliberately NOT the four obvious lines (open → set engine → extract). OCR is
    not one SDK call here: _prepared_pages rasterises PDFs to one JPEG per page
    and runs Vision per page, and every document this feature demos is a PDF. The
    short form would error on all four of them — worse than no Code view, in the
    one artefact built to prove the SDK works. So the snippet carries the
    pre-render, framed as what it is from the reader's side: Adaptive OCR reads
    page images.

    Mirrors _run_vision's getter style (doc.get_settings()) rather than
    _build_code's property style, because the getter path is the one proven to
    execute.

    `languages` and `table_detection` interpolate from the run that produced the
    result, so the snippet and the output on screen agree.
    """
    is_markdown = echo["outputFormat"] == "markdown"
    # json is only needed by the merge, which the markdown branch does not do.
    # An unused import would be harmless but the snippet is read as much as run.
    imports = "import glob, re\n" if is_markdown else "import glob, json, re\n"
    sdk_imports = (
        "from nutrient_sdk import (Document, ImageExportFormat, Vision,\n"
        "                          VisionEngine, VisionFeatures"
        + (", VisionOutputFormat)\n\n" if is_markdown else ")\n\n")
    )
    output_format_line = (
        "        vision.set_output_format(VisionOutputFormat.MARKDOWN)\n"
        if is_markdown
        else ""
    )
    if is_markdown:
        tail = f"print({PAGE_BREAK!r}.join(raws))\n"
    else:
        # The minimal merge: rewrite pageNumber/readingOrder and concatenate.
        # merge_element_pages also harvests page width/height from `metadata`,
        # which exists only to place overlay boxes — studio plumbing, not
        # something a reader of this snippet needs.
        tail = (
            "elements, next_order = [], 0\n"
            "for page_idx, raw in enumerate(raws, start=1):\n"
            "    payload = json.loads(raw)\n"
            '    page_elements = payload.get("elements", [])\n'
            '    page_elements.sort(key=lambda e: e.get("readingOrder", 0))\n'
            "    for element in page_elements:\n"
            "        # Each per-page call reports pageNumber=1 and restarts\n"
            "        # readingOrder at 0 — rewrite both or the pages interleave.\n"
            '        element["pageNumber"] = page_idx\n'
            '        element["readingOrder"] = next_order\n'
            "        next_order += 1\n"
            "        elements.append(element)\n\n"
            "print(json.dumps(elements, indent=2))\n"
        )
    # json.dumps, not an f-string in quotes: a filename is user-supplied and one
    # embedded quote or backslash would break the literal.
    open_target = json.dumps(filename)
    return (
        imports
        + sdk_imports
        + "# Adaptive OCR reads page images, so render each PDF page to a JPEG\n"
        "# first. export_as_image() does the whole document in one call.\n"
        f"with Document.open({open_target}) as document:\n"
        "    images = document.get_settings().get_image_settings()\n"
        "    images.set_export_format(ImageExportFormat.JPEG)\n"
        '    document.export_as_image("page.jpg")\n\n'
        "# Multi-page writes page-1.jpg, page-2.jpg, …; a single-page document\n"
        "# is written to page.jpg itself. Sort numerically so 10 follows 9.\n"
        'paths = sorted(glob.glob("page-*.jpg"),\n'
        '               key=lambda p: int(re.search(r"-(\\d+)\\.jpg$", p).group(1)))\n'
        'paths = paths or ["page.jpg"]\n\n'
        "raws = []\n"
        "for path in paths:\n"
        "    with Document.open(path) as page:\n"
        "        settings = page.get_settings()\n"
        "        vision = settings.get_vision_settings()\n"
        "        vision.set_engine(VisionEngine.ADAPTIVE_OCR)\n"
        "        vision.set_features(VisionFeatures.ALL.value)\n"
        + output_format_line
        + f'        settings.get_ocr_settings().set_default_languages("{echo["languages"]}")\n'
        f"        settings.get_ocr_settings().set_enable_table_detection({table_detection})\n"
        "        raws.append(Vision.set(page).extract_content())\n\n"
        + tail
    )
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd ~/SE/code/python-fast-api && .venv/bin/pytest tests/test_extraction_code.py -q
```

Expected: `9 passed`.

- [ ] **Step 6: Wire `code` into the response, on both branches**

In `extract_text_ocr`, the line that currently reads:

```python
    result["config"] = {**echo, "tableDetection": table_detection}
```

becomes:

```python
    result["config"] = {**echo, "tableDetection": table_detection}
    # After config, on the shared path, so both branches return the same key set —
    # test_ocr_endpoint_markdown_key_set_matches_json is what enforces that.
    result["code"] = _build_ocr_code(
        original_filename, echo, table_detection=table_detection
    )
```

- [ ] **Step 7: Verify the endpoint returns `code` in both modes**

```bash
cd ~/SE/code/python-fast-api && .venv/bin/pytest \
  tests/test_extraction.py::test_ocr_endpoint_returns_text \
  tests/test_extraction.py::test_ocr_endpoint_markdown_key_set_matches_json -q
```

Expected: `2 passed`. (These call the real SDK, so they take a few seconds.)

Then confirm the key is actually present and is the snippet, not an empty string:

```bash
cd ~/SE/code/python-fast-api && .venv/bin/python -c "
from fastapi.testclient import TestClient
from app.main import app
from pathlib import Path
f = Path('tests/fixtures/input_ocr_multiple_languages.png')
c = TestClient(app)
for fmt in ('json', 'markdown'):
    b = c.post('/api/extraction/ocr', files={'file': (f.name, f.read_bytes(), 'image/png')},
               data={'output_format': fmt}).json()
    assert 'code' in b, fmt
    compile(b['code'], '<snippet>', 'exec')
    print(fmt, 'OK', len(b['code'].splitlines()), 'lines')
"
```

Expected: `json OK 41 lines` and `markdown OK 30 lines` (exact counts may differ by a line — what matters is both compile).

- [ ] **Step 8: Run the pure subset plus the new file**

```bash
cd ~/SE/code/python-fast-api && .venv/bin/pytest \
  tests/test_ocr_options.py tests/test_extraction_geometry.py \
  tests/test_extraction_merge.py tests/test_extraction_pages.py \
  tests/test_structured.py tests/test_extraction_code.py \
  -q -k "not live and not endpoint"
```

Expected: **86 passed** (77 baseline + 9 new), 14 deselected, ~1s.

- [ ] **Step 9: Commit and open PR 1**

```bash
cd ~/SE/code/python-fast-api
git add app/services/extraction.py tests/test_extraction_code.py
git commit -m "$(cat <<'EOF'
feat(extraction): Code snippet for Adaptive OCR results

The studio's OCR panel has no Code segment though the Adaptive OCR spec
calls for four. Structured extraction has one, so a prospect told "every
result gives you the code that produced it" loses that promise by clicking
one rail entry.

The snippet carries the per-page pre-render rather than the obvious four
lines: OCR is not one SDK call here, and every document this feature demos
is a PDF, so the short form would error on all four of them. Two traps the
snippet has to carry are pinned by tests — sorted(glob(...)) is
lexicographic, and a single-page export writes page.jpg with no suffix.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin ocr-code-snippet
gh pr create --title "feat(extraction): Code snippet for Adaptive OCR results" --body "$(cat <<'EOF'
## What

`_build_ocr_code()` in `app/services/extraction.py`, returned as a new `code`
key on `/api/extraction/ocr` — on **both** output-format branches, so the key
set stays identical (`test_ocr_endpoint_markdown_key_set_matches_json` covers
it for free).

Closes item 1 of the studio's next-session list. Design:
`nutrient-sdk-samples/docs/specs/2026-08-07-ocr-code-view-design.md`.

## Why it is ~40 lines and not ~9

OCR is not one SDK call on this path. `_prepared_pages` rasterises PDFs to one
JPEG per page and runs Vision per page, because image-only PDFs fail Vision's
input stage and one failure poisons the process. All four of the studio's OCR
documents are PDFs, so `Document.open("scan.pdf")` →
`Vision.set(doc).extract_content()` is short, clean, and errors on every
document a prospect would paste it against.

The pre-render is framed as capability ("Adaptive OCR reads page images"), not
as a workaround — a test asserts no `NAPY`/`workaround`/`bug` string reaches
this prospect-facing text.

## Two traps the snippet carries

- `sorted(glob.glob("page-*.jpg"))` is lexicographic, so `page-10` sorts before
  `page-2`. Sorted numerically instead.
- A single-page document is written to `page.jpg` with **no suffix**, so the
  glob returns an empty list. `paths or ["page.jpg"]` catches it — the likeliest
  hit, since the corpus is short scans.

## Tests

`tests/test_extraction_code.py`, 9 pure tests (no SDK, no network). Every
snippet is `compile()`d and AST-walked so no referenced name is unbound — the
`NameError` class of bug that shipped once in `_build_code`'s
`request.schema = SCHEMA`.

Pure subset: 86 passed / 14 deselected in ~1s (was 77).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 2: Frontend — the Code segment in both output modes

**Repo:** this one. Branch for **PR 2**; Task 3 commits onto the same branch.

**Files:**
- Modify: `app/python-sdk/extraction-studio/lib/ocr.ts:37-53` (the `OcrResult` type)
- Modify: `app/python-sdk/extraction-studio/_components/OcrResults.tsx:105-161`
- Modify: `app/python-sdk/extraction-studio/_components/StructuredResults.tsx:124` (one-line placeholder fix)
- Test: `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`

**Interfaces:**
- Consumes: the `code` key Task 1 added to `/api/extraction/ocr`. `extractOcr` already returns the parsed body wholesale (`lib/ocr.ts:94`), so no fetch change is needed.
- Produces: `OcrResult.code?: string`, and a `view` state whose values are now `"elements" | "text" | "raw" | "markdown" | "code"`. Task 3 keys its download payload off exactly these strings.

- [ ] **Step 1: Create the branch**

```bash
cd ~/SE/code/nutrient-sdk-samples
git checkout main && git pull
git checkout -b ocr-code-view
```

- [ ] **Step 2: Write the failing tests**

Append to `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`:

```tsx
const CODE = "import glob, json, re\nprint('hi')\n";

test("offers a Code segment in JSON mode and renders the snippet", () => {
  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByText(/import glob, json, re/)).toBeInTheDocument();
});

test("offers a Code segment in markdown mode too", () => {
  // The spec asks for Code in the JSON segment list. Shipping it there only
  // would make the promise vanish when a reviewer flips the Output control —
  // the same disappearing-promise problem one control deeper.
  render(
    <OcrResults {...props} result={{ ...MARKDOWN_RESULT, code: CODE }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByText(/import glob, json, re/)).toBeInTheDocument();
});

test("Code wins over the markdown pane in markdown mode", () => {
  // The render chain used to lead with `isMarkdown && view !== "raw"`, which is
  // true when view is "code" — so clicking Code in markdown mode would have
  // silently re-rendered the markdown.
  render(
    <OcrResults {...props} result={{ ...MARKDOWN_RESULT, code: CODE }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.queryByText("# Invoice")).not.toBeInTheDocument();
});

test("degrades to a Python-commented placeholder when code is absent", () => {
  // Optional on purpose: the response type is a claim about the backend, not a
  // check on it, and this view ships before the backend deploy reaches Railway.
  render(<OcrResults {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByText(/^# run OCR to see the code$/)).toBeInTheDocument();
});

test("the JSON view omits the code snippet", () => {
  // The snippet has its own segment; inlining 40 lines of Python as one escaped
  // string is the entire JSON pane's worth of noise. StructuredResults has the
  // same shape — its raw view shows data.extraction, not the envelope.
  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  expect(screen.queryByText(/"code":/)).not.toBeInTheDocument();
  expect(screen.getByText(/"filename": "scan.pdf"/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test OcrResults
```

Expected: 5 failures — `Unable to find an accessible element with the role "button" and name "Code"`.

- [ ] **Step 4: Add `code` to the response type**

In `app/python-sdk/extraction-studio/lib/ocr.ts`, inside `OcrResult`, immediately after the `markdown` field:

```ts
  /** Present only when outputFormat was "markdown". */
  markdown?: string;
  /** The 'how you'd do this yourself' snippet the backend builds for this run.
   *  Optional deliberately, matching StructuredResults: this type is a claim
   *  about the backend's shape, not a check on it, and the frontend can deploy
   *  before the backend does. */
  code?: string;
```

- [ ] **Step 5: Add the segment and the render branch**

In `OcrResults.tsx`, replace the `<Segmented …>` block (lines 105-127) and the render chain that follows it (lines 129-161).

First, above the `return (`, after the `const empty = …` line:

```tsx
  // The JSON view deliberately drops `code`: the snippet has its own segment.
  const { code, ...resultJson } = result;
```

Then the segment options:

```tsx
          <Segmented
            options={
              isMarkdown
                ? [
                    { label: "Markdown", value: "markdown" },
                    { label: "Code", value: "code" },
                    { label: "JSON", value: "raw" },
                  ]
                : [
                    { label: "Elements", value: "elements" },
                    { label: "Text", value: "text" },
                    { label: "JSON", value: "raw" },
                    { label: "Code", value: "code" },
                  ]
            }
```

(The `value={view}` / `onChange={setView}` props and the comment above them stay exactly as they are.)

Then the render chain. Two things about it: `view === "code"` must lead, and the markdown branch keeps its `view !== "raw"` guard (markdown mode still has a JSON segment):

```tsx
          {view === "code" ? (
            // First, not folded into the chain below: `isMarkdown && view !==
            // "raw"` is true when view is "code", so leading with that test
            // would render the markdown pane over the Code segment.
            <pre className="ocr-text mono">
              {code ?? "# run OCR to see the code"}
            </pre>
          ) : isMarkdown && view !== "raw" ? (
            <pre className="ocr-text mono">{result.markdown}</pre>
          ) : view === "raw" ? (
            <pre className="ocr-text mono">
              {JSON.stringify(resultJson, null, 2)}
            </pre>
          ) : view === "text" ? (
            <pre className="ocr-text mono">{result.fullText ?? ""}</pre>
          ) : (
```

The `<table className="field-table ocr-elements">` branch and everything after it is unchanged.

- [ ] **Step 6: Fix the structured placeholder in passing**

`StructuredResults.tsx:124` — the fallback is a `//` comment in a Python snippet:

```tsx
          {code ?? "# run an extraction to see the code"}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test OcrResults StructuredResults
```

Expected: all pass, including the five new ones.

- [ ] **Step 8: Typecheck and lint**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm exec tsc --noEmit
pnpm exec biome check app/python-sdk/extraction-studio/lib/ocr.ts \
  app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/StructuredResults.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx
```

Expected: `tsc` prints nothing; biome reports 0 errors. A green vitest run is not evidence for the type change — that is what `tsc` is for here.

- [ ] **Step 9: Commit**

```bash
git add app/python-sdk/extraction-studio/lib/ocr.ts \
  app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/StructuredResults.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx
git commit -m "$(cat <<'EOF'
feat(extraction-studio): Code segment for OCR results, in both output modes

The Adaptive OCR spec calls for four segments and three shipped, so a
prospect told "every result gives you the code that produced it" lost that
promise by clicking one rail entry. Code appears in the Markdown segment
list too — shipping it only under JSON would make it vanish when a reviewer
flips the Output control.

The render chain leads with view === "code": `isMarkdown && view !== "raw"`
is true when view is "code", so the old ordering would have rendered the
markdown pane over the Code segment.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Frontend — the Copy/Download actions row

**Repo:** this one, same `ocr-code-view` branch as Task 2.

**Files:**
- Modify: `app/python-sdk/extraction-studio/_components/OcrResults.tsx` (add `payload`/`download`, wrap the `Segmented` in the actions row)
- Test: `app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx`

**Interfaces:**
- Consumes: the `view` state values from Task 2 — `"elements" | "text" | "raw" | "markdown" | "code"` — and `resultJson` (the result minus `code`).
- Produces: nothing later tasks depend on.

Design decision 5: `OcrResults` gets the same actions row as `StructuredResults`, payload keyed to the current view. The four view→file mappings are `code` → `ocr.py` (`text/x-python`), `markdown` → `ocr.md` (`text/markdown`), `text` → `ocr.txt` (`text/plain`), everything else → `ocr.json` (`application/json`).

- [ ] **Step 1: Write the failing tests**

Append to `OcrResults.test.tsx`:

```tsx
test("Copy writes the current view's payload to the clipboard", async () => {
  const writeText = vi.fn(() => Promise.resolve());
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);

  // Elements view (default): the JSON, minus the snippet.
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0][0]).toContain('"filename": "scan.pdf"');
  expect(writeText.mock.calls[0][0]).not.toContain('"code":');

  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenNthCalledWith(2, CODE);

  vi.unstubAllGlobals();
});

test("Download names the file after the view it was taken from", async () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:mock-url");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

  // The component never appends its anchor to the DOM, so intercepting its
  // creation is the only way to read the `download` filename back.
  const anchors: HTMLAnchorElement[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const el = originalCreateElement(tagName, options);
    if (tagName === "a") anchors.push(el as HTMLAnchorElement);
    return el;
  });
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);

  fireEvent.click(screen.getByRole("button", { name: "Download" }));
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe(
    "application/json",
  );
  expect(anchors[0]?.download).toBe("ocr.json");

  // Deferred revoke: revoking synchronously races the browser's own blob fetch.
  expect(revokeObjectURL).not.toHaveBeenCalled();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Download" }));
  const codeBlob = createObjectURL.mock.calls[1][0] as Blob;
  expect(codeBlob.type).toBe("text/x-python");
  await expect(codeBlob.text()).resolves.toBe(CODE);
  expect(anchors[1]?.download).toBe("ocr.py");

  expect(clickSpy).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("Download writes markdown as .md, not .json", async () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:mock-url");
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
  const anchors: HTMLAnchorElement[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const el = originalCreateElement(tagName, options);
    if (tagName === "a") anchors.push(el as HTMLAnchorElement);
    return el;
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(
    <OcrResults {...props} result={{ ...MARKDOWN_RESULT, code: CODE }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Download" }));

  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(blob.type).toBe("text/markdown");
  await expect(blob.text()).resolves.toBe("# Invoice");
  expect(anchors[0]?.download).toBe("ocr.md");

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test OcrResults
```

Expected: 3 failures — no accessible element named `Copy`.

- [ ] **Step 3: Add the payload and download helpers**

In `OcrResults.tsx`, directly below the `const { code, ...resultJson } = result;` line from Task 2:

```tsx
  // Keyed to the view, so what the button hands over is what is on screen —
  // the same contract as StructuredResults' actions row.
  const payload = () => {
    if (view === "code") return code ?? "";
    if (view === "markdown") return result.markdown ?? "";
    if (view === "text") return result.fullText ?? "";
    return JSON.stringify(resultJson, null, 2);
  };

  const FILE_FOR_VIEW: Record<string, { type: string; name: string }> = {
    code: { type: "text/x-python", name: "ocr.py" },
    markdown: { type: "text/markdown", name: "ocr.md" },
    text: { type: "text/plain", name: "ocr.txt" },
  };

  const download = () => {
    const { type, name } = FILE_FOR_VIEW[view] ?? {
      type: "application/json",
      name: "ocr.json",
    };
    const url = URL.createObjectURL(new Blob([payload()], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    // Deferred: revoking synchronously races the browser's internal blob fetch
    // for the download in some browsers (notably older Safari).
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
```

- [ ] **Step 4: Wrap the Segmented in the actions row**

Wrap the existing `<Segmented …/>` (do not change its props) in the same row `StructuredResults` uses. `.results-actions` composes `.panel-row-h panel-row` and `.results-actions-btns` is already styled at `styles.css:692`, so **no CSS change is needed**:

```tsx
          <div className="panel-row-h panel-row results-actions">
            <Segmented
              options={/* …unchanged… */}
              value={view}
              onChange={setView}
            />
            <div className="results-actions-btns">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => navigator.clipboard.writeText(payload())}
              >
                Copy
              </button>
              <button type="button" className="btn ghost sm" onClick={download}>
                Download
              </button>
            </div>
          </div>
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test OcrResults
```

Expected: all pass.

- [ ] **Step 6: Run the whole suite, typecheck and lint**

```bash
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm test
pnpm exec tsc --noEmit
pnpm exec biome check app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx
```

Expected: **318 tests across 34 files** (310 baseline + 5 from Task 2 + 3 here), `tsc` silent, biome 0 errors.

- [ ] **Step 7: Commit**

```bash
git add app/python-sdk/extraction-studio/_components/OcrResults.tsx \
  app/python-sdk/extraction-studio/_components/__tests__/OcrResults.test.tsx
git commit -m "$(cat <<'EOF'
feat(extraction-studio): Copy/Download row for OCR results

A Code view you cannot copy is half a feature — copying is the entire point
of the snippet. Same row StructuredResults already has, payload keyed to the
current view: .py for Code, .md for Markdown, .txt for Text, .json otherwise.

No CSS: .results-actions composes .panel-row-h panel-row and
.results-actions-btns is already defined.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Live verification and docs, then PR 2

**Repo:** this one, same `ocr-code-view` branch.

**Files:**
- Modify: `docs/extraction-studio-todo.md` (baselines table; close item 1; close the stale markdown-meta-row item)

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: nothing.

- [ ] **Step 1: Start the backend on PR 1's code**

```bash
cd ~/SE/code/python-fast-api
git checkout ocr-code-snippet
.venv/bin/uvicorn app.main:app --port 8080 --reload
```

`--reload` matters: without it uvicorn serves the code as of startup, and a correct change reads as "not taken".

- [ ] **Step 2: Start the studio**

```bash
cd ~/SE/code/nutrient-sdk-samples
export PATH="$HOME/Library/pnpm/bin:$PATH"
pnpm dev
```

Open `http://localhost:3000/python-sdk/extraction-studio`. If HMR is not connecting, verify the *served* bundle rather than the source.

- [ ] **Step 3: Verify JSON mode on a multi-page document**

Pick `westbridge-engineering-submittal-form.pdf` (multi-page), Output = JSON, Run. Then:

1. Click **Code** — the snippet renders, ends in `print(json.dumps(elements, indent=2))`.
2. The `set_default_languages` line matches the language picker.
3. Click **JSON** — no `"code":` key in the pane.
4. Click **Copy** on the Code view, paste into a scratch file, and run it in the backend venv from a scratch directory next to a copy of the PDF. It must print elements, not raise.

- [ ] **Step 4: Verify the single-page fallback**

This is the `paths or ["page.jpg"]` branch — the one most likely to be wrong, and the likeliest to be hit given the corpus is short scans. Run OCR on `scanned-invoice.pdf` (or any single-page document in the strip), copy the Code snippet, and run it. It must print elements rather than an empty list.

If it prints `[]`, the glob found nothing and the fallback did not fire — fix `_build_ocr_code` in PR 1 before merging either PR.

- [ ] **Step 5: Verify markdown mode**

Flip Output to Markdown, Run. Then:

1. The segment list reads `Markdown | Code | JSON`.
2. Click **Code** — the markdown pane does **not** show through, and the snippet ends in the `PAGE_BREAK` join.
3. Click **Download** — the file is `ocr.md`, not `ocr.json`.

- [ ] **Step 6: Update the todo doc**

In `docs/extraction-studio-todo.md`:

1. Baselines table: frontend `309 across 34 files` → `318 across 34 files`; backend pure subset `77 passed / 14 deselected` → `86 passed / 14 deselected`, and add `tests/test_extraction_code.py` to the command block listing the pure files.
2. Next-session item 1 (OCR has no Code view): mark **DONE** with the two PR numbers.
3. The markdown meta-row item: mark **DONE, #62** — it shipped but the doc was never updated.
4. Leave `Show regions` is inert in markdown mode as open — it is Jon's call, not an inference.

- [ ] **Step 7: Commit and open PR 2**

```bash
cd ~/SE/code/nutrient-sdk-samples
git add docs/extraction-studio-todo.md docs/specs/2026-08-07-ocr-code-view-design.md docs/plans/2026-08-07-ocr-code-view.md
git commit -m "$(cat <<'EOF'
docs(extraction-studio): close the OCR Code-view item and refresh baselines

Also closes the markdown meta-row item, which shipped in #62 but was never
struck from the list.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin ocr-code-view
gh pr create --title "feat(extraction-studio): Code view for Adaptive OCR results" --body "$(cat <<'EOF'
## What

The OCR results panel gains the `Code` segment its spec calls for, in **both**
output modes, plus the Copy/Download row `StructuredResults` already had.

Depends on `python-fast-api#<PR 1>`, which adds the `code` key. `OcrResult.code`
is optional, so this degrades to a `#`-commented placeholder until that deploys
rather than breaking.

Closes item 1 of the studio's next-session list. Design:
`docs/specs/2026-08-07-ocr-code-view-design.md`. Plan:
`docs/plans/2026-08-07-ocr-code-view.md`.

## Decisions worth knowing

- **Code appears in the Markdown segment list too.** The spec asks for it in the
  JSON list; shipping it only there would make the promise vanish when a
  reviewer flips the Output control.
- **The JSON view drops `code`.** The snippet has its own segment, and inlining
  ~40 lines of Python as one escaped string is the whole pane's worth of noise.
  `StructuredResults` has the same shape — its raw view shows `data.extraction`,
  not the envelope.
- **The render chain leads with `view === "code"`.** `isMarkdown && view !==
  "raw"` is true when view is `"code"`, so the old ordering would have rendered
  the markdown pane over the Code segment. A test pins it.
- **No CSS.** `.results-actions` composes `.panel-row-h panel-row`, and
  `.results-actions-btns` was already defined — so the source-order trap in
  `styles.css` is not in play here.

## Verified live

Against the backend on 8080, both output formats, on a multi-page PDF and on a
single-page scan — the single-page case exercises the snippet's
`paths or ["page.jpg"]` fallback, which is the branch most likely to be wrong.
The copied snippet was run against the real document, not just read.

## Tests

318 across 34 files (was 310). `tsc --noEmit` clean; biome 0 errors on changed
files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- **Spec coverage.** Design decisions 1 (faithful snippet incl. prerender) → Task 1 Step 4; 2 (minimal merge) → Task 1 Step 4's `tail`; 3 (Code in both output modes) → Task 2 Step 5 + its two tests; 4 (capability framing) → Task 1 Step 4's comment, pinned by `test_the_snippet_frames_the_prerender_as_capability_not_defect`; 5 (Copy/Download row) → Task 3. The design's Testing section maps to Task 1 Steps 2/5/8, Task 2 Steps 2/7/8, Task 3 Steps 1/5/6, Task 4 Steps 3-5.
- **Segment order.** `Markdown | Code | JSON` in markdown mode and `Elements | Text | JSON | Code` in JSON mode are copied verbatim from design decision 3, which puts Code last in one list and second in the other. If Code should be last in both, that is a one-line swap in Task 2 Step 5 and a matching test edit — flag it to Jon rather than silently changing it.
- **The prototype ran.** Both branches of `_build_ocr_code` were compiled and AST-checked before this plan was written, across `languages` ∈ {`eng`, `eng+deu+fra`} and `table_detection` ∈ {True, False}. The `json.dumps(filename)` hardening was added afterwards and is covered by its own test.
