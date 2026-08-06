# Extraction studio — open work and hard-won facts

Written 2026-08-04, after the studio's consolidation into this repo (#43–#48).

Revised 2026-08-05, when the Bedrock provider was built, live-verified, and merged as
`python-fast-api#32` + this repo's `#49`. Item 3 was rewritten twice that day: first because the
SigV4 shim it prescribed turned out to be unnecessary and the credentials it called a
non-blocker were the only blocker, then again once real Bedrock proved both provisional model
ids wrong. Item 4 is resolved. Items 8 and 9 are new, and **"Next session — start here" below
is the priority order agreed with Jon** — read that before picking anything up.

The studio came from the standalone `nutrient-data-extraction-demo`, now retired. **This
file is the part that matters for working in the studio from here** — everything actively
needed has been carried over.

What stays only in that repo, as archive rather than working reference:

- `docs/superpowers/specs/2026-07-28-consolidation-design.md` — why the split into two repos
- `docs/superpowers/plans/2026-07-28-document-categories.md` — **Task 3 is the evidence
  record**: what each sample PDF actually carries, field by field. Superseded as a plan,
  still the source for why the category presets are what they are.
- The document byte-equivalence findings: `construction.pdf` ≡
  `westbridge-engineering-submittal-form.pdf`, and `accident-report.pdf` ≡
  `emergency-dept-billing-worksheet.pdf` (differing only in the PDF trailer `/ID`). That is
  why Claims and Finance needed generated documents, and why nine samples became seven.
- The 2026-07-30 working-tree wipe incident — all 103 tracked files deleted, cause never
  identified, recovered from git.

The sample documents themselves are already here in `public/documents/` and
`public/invoices/`, so nothing the studio loads depends on that repo.

---

## Decided, do not re-litigate

**Build the rail out; the studio absorbs the samples over time.** Jon, 2026-08-03. The
seven disabled `SOON` rail entries stay and get built. This *reverses* an earlier
decision that they should become registry samples instead — do not flip it back without
talking to Jon.

**The existing extraction samples stay until the studio actually replaces them**, then
retire one at a time. Checked 2026-08-03: the studio implements structured extraction
ONLY, and no other sample shares its endpoint. Unlisting them early deletes working
demos in favour of disabled buttons.

**Citation colour is session state, not persisted.** Every demo opens in the same
known-good colour rather than inheriting whatever the last viewer picked. It also avoids
reading `localStorage` during render, which would be a hydration mismatch.

---

## TODO

### Next session — start here

Reviewed with Jon 2026-08-05, after Bedrock shipped. Ordered by whether a prospect would
actually see it, which is not the same as ordered by effort.

1. ~~**SDK-045 write-up (item 7).**~~ **DONE 2026-08-06** — and the mechanism turned out to
   be different from what item 7 claimed. See `docs/sdk-defects/`. It also turned up
   **SDK-046**, which affects the shipped `/python-sdk/document-to-markdown` sample.
   Filing all four tickets is now **item 10** below, deferred deliberately.
2. ~~**Citation-colour dot (item 6)** and **the provider dropdown's loading state (item 9)**.~~
   **DONE 2026-08-06** (#52). Details under items 6 and 9.
3. ~~**Decide the Multimodal toggle's fate, and file the two SDK no-op defects (item 9).**~~
   **DONE 2026-08-06.** Toggle removed (Jon's call); both no-ops written up as SDK-047/048.
   Only the *filing* remains, which is item 10.
4. ~~**Whitespace pass (item 5)** — Jon's own ask.~~ **DONE 2026-08-06.** Details in item 5.
5. ~~**Scan signalling and the Claims label (item 6)**~~ **DONE 2026-08-06.** Details in item 6.
6. **Structural cleanup (items 1, 2, 8)** — retiring Field Extraction, the two rail gaps, and
   the code residuals left behind by the Bedrock PRs. None of it shows in a demo.
   ← **next up, and the last item that needs no decision from Jon.**
7. **File SDK-045 through SDK-048 upstream (item 10)** — blocked on a Jira permission, not on
   the write-ups, which are finished. Deferred by Jon 2026-08-06.

The seven disabled `SOON` rail entries are the standing direction, not a loose end — see
"Decided, do not re-litigate".

### 1. Field Extraction is removable now — no new work needed

`/python-sdk/field-extraction` is the one sample the studio genuinely supersedes. Both do
schema-driven field extraction, but `/api/extraction/fields` hand-writes a VLM prompt and
post-parses the JSON reply, while `/structured` calls the SDK's native
`extract_structured()` and gets grounded citations back. It is also built on
`VisionFeatures.KEY_VALUE_REGION`, which the SDK defect registry records as a **no-op**
(SDK-037), worked around with `describe()`.

Decide: unlist from `app/python-sdk/page.tsx` only, or also delete
`app/python-sdk/field-extraction/`. Everything else in the Extraction category should
stay until its rail feature ships.

### 2. Which rail feature replaces which sample

All nine extraction samples hit **distinct** backend endpoints, so "does the studio cover
this yet?" is answered by what `/structured` can do — not by category labels.

| Registry sample | Endpoint | Rail feature that would replace it |
|---|---|---|
| OCR Extraction | `/api/extraction/ocr` | Adaptive / Multilingual / Fast OCR |
| ICR Extraction | `/api/extraction/icr` | Local ICR |
| VLM Extraction | `/api/extraction/vlm` | VLM-enhanced ICR |
| VLM Transcription | `/api/extraction/describe` | Image description |
| Image Alt Text | `/api/extraction/describe` | Image description |
| Document to Markdown | `/api/extraction/markdown` | Text export — **a guess, confirm** |
| Table Extraction | `/api/extraction/tables` | **no rail entry exists yet** |
| Field Extraction | `/api/extraction/fields` | already superseded, see above |
| Structured Extraction | `/api/extraction/structured` | the studio itself |

Two gaps fall out of that: **Table Extraction has no successor in the rail**, and
**Document to Markdown → Text export is an assumption**, not a verified equivalence.

### 3. AWS Bedrock — SHIPPED and MERGED

**Built, live-verified and merged 2026-08-05: `python-fast-api#32` (backend, merge commit
`5d18fff`) and this repo's `#49` (studio UI, squash-merged as `1e5dc04`).** Nothing below is
open work; it is kept because every claim in it was measured, and re-deriving any of it costs
hours.

Note for anyone reading the history: `#49` was **squash-merged**, so the twelve commits behind
it — including the fix rounds that produced the model-id corrections — do not appear in `main`.
**The durable record is the two PR bodies** (`#32` and `#49`), which carry the request-capture
findings and the benchmark table, following the same convention as the gitignored
`DEFECTS.md`. A fuller decision trail exists locally at
`.superpowers/sdd/2026-08-05-bedrock-provider/progress.md`, but that path is gitignored — do not
rely on it surviving a clean checkout.

**This section replaces an earlier version that prescribed a SigV4 translating shim. That plan
was wrong and is not needed.** Full design in
`docs/superpowers/specs/2026-08-05-bedrock-provider-design.md` (local only — `docs/superpowers/`
is gitignored). Full decision trail in `.superpowers/sdd/2026-08-05-bedrock-provider/`.

**The one thing to remember when demoing it:** on the flagship `AC-2025-1047` invoice both
shipping models return the "Revised Contract" figure `1,910,500` instead of Amount Due
`345,015` — a 5.5× error on the money field that looks plausible enough to miss. This
instruction fixes both, and using it doubles as a demonstration of the Instructions field:

> For totalAmount use the final Amount Due payable now, after any retainage deduction — not
> the contract value.

OpenAI gets it unaided, so that contrast is real if both providers are shown side by side.

Bedrock now exposes an **OpenAI-compatible surface that authenticates with a plain bearer
token**, which removes every obstacle the old plan was built around:

| Endpoint | Base URL | Auth |
|---|---|---|
| `bedrock-mantle` (AWS-recommended) | `https://bedrock-mantle.{region}.api.aws/v1` | Bedrock API key or AWS creds |
| `bedrock-runtime` | `https://bedrock-runtime.{region}.amazonaws.com/v1` | SigV4 or Bedrock API key |

So there is **no shim to write**, and `gemini_auth_shim.py` is not the starting point.
`VlmProvider` having no `BEDROCK` member turns out not to matter either — see below.

What the request capture established against SDK 1.0.9:

- **`ai.endpoint` + `ai.api_key` produce `Authorization: Bearer <api_key>`.** SDK-039 really
  is fixed. With no key the SDK sends the literal `Bearer no-key`.
- **Endpoint composition is a naive append**, so the configured endpoint must end in `/v1`
  to yield `POST /v1/chat/completions`.
- **The provider string does not affect wiring on the flat path.** `local`, `openai`,
  `bedrock` and `custom` produced byte-identical requests. Only `azure` is special-cased,
  and it is *rejected* with a message that names the pattern to use:
  `"Azure OpenAI is not a supported provider for Maestro AI processing. Use 'openai'
  (optionally with an OpenAI-compatible endpoint)."`
  **Corollary: the `azure` branch in `apply_provider()` is dead code that cannot work.**
- **Request shape branches on the model id, not the provider.** An unrecognised id such as
  `qwen.qwen3-vl-235b-a22b-instruct` gets `response_format: json_schema` plus `logprobs: true`
  and `top_logprobs: 5`; `gpt-5.4` instead gets `tools` + `tool_choice` and no logprobs.

So the whole integration is roughly: `ai.provider = "openai"`, endpoint pointed at Bedrock,
`ai.api_key` = a Bedrock API key, model from a server-side allowlist.

**Credentials ARE the blocker — the previous version of this section said they were not.**
The keys in `python-fast-api/.env` belong to IAM user `textract-benchmark`
(account `157765378366`) and carry **no Bedrock permissions at all**:

```
AccessDeniedException: … not authorized to perform: bedrock:ListFoundationModels
AccessDeniedException: … not authorized to perform: bedrock:InvokeModel on
    inference-profile/us.anthropic.claude-sonnet-4-6
```

Those are Textract credentials that happen to live in the same file. Needed before anything
else: Bedrock invoke permission, per-model access granted in the console (not implied by
`InvokeModel`), and a **long-term** Bedrock API key — a short-term token expires in ≤12
hours and would break the Railway-hosted demo daily.

**Live-verified 2026-08-05 against the real endpoint**
(`https://bedrock-mantle.us-east-1.api.aws/v1`, once `textract-benchmark`'s creds were
swapped for a real Bedrock API key). The integration works end-to-end: auth, endpoint
composition, schema, and citations all function.

Two of the three provisional ids above were wrong:

- Qwen needed a suffix. The real id is `qwen.qwen3-vl-235b-a22b-instruct`.
- **`amazon.nova-pro-v1:0` does not exist on this endpoint.** `GET /v1/models` returns 55
  models and none of them are `amazon.nova-*` — there is no Nova on Bedrock's
  OpenAI-compatible surface at all. Its replacement is `google.gemma-3-27b-it`.
- `GET /v1/models` also lists models that `/v1/chat/completions` rejects
  (`google.gemma-4-31b` and `anthropic.claude-sonnet-5` both appear in the catalogue and both
  are rejected on the chat-completions route). Catalogue membership does not imply
  usability — only an end-to-end success does.

The `logprobs` risk resolved to the nastier of the two predicted outcomes:
**Bedrock accepts `logprobs: true`/`top_logprobs: 5` but returns nothing usable from them.**
`confidenceComponents.groundingScore` comes back `None` for both shipping Bedrock models,
even though the raw endpoint response does carry `logprobs`. Citations and the overlay still
work; only the confidence number is missing. `gpt-5.4` returns `0.95` on the same document, so
this is Bedrock-specific, not a document problem. Decision: ship anyway, with the UI's Model
help text stating scores are unavailable rather than silently showing nothing (see
`_components/StructuredConfig.tsx`).

One more finding, orthogonal to ids: both shipping models need an explicit instruction to get
the flagship invoice's money field right. Unprompted, both return the "Revised Contract"
figure (1,910,500) instead of "Amount Due" (345,015) — a 5.5x error. Adding the instruction
`"For totalAmount use the final Amount Due payable now, after any retainage deduction — not
the contract value."` fixes both, returning `345015.0` in ~6.5s.

**Ships:** `qwen.qwen3-vl-235b-a22b-instruct` (`Qwen3-VL 235B`, default) and
`google.gemma-3-27b-it` (`Gemma 3 27B`). Do **not** carry the old local benchmark numbers over
as comparison — those were `qwen2.5-vl-7b-instruct`, a different class of model. The OpenAI
and Claude results in this repo's PR bodies are the valid comparison points.

Unrelated but adjacent: Nutrient's **AI Assistant** product lists Bedrock as a supported
backend. That is a different product (the Docker `ai-assistant` service), not the Python
SDK's Vision API, so its support says nothing about this path.

### 4. The Local (LM Studio) caveat — resolved

**Decided 2026-08-05: Local stays, and is hidden wherever it cannot work.** This supersedes
the earlier plan to delete it, and the older question of how to caveat a weak 7B result.

The reasoning changed once the hosting picture was clear. The studio's actual subject is
*bring your own provider* — on-prem **or** cloud — so Local still carries the on-prem half of
that story when the backend runs on a laptop. What it cannot do is work on the deployed demo:
the Railway-hosted backend has no route to LM Studio on Jon's machine, so on the hosted
studio it is a dead option that errors when clicked.

The fix is a `GET /api/extraction/providers` endpoint that lists only providers whose
credential env var is present, with the dropdown built from it. `LM_STUDIO_API_URL` is set in
the laptop `.env` and never in Railway, so Local appears locally and disappears when hosted —
no network probing, no latency, nothing to time out misleadingly. The same mechanism hides any
provider whose key is missing, which is why it is worth building rather than special-casing
Local.

Therefore `apply_provider()`'s `local` branch and the `LM_STUDIO_*` env vars all stay.

### 5. Whitespace pass — DONE 2026-08-06

Jon, 2026-08-03: "there's more whitespace we can remove." Magnitudes chosen by Jon
2026-08-06 from measured options; both were the conservative pick.

**The biggest offender was not either knob this section used to name.** It was the gap
between the last content and the footer text on *every* sample page — **145px**, stacked
from three separate sources:

| Source | Was | Now |
|---|---|---|
| section `padding-bottom` (`--space-8` → `--space-7`) | 72px | **48px** |
| `.footer` `margin-top` (`--space-5`, deleted) | 24px | **0** |
| `.footer` `padding-top` (`--space-7`, unchanged) | 48px | 48px |
| border | 1px | 1px |
| **total** | **145px** | **97px** |

The `margin-top` was pure redundancy — it stacked on the footer's own `padding-top`, and
the border needs to sit against the content boundary anyway, so the separation belongs to
the padding. That token swap hit **16 call sites**, but four of them are the shared layouts
(`SampleCanvas`, `SampleFrame`, `PythonSampleLayout`, `JavaSampleLayout`), which is what
covers most sample pages.

**The landing hero went 112/72 → 72/48** (`.hero` in `app/globals.css`). 184px of a 548px
hero was padding, and the 112px left a visibly empty band under the sticky topbar. Now
484px, with the headline starting 184px down instead of 248px.

**`--section-gap` is DEAD — do not reach for it.** This section used to call it one of "the
two biggest remaining knobs". It is declared three times (`:root` 80px, spacious 112px,
dense 56px) and **consumed nowhere**; changing it does nothing. Left in place with a comment
saying so, because the density system is a documented feature and this is its natural hook.
Same story for `--spacing-3xl`, though that one is deliberately part of the legacy-alias
block, so leave the whole block alone.

**Two pages keep their 112px bottom padding on purpose:** `/document-engine` and `/workflow`
are short "In development" placeholders holding a single callout, and that padding is what
stops the footer riding up under it. `/document-engine` measures `scrollHeight == innerHeight`
exactly, so the padding is load-bearing rather than decorative.

Verified in a real browser: 97px on `/web-sdk/annotation-presets` and `/dotnet-sdk/ocr`,
light and dark, 1409px and 390px wide, no horizontal overflow, footer border intact, and the
studio's `calc(100dvh-71px)` dependency untouched (topbar still 71px, `.topbar-inner`
padding-top still 18px).

### 6. Smaller items

- ~~**Claims label redundancy.**~~ **DONE 2026-08-06** (Jon's wording call).
  "Northgate auto claim (FNOL)" → **"Northgate auto (FNOL)"**. Only the redundant "claim"
  went: "auto" still distinguishes it from a property claim, and FNOL is jargon a claims
  prospect reads as signal. `docs.test.ts` now pins the underlying rule — **no label may
  restate its own category** — so this cannot quietly regress.
- ~~**`Scanned` reads thin** as a document label.~~ **DONE 2026-08-06.** Renamed to
  **"Vandelay Industries"**, the only proper noun the page carries. It was the one label
  naming a *property* rather than a document, which made it read as a category beside its
  neighbours — and it was misleading too, since it implied it was the only scan.

  **There are four scans, not two.** Verified against the files (not trusted from the
  manifest) 2026-08-06: `Lumen`, `Vandelay Industries`, `Westbridge submittal transmittal`
  and `Straight bill of lading` all export **zero** characters; the other six export
  90–406 words. `hasTextLayer` is accurate for all ten.
- ~~**`hasTextLayer` has no UI consumer**~~ **It does now, as of 2026-08-06.** A small
  uppercase `scan` marker renders on every document whose `hasTextLayer` is false.

  **The trick is that the marker is a CHILD of `.doc-chip-name`, not a sibling.** The badge
  #43 removed was a flex sibling, so it stole width from labels that already wrap in the
  208px column — the width was the objection, not the marker. Inside the name it shares the
  label's text flow and costs no fixed width: on "Vandelay Industries" the marker simply
  wraps to a second line instead of squeezing the label. `DocStrip.test.tsx` pins the
  nesting for that reason, so making it a sibling again fails a test.

  **The space before it is load-bearing.** `margin-left` is visual only, so without a real
  space the button's accessible name concatenated to "Lumenscan". There is a test asserting
  the name reads `"Scanned invoice scan"`.

  The old "asserts the badge is absent" test was replaced rather than deleted, and its
  replacement explains why the flip was deliberate.
- ~~**A custom citation colour is not displayed anywhere** except the hex field.~~
  **DONE 2026-08-06.** A 7px dot in the bottom-right of the dropper button now carries the
  current value. It goes there because the dropper glyph runs top-right to bottom-left and
  leaves that corner empty. Two rings — an inner `--surface` border punching a gap out of
  the button, an outer `--line-strong` shadow — so a pale value does not vanish into the
  button and a dark one does not vanish into the dark theme; verified in both. The button
  itself still refuses to tint, and there is a test pinning that (`picker.style.background`
  stays empty), because tinting it is what made it read as a fifth preset.

### 7. Known issue, not ours — SDK-045 (RESOLVED as an investigation, 2026-08-06)

**Full write-up: [`docs/sdk-defects/sdk-045-stamped-text-loss.md`](sdk-defects/sdk-045-stamped-text-loss.md),
with a self-contained repro beside it. Read that, not this summary.**

Healthcare's `admissionDate` returns empty although the document plainly prints
`Date of Admission: 12/04/2016`. Still true, still not ours, and the preset is still
correct — `admissionDate` stays **required** rather than being softened to optional to
make the gate pass.

**The mechanism this section used to assert was wrong.** It said *"0.40 with no citation
is the SDK's ungrounded marker, handled inconsistently — it suppresses a real value."*
Disproven: the field is still `""` with `include_confidence` **and**
`include_source_locations` both off, i.e. grounding off entirely.

What actually happens: the rotated "ARCHIVED 2021 - DISPOSED" stamp overlaps the date
line, the layout stage replaces that region with a `{"type":"picture"}` element, and every
text block inside its bounds is discarded. The date is in the text layer but **never
reaches the model** — a request capture shows 8,033 bytes carrying `JOHN DOE` and `9920`
and neither `Date of Admission` nor `12/04/2016`. `groundingScore` 0.40 plus
`match: "not_found"` is just grounding failing to locate an empty value.

So the 6 runs, 3 schema variants and two providers were all spent on the wrong stage. **No
provider, model or prompt can fix this**, and `include_page_images` is no escape hatch
because it is itself a no-op. Reproduces with **no LLM provider at all** via
`extract_content()`.

Two things remain open:

- **The NAPY tickets are written but NOT filed.** Jira refuses: `You do not have
  permission to create issues in this project`, and lists 83 creatable projects without
  NAPY — even though NAPY-7…20 came from this same account. Bodies are ready to paste at
  `docs/sdk-defects/napy-ticket-sdk-04{5,6}.md`. Worth chasing the permission, since it
  blocks every future SDK defect filing.
- **[SDK-046](sdk-defects/sdk-046-markdown-column-word-loss.md)**, found while confirming
  this one: markdown/HTML conversion drops words at inferred table column boundaries — 16
  of this repo's 39 sample documents, up to 40% of a document's tokens, including
  **16% of the flagship `Invoice AC-2025-1047.pdf`**. That one affects the shipped
  `/python-sdk/document-to-markdown` sample, so it matters beyond the studio.

The old fabrication claim (`provider=local` inventing `totalAssets`/`totalLiabilities` on
the income statement) is **not** part of SDK-045 and was **not** re-verified —
`LM_STUDIO_API_URL` is absent so Local is not listed. It needs its own id and repro if
pursued; pairing it with the suppression is what produced the wrong mechanism above.

### 8. Code residuals left by the Bedrock PRs

All three were surfaced by review, judged non-blocking, and deliberately not fixed rather than
overlooked. None is visible in a demo.

- **`available_providers()` reads `BEDROCK_API_KEY` unstripped** while the validation path
  `.strip()`s it. So a whitespace-only key lists Bedrock in the dropdown and then 400s on Run —
  an asymmetry introduced by fixing only one side.
- **`_validate_default_models()` uses `assert`**, which `python -O` / `PYTHONOPTIMIZE` strips,
  silently removing the guard that stops `BEDROCK_STRUCTURED_MODEL` naming an unlisted model.
  Not live — nothing in the Makefile passes `-O` — but `raise RuntimeError` would be sturdier.
- **The generated snippet references an undefined `SCHEMA`** placeholder, so "runnable as
  printed" holds only modulo that. Pre-existing, not from the Bedrock work, but the snippet
  became more prominent now that it carries an endpoint and a key.

Also parked, in descending order of plausibility: `fetchProviders()` validates only that the
top-level `providers` value is an array, so a provider entry missing `models` would reach the
component and crash `.models.map` (the backend always sends it, and both sides ship together);
the two 400 `except` clauses in the router could be one tuple clause; the `aria-label`s on the
provider and model selects duplicate `Field`'s `htmlFor` association, and the test suite now
selects on them.

### 9. Multimodal toggle, the loading state, and two unfiled SDK defects

~~**The Multimodal toggle honestly describes a control that does nothing.**~~
**REMOVED 2026-08-06**, decided with Jon. A control a prospect can flip that provably changes
nothing is worse than its absence, and its help text had to admit the SDK ignores the flag —
an odd thing to put in front of a prospect.

**Do not re-add it without checking `include_page_images` is honoured.** The request plumbing
(`includePageImages` in `lib/api.ts`, sent explicitly as `false`) is intact, so restoring it is
a `Toggle` plus one piece of state. `StructuredConfig.test.tsx` now asserts the toggle is
**absent**, in the same spirit as `DocStrip.test.tsx`'s badge test, so re-adding it is a
decision that also updates a test rather than a reflex. Written up as
[SDK-047](sdk-defects/sdk-047-include-page-images-noop.md).

~~**Two SDK no-ops are still unfiled.**~~ **Both written up 2026-08-06** — filing is item 10.
Both were re-measured that day rather than carried over from notes, and the second turned out
to be sharper than the note said:

- **[SDK-047](sdk-defects/sdk-047-include-page-images-noop.md)** — `include_page_images` sends
  no image. Byte-identical requests (same SHA-256) with the flag both ways, on a text PDF and a
  scanned one.
- **[SDK-048](sdk-defects/sdk-048-bedrock-null-grounding.md)** — **the whole
  `confidenceComponents` object is `null`** for Bedrock ids, not just its score, while
  `match: "id_match"` and the bbox are present. Two experiments narrow it to a gating bug
  rather than missing data: `gpt-4.1` takes the *same* request branch as the Bedrock ids and
  gets the *richest* block of all, and Bedrock's own response carries 47 well-formed logprobs
  entries. Because it is `null` rather than a dict, naive access raises — `parse_structured()`
  only survives it via `(meta.get("confidenceComponents") or {})`.

~~**The provider dropdown has no distinct loading state.**~~ **DONE 2026-08-06.** While the
fetch is in flight the select now carries `aria-busy`, a `Loading providers…` placeholder
option so the box is never blank, and its own help text ("Checking which providers this
backend can serve…"). All three clear on resolve, and a failed fetch shows the failure text
with no `aria-busy` — so loading, ready and failed are now mutually distinguishable, where
before loading and ready shared one help text over an empty box.

**The placeholder option must carry `provider`'s current value.** Any other value leaves the
controlled `<select>` with no matching option, and React falls back to rendering the first —
of which there is none while loading. There is a test pinning this specifically.

The Run gating that created the flash stays: it prevents an early click reaching a provider
with no credentials and returning an opaque 500.

### 10. File SDK-045 through SDK-048 upstream — blocked on a Jira permission

**Deferred by Jon 2026-08-06.** Nothing about the write-ups is outstanding; this is purely
the filing step.

Both ticket bodies are finished and ready to paste, in NAPY house style (metadata table,
self-contained repro, observed output, root-cause hypothesis, suggested fix, related):

- `docs/sdk-defects/napy-ticket-sdk-045.md` — text destroyed under a rotated stamp
- `docs/sdk-defects/napy-ticket-sdk-046.md` — markdown/HTML word loss at column boundaries
- `docs/sdk-defects/napy-ticket-sdk-047.md` — `include_page_images` no-op
- `docs/sdk-defects/napy-ticket-sdk-048.md` — `confidenceComponents` null on Bedrock ids

File each as **NAPY / Bug / priority High**, labels `python-sdk` `sdk-defect-hunting`
`vision` — matching NAPY-15/16/17. Then write the returned issue key into the header of
the corresponding `docs/sdk-defects/sdk-04*.md` (each says "Not yet filed upstream"), and
into the backend's `DEFECTS.md` row.

**The blocker:** creating them programmatically fails with

```
You do not have permission to create issues in this project.
```

and querying Jira for creatable projects returns **83 projects with NAPY absent** — so it
is a project-permission gap, not a malformed request. That is despite NAPY-7 through
NAPY-20 having been filed from this same account, so something changed in NAPY's
permission scheme. **Worth chasing on its own merits: it blocks every future SDK defect
filing, not just these two.** Filing from the browser may well work even though the API
path does not — try that first, it is the cheapest test.

---

## Facts that will cost you time if you rediscover them

### `useCitationAnnotations.ts` — four invariants enforced only by comments

It owns the citation annotation lifecycle behind a single serialised FIFO mutation queue.

1. **Never `await enqueue(...)` from inside a queued task** — the chain would wait on
   itself. `enqueue` returns `void` to make the mistake unexpressible. Do not "helpfully"
   restore a return value.
2. **The annotation-sync effect must stay declared *before* the emphasis effect.** React
   runs effects in declaration order, and that ordering is what lets the emphasis task see
   populated maps.
3. **`applyEmphasis` is never called outside a queued task.**
4. **Anything affecting an annotation's appearance must be part of `PaintedStyle`**, the
   value `diffStyles` compares. It originally compared only the style key, so changing the
   colour while the selection stayed put produced an **empty diff and repainted nothing** —
   the picker looked dead. Extend `PaintedStyle` and the comparison; do **not** add a
   "restyle everything" bypass, because a second mutation path is what the queue exists to
   prevent. Whatever you add also belongs in both effects' dependency arrays.

Also: `page.tsx`'s `citations` memo is keyed on `[result]`, **not** `[fields]`, with a lint
suppression. `fields` is rebuilt every render, so keying on it makes the sync effect delete
and recreate every annotation continuously. Do not "fix" that suppression. And
`DocViewer.tsx`'s load effect is keyed on `[docPath]` alone — adding `citations`
reintroduces a full document reload after every extraction.

### CSS: source order decides, and failures are silent

Every rule in `styles.css` is scoped under `.studio-shell` — 13 of its class names already
exist in `app/globals.css` (`.btn` 19 rules, `.chip` 8, `.field` 6, …), so the prefix is
what stops the studio restyling every other sample. **Studio markup rendered outside
`.studio-shell` silently loses its styling.**

Because everything shares that prefix, **responsive overrides have the same specificity
(0,2,0) as the base rules they override, so source order alone decides.** The rail's
`@media (max-width: 1024px)` block therefore lives at the **end** of the file. Placed
earlier it parses fine and does nothing — that happened twice while building the rail
layout, caught only by checking computed styles, never by reading the CSS. If you add rail
styles below that block, move the block down too.

Related: **`overflow-y: visible` does not undo `overflow: hidden`.** With the other axis
hidden it computes to `auto`, so the override *adds* a scrollbar instead of removing one.

### Layout

The studio's outer element is `h-[calc(100dvh-67px)] md:h-[calc(100dvh-71px)]`, not
`h-screen`. It does **not** start at the top of the viewport — the host renders a sticky
`header.topbar` above it — so plain `100vh` overflowed by exactly the topbar's height and
`overflow-hidden` clipped the bottom, putting the document list out of reach. The topbar
has no fixed height; it comes from `.topbar-inner`'s padding in `globals.css` (16px below
768px, 18px at/above), hence the two values, which track Tailwind's `md` = the host's own
breakpoint. **If `.topbar-inner` padding changes, change these.**

The rail **pins the document controls and lets the feature list scroll inside itself**, not
the other way round. All three sections together exceed the column on a 1070px window; if
the rail scrolled as one block the document list is what would disappear, which is the
problem the layout exists to fix.

### Measuring

`.rail-tip` tooltips are `position: absolute` and **inflate `scrollHeight`**, so
`scrollHeight > clientHeight` is *not* evidence of clipped content in the feature nav.
Check button boxes instead. This produced a false regression report.

### The schema needs an outer envelope, and the error for omitting it is a red herring

**`InvalidArgumentException` error code 3016 `[Source: Vision]` means `request.schema` is
missing its outer `{"schema": {…}}` wrapper.** `buildSchema()` in `lib/schema.ts` emits that
wrapper; a bare JSON Schema — the shape you would write by hand or copy from the JSON Schema
docs — is rejected.

Two things make this expensive to rediscover. The rejection happens **before any HTTP request
is made**, so it looks exactly like a provider-configuration error; and the message names
neither the schema nor the envelope. On 2026-08-05 it consumed four debugging runs and
produced a false conclusion that `/structured` had regressed on every provider — the endpoint
was healthy the whole time. `/describe` and `/tables` continuing to work is the tell that it is
not the license, the env, or Vision generally: those use the Claude settings path, so only the
flat path was implicated.

### `include_page_images` is a no-op on `extract_structured`

Verified 2026-08-05 by capturing the outbound request: **no image ever reaches the wire.** Not
with the flag on, not on `scanned-invoice.pdf`. Requests were byte-identical with the flag both
ways (8,600 bytes for the scanned invoice), and message content parts were
`['str(system)', 'text', 'text']` in every run. The SDK sends a text "IR-lite" layout
representation instead.

Consequence for demos: **a vision model's vision is never exercised on this endpoint**, so do
not describe the models as doing vision. Multimodal models still work — just not for that
reason. Probably a genuine SDK defect, in the same family as SDK-037's no-op
`KEY_VALUE_REGION`, and worth filing.

### Providers

- `/structured` accepts `openai`, `azure`, `anthropic` (alias `claude`), `bedrock` and `local`.
  **`azure` cannot work** — the SDK rejects it outright (see TODO item 3), so that branch of
  `apply_provider()` is dead code.
- **The schema must set `additionalProperties: false`** or Anthropic returns
  `400 invalid_request_error`. `buildSchema()` emits it; anything hand-rolling a schema
  must too. Verified harmless for OpenAI, which is why it is unconditional.
- The backend's flat `ai.provider`/`ai.model` path has **no default model**, unlike
  `ClaudeApiSettings`. Omitting it raises `AiProcessing model is required`, which reads as
  though the provider were unsupported. It is not.
- **Two provider-configuration mechanisms coexist in `python-fast-api`.** `/describe`,
  `/tables`, `/markdown` and `/fields` use `VlmProvider.CLAUDE` +
  `get_claude_api_settings()`; `/structured` uses the flat path. One file's pattern does
  not imply the other's.

---

## Baselines

Run from the repo root. Re-measured on `main` at `13cc4ef` (after #50), 2026-08-06.

| | Value | Command |
|---|---|---|
| Tests | **219 across 30 files** | `pnpm test` |
| Typecheck | clean | `pnpm exec tsc --noEmit` |
| Biome, changed files | 0 errors | `pnpm exec biome check <paths>` |

**The previous figure in this table — "283 across 36 files, verified on `main` after
#48" — was wrong, and cost a few minutes chasing 64 phantom tests.** There were only
**28** test files in the tree at #48 (`git ls-tree -r --name-only 3948b6c | grep -c
'\.test\.tsx\?$'`), and 30 now, #49 having added `providers.test.ts` and `page.test.tsx`.
Thirty is also all that exist: no `*.spec.*`, no Playwright suite, and `tests/` holds only
`setup.ts`, so `pnpm test` covers everything. If a future count comes in *below* 219,
check for deleted files before assuming a regression — three test files have been deleted
in this repo's history (`git log --diff-filter=D --name-only -- '*.test.tsx'`).

Scope Biome to the files you touched. `app/globals.css` reports **2 errors / 8 warnings
and always has** — re-confirmed 2026-08-06 by diffing Biome output against `main`, where
only the line numbers moved — and `styles.css` carries 8 `noDescendingSpecificity` warnings
that are inherent to the deliberate source-ordering described above. Neither is something
you broke.

**Several sample pages also carry pre-existing Biome errors**, so "Biome is red on a file I
touched" is not by itself evidence of a regression. The whitespace pass touched 14 `.tsx`
files and Biome reported 8 errors / 4 warnings across them — every one a
`lint/style/noNonNullAssertion` on a line the change never went near
(`app/dotnet-sdk/{ocr,optimize,linearize}/page.tsx` and the `api/` pages). The reliable check
is to diff Biome's output against `main` for the same file, which came back byte-identical.

Backend: `cd ~/SE/code/python-fast-api && .venv/bin/uvicorn app.main:app --port 8080`
(**not** 8000 — `.env.local` points at 8080; the backend has no `/` route, so health-check
`/docs`). Frontend: `pnpm exec next dev --turbopack`.

### Environment traps that are not obvious and will recur

Carried over from the retired demo repo, because all three cost real time and none of them
look like what they are.

**A LAN address can be unreachable from tooling while working fine from Terminal.**
macOS gates local-network access **per app**. If the editor or agent host lacks the grant,
loopback and the public internet work while *every* LAN address silently times out —
including the machine's own routable IP. `route -n get` is a local syscall and answers
normally, which makes it look like routing. It is not. The discriminator:
internet ✓ / loopback ✓ / LAN ✗, and the same `curl` succeeding from Terminal.app. Fix by
granting the host app Local Network in System Settings → Privacy & Security (usually needs
an app restart), or relay through loopback from a Terminal that already has the grant.
This is why the remote LM Studio run never happened, and it is a live constraint on the
Bedrock work in item 3.

**`pnpm` can be absent from non-interactive shells.** `~/.zshrc` exports `$PNPM_HOME/bin`,
but zsh only sources `.zshrc` for *interactive* shells, so scripts and agent shells can
inherit a stale entry and fail with `command not found` while your terminal is fine.
Prefix `export PATH="$HOME/Library/pnpm/bin:$PATH"`, or move the block to `~/.zshenv`.

**HMR does not reliably connect here, so a clean-looking check can be a stale bundle.**
Hard-reload before browser checks, and when a CSS or config change appears to do nothing,
**fetch the served chunk and grep it** before debugging the source. That caught two real
problems: a `globals.css` edit the dev server never recompiled (chunk hash unchanged), and
the inverse — a correct change that looked broken. Trusting the rendered page over the
served asset wastes hours in both directions.

### Two traps in the backend's own test suite

Both found 2026-08-04 running `pytest tests/ --ignore=tests/sdk` after #31 merged.

**`test_vlm_endpoint_returns_503_when_local_vlm_unavailable` fails when LM Studio is
running.** It asserts an *absence*: the default VLM engine connects to `localhost:1234`,
and the test expects a clean 503 when nothing is there. With LM Studio up the call
succeeds, so the 503 never comes and the suite goes red. Nothing is broken — the
precondition is simply violated, and the test's own comment says so. **Stop the local VLM
server before trusting a full backend run**, or expect this one failure and ignore it.
Worth fixing properly at some point: an environment-dependent assertion that flips on
whether an unrelated app happens to be open is a bad citizen in a default suite.

**That run is not free and not fast.** 68 tests took **7 minutes** and several endpoints
make real provider calls. `--ignore=tests/sdk` skips the SDK defect-hunting suite but not
the live extraction endpoints. Budget for it, and prefer targeted runs
(`pytest tests/test_structured.py -k "not live and not endpoint and not extract"`, which
is pure and finishes in well under a second).
