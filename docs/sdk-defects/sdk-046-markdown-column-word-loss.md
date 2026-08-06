# SDK-046 — `export_as_markdown()` / `export_as_html()` silently drop words at inferred table column boundaries

Registry id **SDK-046**. **Not yet filed upstream** — same Jira permission block as
[SDK-045](sdk-045-stamped-text-loss.md); the ready-to-file body is at
[`napy-ticket-sdk-046.md`](napy-ticket-sdk-046.md).

Repro: [`repro/napy_046_markdown_word_loss.py`](repro/napy_046_markdown_word_loss.py).
Needs only a license key — no LLM provider.

| | |
|---|---|
| **Symptom** | PDF→Markdown and PDF→HTML output is missing words that are present in the text layer. No error, no warning. |
| **Predictor** | Loss happens **if and only if** the converter wraps the page in a `<table>`. Perfect correlation across 39 documents. |
| **Mechanism** | Content that aligns with the inferred column grid survives; content spanning a boundary is truncated at the first boundary and the remainder discarded. |
| **Worst measured** | **40%** of tokens (`Drawing1.pdf`); 22% on `emergency-dept-billing-worksheet.pdf`; **16% on the studio's flagship `Invoice AC-2025-1047.pdf`** |
| **Severity** | High — silent, unbounded content loss in two licensed conversion features |
| **Verified on** | `nutrient-sdk` / `nutrient-sdk-native` **1.0.9** (compiled 2026-07-09), Python 3.12.13, macOS Darwin 25.6.0 arm64 |
| **Verified** | 2026-08-06 |

## Why this is separate from SDK-045

SDK-045 is text destroyed by a `picture` region in the **Vision document graph**. This is
different and was found while confirming that one:

- It affects `export_as_markdown()` and `export_as_html()`, **not** the Vision path. The
  worksheet's IR-lite payload to the provider carried its prose paragraph *complete*,
  while markdown dropped seven words from the same paragraph.
- It needs no stamp or overlapping graphic. It fires on plain business documents —
  invoices, forms, a quiz worksheet, a book.
- It is far more widespread: 16 of 39 sample documents, versus one.

Keeping them under one id is what produced the wrong mechanism the first time round, so
they get separate ids and separate tickets.

## The measurement

`export_as_text()` is the baseline — it is the one path that keeps everything. Token
multisets compared against it, over this repo's whole sample corpus:

| Loss | Tokens | Document | page-level table |
|---|---|---|---|
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

**27 documents produced a page-level table; worst loss among them 40%. The 12 that did
not; worst loss 1%.** Every lossy document is one the converter turned into a table.

## The mechanism

`solar-system-quiz.pdf` shows it most plainly. Text layer:

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
|---|---|---|
| `The Solar System — Science Quiz` | `The` \| `` \| `- Science Quiz` | `Solar System` |
| `SECTION 1: MULTIPLE CHOICE` | `SECTION 1:` | `MULTIPLE CHOICE` |
| `Circle the correct answer.` | `Circle the correct` | `answer.` |
| `1. Which planet is closest to the Sun?` | – | the entire line |
| `A) Venus  B) Mercury  C) Earth  D) Mars` | all four cells | **nothing** |

The answer row survives intact **because it genuinely occupies four columns**. Every other
line spans the grid and is cut at the first boundary, with the rest thrown away — not
wrapped, not moved to the next cell, not preserved anywhere.

The same shape on the worksheet, where a required data value disappears:

| Printed | Emitted | Lost |
|---|---|---|
| `EMERGENCY DEPARTMENT BILLING WORKSHEET` | `[` \| `DEPARTMENT BILLING WORKSHEET` | `EMERGENCY` |
| `Clinical Archive Dept \| System Registry: LOC-99201-B` | `Clinical` \| `LOC-99201-B` | `Archive Dept \| System Registry:` |
| `PATIENT NAME: JOHN DOE … RECORD ID: #9920-A (MASKED FILE ID)` | `PATIENT` \| `JOHN DOE` \| `ID: #9920-A` \| `FILE ID)` | `NAME:`, `RECORD`, `(MASKED` |

A second symptom on the same document: when a real table row wraps to two visual lines,
its trailing cells are lost. Row `72141` keeps its description across two rows but its
`STATUS` and `FEES` cells come back **empty**, so `Approved` and `$2,100.00` are gone —
while row `99214`, which does not wrap, keeps `Settled` and `$350.00`.

## Reproducing

```bash
pip install nutrient-sdk nutrient-sdk-native python-dotenv
export NUTRIENT_LICENSE_KEY=...
python docs/sdk-defects/repro/napy_046_markdown_word_loss.py
```

With no arguments it walks `public/documents/` and `public/invoices/`. It prints the
per-document table above plus the correlation summary. All 39 documents are committed and
public, so the numbers are reproducible by anyone with a license key.

## Impact

- **Two licensed features silently lose content.** "PDF to Markdown Conversion API" and
  "PDF to HTML API". A caller gets a plausible-looking document with words missing and no
  signal that anything was dropped.
- **Data values, not just prose.** `$2,100.00`, `$5,400.00`, `Approved`, `Denied`,
  `12/04/2016`, and on the flagship invoice `Atlas Construction LLC` and
  `Project Riverside Development`.
- **It hits the common case.** 27 of 39 ordinary business documents get the page-level
  table treatment, and any line spanning the grid loses text. A one-column document is
  the safe case, which is backwards.
- **Markdown is a normal RAG/LLM ingestion format.** Content dropped here is content the
  downstream system never knows existed.
- **It affects a shipped sample in this repo**: `/python-sdk/document-to-markdown` hits
  `/api/extraction/markdown`, and the studio's own flagship invoice loses 16% of its
  tokens through that path.

## Suggested fix

1. **Never discard text when fitting content to a cell grid.** A run that spans a
   boundary should be assigned to one cell (with a span) or split across cells — losing
   the remainder is not an acceptable outcome.
2. **Raise the bar for page-level table inference.** A quiz, a letter and a book chapter
   should not become tables; the safe fallback for uncertain layout is a linear text flow.
3. **Preserve trailing cells when a row wraps** to more than one visual line.
4. **Assert conservation in tests**: the token multiset of markdown/HTML output should be
   a superset of the text-layer tokens. That invariant would have caught all 16 cases.

## Related

- **[SDK-045](sdk-045-stamped-text-loss.md)** — text destroyed by a `picture` region in
  the Vision document graph. Found together; different pipeline, different mechanism.
- **NAPY-20 / SDK-041**, **NAPY-15 / SDK-037** — the same family of silent no-ops and
  silent partial output on layout-dependent paths.
