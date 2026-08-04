# Extraction studio — open work and hard-won facts

Written 2026-08-04, after the studio's consolidation into this repo (#43–#48).

The studio came from the standalone `nutrient-data-extraction-demo`, which is being
retired. That repo's `docs/DEVELOPMENT-NOTES.md` still holds the fuller history — the
consolidation record, the SDK defect registry pointers, and the local-model benchmark
data. **This file is the part that matters for working in the studio from here.**

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

### 3. AWS Bedrock — likely the answer to the local-model problem

**Jon has Bedrock access with vision models suitable for this (2026-08-04).** The intent is
that Bedrock **takes the place of the Local (LM Studio) option** — same "smaller / open
model" story in the provider dropdown, without the laptop dependency. Two candidates,
**Qwen and Google Gemma**, both already exercised via LM Studio.

That also retires the parked "cache local model results" design in
`nutrient-data-extraction-demo`'s `DEVELOPMENT-NOTES.md`: the whole point of caching was
that a local model could not be relied on live. A hosted one can, so there is nothing to
cache and no read-only-configuration problem to solve.

**Why this matters more than it sounds.** The local option is the single most fragile
thing in the demo, and it failed for environmental reasons repeatedly in one session:
LM Studio not running; loaded on a *different machine* than assumed; and unreachable even
then because macOS gates local-network access per app, so the LAN address timed out from
tooling while working fine from Terminal. None of that is the model's fault, and none of
it is defensible in front of a prospect. A hosted endpoint removes the whole class.

**Caveat on the existing local benchmark.** The recorded local results are
`qwen2.5-vl-7b-instruct` — 1/3 on Invoices with `totalAmount: 0.0`, and fabricated
`totalAssets`/`totalLiabilities`. **`qwen3-vl-8b` was never actually measured** (that run
was blocked by the LAN issue above), and Jon rates it well above 2.5. So do not carry the
7B numbers over to a Bedrock-hosted Qwen 3 or Gemma — they are the wrong models. Re-run
the seven-category gate once Bedrock is wired; the OpenAI and Claude results in this repo's
PR bodies are the comparison points.

Checked before writing this down, so nobody starts from the wrong assumption:

- **`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_REGION` are already in
  `python-fast-api`'s `.env`.** Credentials are not the blocker.
- **The SDK has NO native Bedrock provider.** `VlmProvider` is exactly
  `CLAUDE, CUSTOM, GOOGLE, OPEN_AI, UNKNOWN`. There is no `BEDROCK`, and no
  `BedrockApiSettings` alongside `ClaudeApiSettings`/`CustomVlmApiSettings`.

So Bedrock has to arrive through the **CUSTOM / `local`** path, which expects an
OpenAI-compatible endpoint. Two obstacles, both worth checking before committing to it:

1. **Bedrock's native API is not OpenAI-compatible** (Converse / InvokeModel, not
   `/v1/chat/completions`). Either use an OpenAI-compatible surface if one is available
   for the account and region, or put a translating proxy in front.
2. **Bedrock authenticates with SigV4 request signing, not a bearer token.** The `local`
   branch of `apply_provider()` sets only `ai.endpoint` and no credentials at all, so a
   plain endpoint override cannot authenticate. This needs a loopback shim that terminates
   SigV4 and exposes an OpenAI-compatible surface.

**There is precedent for exactly that shim in `python-fast-api`:**
`docs/sdk-feedback/benchmark-tables/gemini_auth_shim.py`, written when the CUSTOM path
was not sending an `Authorization` header at all (**SDK-039**, since fixed in 1.0.8).
Start there rather than from scratch.

**Verify with a header/request capture, not a 200.** SDK-039's entry records that the
missing-auth bug slipped through original validation *precisely because* no-auth local
servers hid it — and the `local` path is the one Bedrock would ride on.

Unrelated but adjacent: Nutrient's **AI Assistant** product lists Bedrock as a supported
backend. That is a different product (the Docker `ai-assistant` service), not the Python
SDK's Vision API, so its support says nothing about this path.

### 4. Decide the Local (LM Studio) caveat — or delete the option

A 7B makes the flagship Invoices document look broken: `qwen2.5-vl-7b-instruct` scores
1/3 with `totalAmount: 0.0`, where OpenAI and Claude both return all three including the
retainage-adjusted `345015`. It also fabricated `totalAssets`/`totalLiabilities` on a
document containing neither word.

Options: a UI caveat next to the option, recommending a larger model, or accepting it.
Unresolved since 2026-08-03 — **and likely moot**, since the plan (item 3) is for Bedrock
to replace this option outright. Do not spend effort caveating something due for removal;
settle Bedrock first.

If the local option does go, `apply_provider()`'s `local` branch and the
`LM_STUDIO_API_URL` / `LM_STUDIO_MODEL` env vars go with it — but check first whether
Bedrock ends up riding that same CUSTOM path, in which case it is renamed rather than
deleted.

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

### Providers

- `/structured` accepts `openai`, `azure`, `anthropic` (alias `claude`) and `local`.
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
