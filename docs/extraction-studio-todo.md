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

1. **SDK-045 write-up (item 7).** The only remaining item that fails *visibly* in a demo —
   pick the Healthcare category and a required field comes back empty. Not a code fix: the
   work is getting the evidence somewhere durable, since it currently lives only in a
   gitignored `DEFECTS.md` plus PR #44.
2. **Citation-colour dot (item 6)** and **the provider dropdown's loading state (item 9)** —
   both small, contained, and visible. The loading state is new as of the Bedrock work.
3. **Decide the Multimodal toggle's fate, and file the two SDK no-op defects (item 9).**
4. **Whitespace pass (item 5)** — Jon's own ask, still outstanding.
5. **Scan signalling and the Claims label (item 6)** — need a wording call from Jon before
   anything can be built.
6. **Structural cleanup (items 1, 2, 8)** — retiring Field Extraction, the two rail gaps, and
   the code residuals left behind by the Bedrock PRs. None of it shows in a demo.

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

### 5. Whitespace pass

Jon, 2026-08-03: "there's more whitespace we can remove." The footer margin already went
112px → 24px (`--space-9` → `--space-5`) and was verified across every sample. The two
biggest remaining knobs in `app/globals.css`: `--space-9` is still used by
`padding: var(--space-9) 0 var(--space-8)`, and `--section-gap` is 80px.

### 6. Smaller items

- **Claims label redundancy.** "Northgate auto claim (FNOL)" under a **Claims** header.
  Invoice labels already dropped their redundant "invoice"; this one was left pending a
  call on wording.
- **`Scanned` reads thin** as a document label, and with the text/scanned badges removed
  nothing signals which documents are scans — two of the four invoices are.
- **`hasTextLayer` has no UI consumer** since the badges went. It stays in the manifest as
  documented metadata (`docs.test.ts` pins it) and is what an OCR-oriented sample would
  key on. `DocStrip.test.tsx` asserts the badge is *absent*, so re-adding one is
  deliberate rather than reflex.
- **A custom citation colour is not displayed anywhere** except the hex field — the trade
  for not tinting the picker, which was the original ambiguity. A small colour dot in the
  corner of the dropper button would give both.

### 7. Known issue, not ours — SDK-045

Healthcare's `admissionDate` returns empty at grounding score 0.40 with no citation,
although the document plainly prints `Date of Admission: 12/04/2016`. Reproducible across
6 runs, 3 schema variants, both multimodal modes, and **two independent providers**.
Meanwhile `outOfPocketMaximum`, buried in prose on the same page, extracts at 0.95.

The mechanism: **0.40 with no citation is the SDK's "ungrounded" marker**, and it is
handled inconsistently — ungrounded values were *returned* as fabrications on one
document while an ungrounded-but-present value is *dropped* here. Full entry in
`python-fast-api/docs/sdk-feedback/DEFECTS.md` (gitignored; evidence mirrored in PR #44).

The preset is correct, so `admissionDate` is left **required** rather than softened to
optional just to make the gate pass.

**Confirmed 2026-08-05 that Bedrock does not rescue this** — the behaviour already reproduced
across two independent providers, so a third changes nothing. Treat it as a fixed property of
the SDK until filed and fixed upstream.

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

**The Multimodal toggle now honestly describes a control that does nothing.** Its text was
corrected on 2026-08-05 to say the SDK does not currently send page images, because a request
capture proved it — see the `include_page_images` entry below in the facts section. That leaves
a live control whose only effect is to set a flag the SDK ignores. Decide whether it earns its
place in a prospect-facing panel, or whether it should go until the SDK sends images. It is
wired end to end, so removing it is UI-only; `DocStrip.test.tsx`-style assertions do not pin it,
but a `StructuredConfig` test does reference the toggle.

**Two SDK no-ops are still unfiled**, both measured here and both in the same family as
SDK-037's no-op `VisionFeatures.KEY_VALUE_REGION`:

- `include_page_images` sends no images on `extract_structured` (byte-identical requests with
  the flag both ways, including on a scanned PDF).
- `groundingScore` comes back null for Bedrock model ids even though the endpoint returns
  `logprobs`. OpenAI returns 0.95 on the same document.

**The provider dropdown has no distinct loading state.** New as of the Bedrock work: gating Run
on the providers fetch means that while `providers === null` the select is empty and disabled
with the ordinary help text, so the first thing a prospect sees is a brief flash of an empty
box. Failure is distinguishable (the help text changes); loading is not. The fix is small, and
the gating that created it is worth keeping — it prevents an early click reaching a provider
with no credentials and returning an opaque 500.

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

Run from the repo root. Verified on `main` after #48, 2026-08-04.

| | Value | Command |
|---|---|---|
| Tests | **283 across 36 files** | `pnpm test` |
| Typecheck | clean | `pnpm exec tsc --noEmit` |
| Biome, changed files | 0 errors | `pnpm exec biome check <paths>` |

Scope Biome to the files you touched. `app/globals.css` reports **2 errors / 8 warnings
and always has** — verified identical before and after the footer change — and
`styles.css` carries 8 `noDescendingSpecificity` warnings that are inherent to the
deliberate source-ordering described above. Neither is something you broke.

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
