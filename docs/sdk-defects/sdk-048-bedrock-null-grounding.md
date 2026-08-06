# SDK-048 — `groundingScore` is null for Bedrock model ids, though grounding itself succeeds

Registry id **SDK-048**. **Not yet filed upstream** — same Jira permission block as
[SDK-045](sdk-045-stamped-text-loss.md); ready-to-file body at
[`napy-ticket-sdk-048.md`](napy-ticket-sdk-048.md).

Repro: [`repro/napy_047_048_flag_and_grounding.py 048`](repro/napy_047_048_flag_and_grounding.py).

| | |
|---|---|
| **Symptom** | `confidenceComponents` is **`null` entirely** for both shipping Bedrock model ids — not a populated object with a missing score |
| **The sharp part** | Grounding **worked** — `match` is `id_match` and the citation bbox is present. Only the confidence block is absent. |
| **Control** | OpenAI `gpt-5.4` returns `{"groundingScore": 0.95, "source": "no-logprobs"}` on the same document, same schema, same code path |
| **Severity** | Medium — a confidence feature silently absent for a whole class of models |
| **Verified on** | `nutrient-sdk` / `nutrient-sdk-native` **1.0.9** (compiled 2026-07-09), Python 3.12.13, macOS Darwin 25.6.0 arm64 |
| **Verified** | 2026-08-06 (re-verified live; first observed 2026-08-05) |

## Measurement

One document (`public/invoices/Invoice AC-2025-1047.pdf`), one schema, three models. Only
`ai.model`, `ai.endpoint` and `ai.api_key` differ; `ai.provider` is `"openai"` throughout,
because the SDK's flat path rejects every other value and Bedrock speaks the
OpenAI chat-completions API.

| Provider | Model | Field | Value | `match` | `groundingScore` |
|---|---|---|---|---|---|
| OpenAI | `gpt-5.4` | `invoiceNumber` | `AC-2025-1047` | `id_match` | **0.95** |
| OpenAI | `gpt-5.4` | `issueDate` | `March 1, 2025` | `id_match` | **0.95** |
| Bedrock | `qwen.qwen3-vl-235b-a22b-instruct` | `invoiceNumber` | `AC-2025-1047` | `id_match` | **`None`** |
| Bedrock | `qwen.qwen3-vl-235b-a22b-instruct` | `issueDate` | `March 1, 2025` | `id_match` | **`None`** |
| Bedrock | `google.gemma-3-27b-it` | `invoiceNumber` | `AC-2025-1047` | `id_match` | **`None`** |
| Bedrock | `google.gemma-3-27b-it` | `issueDate` | `March 1, 2025` | `id_match` | **`None`** |

Every model extracted **identical, correct values**. The difference is only the score.

### It is the whole `confidenceComponents` object that is missing

Worth stating precisely, because "null score" and "no confidence block" point at different
code:

| Provider | `metadata.invoiceNumber.confidenceComponents` | `match` | `bbox` |
|---|---|---|---|
| OpenAI `gpt-5.4` | `{"groundingScore": 0.95, "source": "no-logprobs"}` | `id_match` | yes |
| Bedrock `qwen.qwen3-vl-235b-a22b-instruct` | **`null`** | `id_match` | yes |

**`match: "id_match"` is what makes this a defect rather than a limitation.** The grounding
stage ran, located the value in the document graph, and produced a source block and a
bounding box. Everything that would let it compute a score is present. Compare
[SDK-045](sdk-045-stamped-text-loss.md), where a genuine grounding failure reports
`match: "not_found"` *with* a populated block at 0.40 — so an absent block is not how this
pipeline normally signals trouble.

### The SDK has everything it needs and drops it

Two experiments narrow this to a parsing/gating bug rather than missing data.

**1. It is not the unrecognised-model branch.** The request shape branches on model id:
recognised ids get `tools` + `tool_choice`, unrecognised ones get
`response_format: json_schema` plus `logprobs: true` / `top_logprobs: 5`. A plain OpenAI
`gpt-4.1` takes the *same* branch as the Bedrock ids — and is scored **more** richly:

| Model | Request branch | `confidenceComponents` |
|---|---|---|
| `gpt-5.4` | `tools` + `tool_choice` | `{"groundingScore": 0.95, "source": "no-logprobs"}` |
| `gpt-5` | `tools` + `tool_choice` | `{"groundingScore": 0.95, "source": "no-logprobs"}` |
| **`gpt-4.1`** | **`json_schema` + logprobs** | `{"probabilityScore": 1, "marginScore": 0.99999999998, "groundingScore": 0.95, "source": "logprobs+margin"}` |
| `qwen.qwen3-vl-235b-a22b-instruct` | `json_schema` + logprobs | **`null`** |

So the logprobs branch computes confidence perfectly well. This disproves the obvious first
guess — that the block is only built on the recognised-model path — and it was worth testing
rather than asserting.

**2. Bedrock really does return usable logprobs.** Capturing the response through a proxy:

```
REQUEST  logprobs: True   top_logprobs: 5
RESPONSE choices[0].logprobs present: True   keys: ['content', 'refusal']
         content entries: 47
         first entry: {"bytes": [123, 10], "logprob": -0.00192944717, "token": "{\n",
                       "top_logprobs": [{...}, {...}]}
SDK reported confidenceComponents: null
```

Forty-seven well-formed entries in the standard OpenAI shape — the same shape `gpt-4.1` is
scored from. The inputs are present, the branch that consumes them works for another model,
and the score is still absent.

**What is left is the model id.** Same branch, same response shape, different id, different
outcome — so something is gating scoring on the id (or on a provider/model string in the
response envelope) rather than on whether logprobs are actually there.

And note the fallback that already exists: the `tools` branch emits
`"source": "no-logprobs"` with a real 0.95, i.e. a grounding-only score computed with no
logprobs at all. Whatever the id-gating turns out to be, **the null case should degrade to
that** rather than emitting nothing.

## Why it matters

- **Confidence is a selling point of `extract_structured()`.** "Grounded extraction with a
  score per field" is the pitch; it silently becomes "grounded extraction" on Bedrock.
- **Null is indistinguishable from "not computed yet" at the call site.** A consumer
  thresholding on confidence (`score < 0.8` → review queue) either crashes on `None` or
  silently passes everything. And because the whole block is `null`, naive access
  (`meta["confidenceComponents"]["groundingScore"]`) raises rather than yielding `None` —
  our own backend only survives it by writing `(meta.get("confidenceComponents") or {})`.
- **It is provider-shaped, not document-shaped**, so it will not show up in testing that
  varies documents. Both Bedrock ids do it; OpenAI never does.
- The studio states this in the Model field's help text rather than showing an empty
  column, which was the right call but is a workaround for a defect, not a design.

## Related

- **[SDK-047](sdk-047-include-page-images-noop.md)** — found and filed alongside; same
  repro script.
- **[SDK-045](sdk-045-stamped-text-loss.md)** — the other end of the confidence story: what
  the pipeline reports when grounding genuinely fails (`not_found`, 0.40), which is why a
  silent `None` here reads as a gap rather than a signal.
- **NAPY-19 / SDK-040** — provider choice not influencing `extract_content()` output. Same
  family: provider-dependent behaviour that is not documented as such.
- This repo's **#49** body carries the original Bedrock benchmark table.
