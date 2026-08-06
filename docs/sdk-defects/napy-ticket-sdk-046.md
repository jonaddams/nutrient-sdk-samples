# SDK · `export_as_markdown()` / `export_as_html()` silently drop words at inferred table column boundaries — up to 40% of a document's text

| Field | Value |
| --- | --- |
| **Severity** | High |
| **Priority** | High — silent, unbounded content loss in two licensed conversion features; affects 16 of 39 ordinary sample documents |
| **Type** | Bug |
| **Component** | Python SDK · Conversion · PDF→Markdown / PDF→HTML layout reconstruction |
| **Affects version** | `nutrient-sdk==1.0.9` / `nutrient-sdk-native==1.0.9` (compiled 2026-07-09) |
| **Platform** | macOS 15 (Darwin 25.6.0), ARM64, Apple M4 |
| **Python** | 3.12.13 |
| **Reporter** | Jon Addams (Customer Engineering) |
| **Date** | 2026-08-06 |
| **Registry ID** | SDK-046 |

## Summary

`Document.export_as_markdown()` and `Document.export_as_html()` silently omit words that are present in the page's text layer. `export_as_text()` on the same document returns them, so the content is available — it is discarded during layout reconstruction.

**The predictor is exact: loss occurs if and only if the converter wraps the page in a `<table>`.** Measured over 39 documents: of the 27 that produced a page-level table, the worst lost **39.9%** of its tokens; of the 12 that did not, the worst lost **1%**.

**Mechanism.** The page is forced into a column grid. Content that happens to align with the inferred columns survives intact. Content that spans a column boundary is **truncated at the first boundary and the remainder is thrown away** — not wrapped to the next cell, not given a column span, not preserved anywhere in the output.

No exception and no warning: the conversion reports success.

## Steps to reproduce

Any of the affected documents will do; all are public. The script below measures token loss against `export_as_text()` and prints the table/no-table correlation. **Needs only a license key** — no LLM provider.

```python
"""napy_repro_md_loss.py — PDF->Markdown/HTML drop words at inferred column boundaries.

  python napy_repro_md_loss.py file1.pdf file2.pdf ... (or a directory)

pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""
import html, os, re, sys
from collections import Counter
from dotenv import load_dotenv
from nutrient_sdk import Document, License

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])
TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9/.,$%#-]*")
WORK = "sdk046-out"; os.makedirs(WORK, exist_ok=True)

def collect(paths):
    out = []
    for p in paths:
        if os.path.isdir(p):
            out += [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.lower().endswith(".pdf")]
        elif p.lower().endswith(".pdf"):
            out.append(p)
    return out

def export(pdf, kind, meth):
    dst = os.path.join(WORK, os.path.basename(pdf) + "." + kind)
    try:
        with Document.open(pdf) as doc:
            getattr(doc, meth)(dst)
        return open(dst, encoding="utf-8", errors="replace").read()
    except Exception:
        return None

def toks(s): return Counter(TOKEN.findall(s))

def lost(base, other):
    if other is None: return None
    o = toks(html.unescape(re.sub(r"<[^>]+>", " ", other)))
    return sum(max(0, n - o[w]) for w, n in base.items())

print(f"\n{'document':46} {'tokens':>6} {'md lost':>8} {'md%':>5} {'html%':>6} table")
rows = []
for pdf in collect(sys.argv[1:]):
    text = export(pdf, "txt", "export_as_text")
    if not text: continue
    base = toks(text); total = sum(base.values())
    if total < 40: continue            # too little text to be meaningful
    md, ht = export(pdf, "md", "export_as_markdown"), export(pdf, "html", "export_as_html")
    lmd, lht = lost(base, md), lost(base, ht)
    tbl = bool(md and "<table" in md)
    print(f"{os.path.basename(pdf)[:45]:46} {total:6} {str(lmd):>8} "
          f"{100*lmd/total:4.0f}% {(100*lht/total if lht is not None else 0):5.0f}% {'yes' if tbl else 'no'}")
    rows.append((total, lmd or 0, tbl))

wt = [r for r in rows if r[2]]; wo = [r for r in rows if not r[2]]
f = lambda g: max((r[1]/r[0] for r in g), default=0)*100
print(f"\npage-level table: {len(wt)} docs, worst loss {f(wt):.0f}%  |  "
      f"no table: {len(wo)} docs, worst loss {f(wo):.0f}%")
```

## Observed output

Run over one public sample corpus (<https://github.com/jonaddams/nutrient-sdk-samples>, `public/documents/` and `public/invoices/`):

| Loss | Tokens | Document | page-level table |
| --- | --- | --- | --- |
| **39.9%** | 55/138 | `Drawing1.pdf` | yes |
| **21.6%** | 47/218 | `emergency-dept-billing-worksheet.pdf` | yes |
| **20.0%** | 36/180 | `solar-system-quiz.pdf` | yes |
| **19.4%** | 36/186 | `Invoice NT-2025-0312.pdf` | yes |
| **15.8%** | 54/342 | `Invoice AC-2025-1047.pdf` | yes |
| 12.2% | 53/434 | `signed-service-agreement.pdf` | yes |
| 11.0% | 960/8736 | `macaques.pdf` | yes |
| 10.3% | 331/3203 | `george-washington-rules-of-civility.pdf` | yes |
| 7.9% | 11/140 | `patient-intake-form.pdf` | yes |
| 7.2% | 105/1461 | `f940-flat.pdf` | yes |
| 6.7% | 8/119 | `meridian-balance-sheet.pdf` | yes |
| 5.9% | 19/322 | `Invoice SD-2025-0041.pdf` | yes |
| 4.9% | 54/1105 | `usenix-example-paper.pdf` | yes |
| 3.5% | 10/283 | `Invoice GL-2025-0088.pdf` | yes |
| 2.9% | 8/280 | `acme-bank.pdf` | yes |
| 2.4% | 7/295 | `Invoice RE-2025-0219.pdf` | yes |

```
page-level table: 27 docs, worst loss 40%  |  no table: 12 docs, worst loss 1%
```

Sixteen of thirty-nine documents lose more than 2% of their tokens, and every one of them is a document the converter turned into a table.

### The clearest single case

`solar-system-quiz.pdf` — an ordinary one-page quiz, no table on it at all. Text layer:

```
                    The Solar System — Science Quiz

Name:                                Date:

SECTION 1: MULTIPLE CHOICE
Circle the correct answer.
1. Which planet is closest to the Sun?
   A) Venus        B) Mercury      C) Earth     D) Mars
```

Markdown:

```html
<tr><th></th><td>The</td><td></td><td>- Science Quiz</td></tr>
<tr><th>SECTION 1:</th><td></td><td></td><td></td></tr>
<tr><th>Circle the correct</th><td></td><td></td><td></td></tr>
<tr><th>A) Venus</th><td>B) Mercury</td><td>C) Earth</td><td>D) Mars</td></tr>
```

| Printed | Emitted | Lost |
| --- | --- | --- |
| `The Solar System — Science Quiz` | `The` \| `` \| `- Science Quiz` | `Solar System` |
| `SECTION 1: MULTIPLE CHOICE` | `SECTION 1:` | `MULTIPLE CHOICE` |
| `Circle the correct answer.` | `Circle the correct` | `answer.` |
| `1. Which planet is closest to the Sun?` | – | the entire line |
| `A) Venus  B) Mercury  C) Earth  D) Mars` | all four cells | **nothing** |

The answer row is the only line that survives intact, and it is the only line that genuinely occupies four columns. Every other line spans the grid and is cut at the first boundary.

### A data-loss example

`emergency-dept-billing-worksheet.pdf`:

| Printed | Emitted | Lost |
| --- | --- | --- |
| `EMERGENCY DEPARTMENT BILLING WORKSHEET` | `[` \| `DEPARTMENT BILLING WORKSHEET` | `EMERGENCY` |
| `Clinical Archive Dept \| System Registry: LOC-99201-B` | `Clinical` \| `LOC-99201-B` | `Archive Dept \| System Registry:` |
| `PATIENT NAME: JOHN DOE … RECORD ID: #9920-A (MASKED FILE ID)` | `PATIENT` \| `JOHN DOE` \| `ID: #9920-A` \| `FILE ID)` | `NAME:`, `RECORD`, `(MASKED` |

A second symptom on that document: **when a real table row wraps to two visual lines, its trailing cells are lost.** Row `72141`'s description is split across two output rows and its `STATUS` and `FEES` cells come back empty, so `Approved` and `$2,100.00` vanish — while row `99214`, which does not wrap, keeps `Settled` and `$350.00`.

Values lost across the corpus include `$2,100.00`, `$5,400.00`, `Approved`, `Denied`, `12/04/2016`, and — on an invoice — `Atlas Construction LLC` and `Project Riverside Development`.

## Expected behavior

The token content of markdown/HTML output should be a **superset** of the page's text-layer tokens. Reconstructing layout may reorder or regroup text; it must not delete it. A run spanning a column boundary should be assigned to one cell (with a span) or split across cells.

## Actual behavior

The run is truncated at the first column boundary and the remainder is discarded, with no error, no warning and no diagnostic. Loss scales with how poorly the content matches the inferred grid, up to 40% of the document in the worst measured case.

## Impact

* **Two licensed features silently lose content** — "PDF to Markdown Conversion API" and "PDF to HTML API". Output looks plausible; words are simply absent.
* **Data values are lost, not just prose** — currency amounts, statuses, dates, company names.
* **It hits the common case.** 27 of 39 ordinary business documents get page-level table treatment. A single-column document is the safe case, which is backwards.
* **Markdown is a standard RAG/LLM ingestion format.** Anything dropped here is invisible to every downstream system.
* **Silent by construction** — there is no signal a caller could check, short of separately running `export_as_text()` and diffing token multisets, which is what this report does.

## Root cause hypothesis

Two independent contributors:

1. **Over-eager page-level table inference.** Documents with no tabular content (a quiz, a letter, a book chapter) are being reconstructed as tables, probably from column-like whitespace alignment.
2. **Lossy cell assignment.** Given a grid, text runs are clipped to cell rectangles and anything outside the chosen cell is dropped rather than reassigned. That the surviving fragment is always the *leading* part up to the first boundary points at a per-cell clip with no "remainder" handling.

The wrapped-row symptom suggests the same clipping applied vertically: when a row's content occupies two visual lines, cells on the second line are not associated back to the row.

## Suggested fix

1. **Never discard text while fitting content to a cell grid** — assign spanning runs to one cell with a span, or split across cells. This is the core fix.
2. **Raise the bar for page-level table inference**, and make linear text flow the fallback for uncertain layout.
3. **Preserve trailing cells when a row wraps** to more than one visual line.
4. **Add a conservation invariant to the test suite**: markdown/HTML output tokens ⊇ text-layer tokens. That single assertion catches all 16 cases here, and would have caught them before release.

## Workaround

None within the conversion API. Callers who cannot tolerate loss must run `export_as_text()` alongside and reconcile, which forfeits the structure the markdown/HTML conversion exists to provide.

## Related

* **SDK-045** (filing alongside this one) — text destroyed by a `picture` region in the Vision document graph. Found while investigating this one; different pipeline, different mechanism. Notably the Vision IR keeps prose that markdown drops on the same document, which is what established these as two defects rather than one.
* **NAPY-20 / SDK-041**, **NAPY-15 / SDK-037** — same family: silent no-ops and silent partial output on layout-dependent paths.
* Full write-up and committed repro: <https://github.com/jonaddams/nutrient-sdk-samples/blob/main/docs/sdk-defects/sdk-046-markdown-column-word-loss.md>
