# SDK · `confidenceComponents` comes back null for Bedrock model ids, although grounding itself succeeds (`match: id_match`, bbox present)

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Priority** | Medium — a headline feature of `extract_structured()` silently absent for a whole class of models; null is indistinguishable from "not computed" at the call site |
| **Type** | Bug |
| **Component** | Python SDK · Vision · `extract_structured()` confidence / grounding scoring |
| **Affects version** | `nutrient-sdk==1.0.9` / `nutrient-sdk-native==1.0.9` (compiled 2026-07-09) |
| **Platform** | macOS 15 (Darwin 25.6.0), ARM64, Apple M4 |
| **Python** | 3.12.13 |
| **Reporter** | Jon Addams (Customer Engineering) |
| **Date** | 2026-08-06 |
| **Registry ID** | SDK-048 |

## Summary

With `ai.include_confidence = True`, `extract_structured()` returns
`metadata.<field>.confidenceComponents` as **`null`** — the whole object, not merely a missing
score — for both model ids we ship against Bedrock's OpenAI-compatible endpoint, while
returning a populated block for `gpt-5.4` on the same document, the same schema and the same
code path:

| Provider · model | `metadata.invoiceNumber.confidenceComponents` | `match` | `bbox` |
| --- | --- | --- | --- |
| openai · `gpt-5.4` | `{"groundingScore": 0.95, "source": "no-logprobs"}` | `id_match` | yes |
| bedrock · `qwen.qwen3-vl-235b-a22b-instruct` | **`null`** | `id_match` | yes |
| bedrock · `google.gemma-3-27b-it` | **`null`** | `id_match` | yes |

**Grounding itself is not failing.** Every field comes back with `match: "id_match"`, a
`source_blocks` entry and a `bbox`. The value is located in the document graph and the citation
is usable — only the confidence block is absent. That is what makes this a defect rather than a
documented limitation: everything needed to compute a score is evidently present.

Because the block is `null` rather than a dict with a `None` value, naive access
(`meta["confidenceComponents"]["groundingScore"]`) raises instead of yielding `None`; our
backend only survives it by writing `(meta.get("confidenceComponents") or {})`.

**Two follow-up experiments narrow this to a parsing/gating bug, not missing data** — details
and captures under "Narrowing it down" below. In short: a plain OpenAI `gpt-4.1` takes the very
same request branch as the Bedrock ids and gets a *richer* confidence block, and the Bedrock
endpoint demonstrably returns 47 well-formed logprobs entries in the standard OpenAI shape. The
SDK asks for the inputs, receives them, and reports nothing.

## Steps to reproduce

Only `ai.model`, `ai.endpoint` and `ai.api_key` change between runs. `ai.provider` stays
`"openai"` throughout, because the flat path rejects every other value and Bedrock speaks the
OpenAI chat-completions API.

```python
"""napy_repro_grounding.py — groundingScore per provider, one document, one schema.

  python napy_repro_grounding.py invoice.pdf

Needs NUTRIENT_LICENSE_KEY, OPENAI_API_KEY, BEDROCK_API_KEY (long-term, not a session token).
pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""
import json, os, sys
from dotenv import load_dotenv
from nutrient_sdk import Document, License, StructuredExtractionRequest, Vision

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])
PDF = sys.argv[1]
REGION = os.environ.get("AWS_REGION", "us-east-1")
BEDROCK = f"https://bedrock-mantle.{REGION}.api.aws/v1"   # trailing /v1 is required

SCHEMA = json.dumps({"schema": {
    "type": "object",
    "properties": {
        "invoiceNumber": {"type": "string", "description": "The invoice number"},
        "issueDate": {"type": "string", "description": "The issue date, as printed"}},
    "required": ["invoiceNumber"], "additionalProperties": False}})

RUNS = [
    ("openai",  None,     os.environ["OPENAI_API_KEY"],  "gpt-5.4"),
    ("bedrock", BEDROCK,  os.environ["BEDROCK_API_KEY"], "qwen.qwen3-vl-235b-a22b-instruct"),
    ("bedrock", BEDROCK,  os.environ["BEDROCK_API_KEY"], "google.gemma-3-27b-it"),
]

print(f"\n{'provider':10} {'model':40} {'field':14} {'value':16} {'match':10} grounding")
for name, endpoint, key, model in RUNS:
    with Document.open(PDF) as doc:
        ai = doc.settings.ai_processing_settings
        ai.provider = "openai"
        ai.api_key = key
        if endpoint:
            ai.endpoint = endpoint
        ai.model = model
        ai.include_confidence = True
        ai.include_source_locations = True
        r = StructuredExtractionRequest(); r.schema = SCHEMA
        payload = json.loads(Vision.set(doc).extract_structured(r))
    ex, meta = payload.get("extraction", {}), payload.get("metadata", {}) or {}
    for field in ("invoiceNumber", "issueDate"):
        m = meta.get(field) or {}
        print(f"{name:10} {model:40} {field:14} {str(ex.get(field))[:16]:16} "
              f"{str(m.get('match')):10} {(m.get('confidenceComponents') or {}).get('groundingScore')}")
```

## Observed output

```
provider   model                                    field          value            match      grounding
openai     gpt-5.4                                  invoiceNumber  AC-2025-1047     id_match   0.95
openai     gpt-5.4                                  issueDate      March 1, 2025    id_match   0.95
bedrock    qwen.qwen3-vl-235b-a22b-instruct         invoiceNumber  AC-2025-1047     id_match   None
bedrock    qwen.qwen3-vl-235b-a22b-instruct         issueDate      March 1, 2025    id_match   None
bedrock    google.gemma-3-27b-it                    invoiceNumber  AC-2025-1047     id_match   None
bedrock    google.gemma-3-27b-it                    issueDate      March 1, 2025    id_match   None
```

All three models extracted **identical, correct values**. Both Bedrock ids report
`match: "id_match"` with a bounding box, so the grounding stage ran and succeeded; the
confidence block alone is absent.

For contrast, when grounding genuinely fails this pipeline says so loudly — a companion report
(registry SDK-045) shows a failed lookup returning `match: "not_found"` with a **populated**
block at `groundingScore: 0.4`. So an absent block is not how this pipeline signals a grounding
problem, which is what points at a scoring gap rather than a grounding one.

Document used, public:
<https://github.com/jonaddams/nutrient-sdk-samples/blob/main/public/invoices/Invoice%20AC-2025-1047.pdf>

## Narrowing it down

### 1. It is not the unrecognised-model request branch

The request shape branches on **model id**, not provider: recognised ids get `tools` +
`tool_choice`, unrecognised ones get `response_format: json_schema` plus `logprobs: true` /
`top_logprobs: 5`. A plain OpenAI `gpt-4.1` takes the *same* branch as the Bedrock ids — and is
scored **more** richly than `gpt-5.4`:

| Model | Request branch | `confidenceComponents` |
| --- | --- | --- |
| `gpt-5.4` | `tools` + `tool_choice` | `{"groundingScore": 0.95, "source": "no-logprobs"}` |
| `gpt-5` | `tools` + `tool_choice` | `{"groundingScore": 0.95, "source": "no-logprobs"}` |
| **`gpt-4.1`** | **`json_schema` + logprobs** | `{"probabilityScore": 1, "marginScore": 0.9999999999858671, "groundingScore": 0.95, "source": "logprobs+margin"}` |
| `qwen.qwen3-vl-235b-a22b-instruct` | `json_schema` + logprobs | **`null`** |

All four extracted `AC-2025-1047` with `match: "id_match"`. So the logprobs-based scoring path
works fine; the block is not merely "only built for recognised models".

### 2. Bedrock returns perfectly usable logprobs

Capturing the Bedrock response through the same proxy technique:

```
REQUEST  logprobs: True   top_logprobs: 5
RESPONSE choices[0].logprobs present: True   keys: ['content', 'refusal']
         content entries: 47
         first entry: {"bytes": [123, 10], "logprob": -0.001929447171278298, "token": "{\n",
                       "top_logprobs": [{"bytes": [123, 10], "logprob": -0.00192944717, ...},
                                        {"bytes": [123, 34], "logprob": -6.25192928, ...}]}
SDK reported confidenceComponents: null
```

Forty-seven well-formed entries, standard OpenAI shape — the same shape `gpt-4.1` is scored
from on the same branch.

**What is left is the model id.** Same branch, same response shape, different id, different
outcome. Something appears to gate scoring on the model id (or on a model/provider string in the
response envelope) rather than on whether logprobs are actually present.

## Expected behavior

`groundingScore` should be populated whenever grounding produced a match, regardless of which
model or endpoint served the request. Failing that, the absence should be explicit — a
documented per-provider capability, or a distinguishable marker — rather than `None` in the
same field that otherwise carries a float.

## Actual behavior

`confidenceComponents.groundingScore` is `None` for `qwen.qwen3-vl-235b-a22b-instruct` and
`google.gemma-3-27b-it`, while `match` and `bbox` are populated normally. `gpt-5.4` returns
0.95 for the same fields on the same document.

## Impact

* **Per-field confidence is one of the reasons to choose `extract_structured()`** over
  hand-rolled prompting. On Bedrock the pitch silently degrades from "grounded extraction with
  a score per field" to "grounded extraction".
* **`None` is not actionable at the call site.** A pipeline gating on confidence
  (`score < 0.8` → human review) either raises on `None` or, worse, treats it as passing and
  routes everything straight through.
* **It is provider-shaped, not document-shaped**, so it will not surface in testing that
  varies documents while holding the provider fixed. Both Bedrock ids do it; OpenAI never does.
* We had to state the gap in our demo UI's help text rather than show an empty confidence
  column — a reasonable workaround for a defect, but not something a customer should have to
  discover and explain.

## Root cause hypothesis

The tempting first guess was that `confidenceComponents` is only built on the recognised-model
`tools` path, so any unrecognised id loses it. **`gpt-4.1` refutes that** — unrecognised branch,
richest block of the four. Reporting this because it is the hypothesis a reader will form, and
it is already eliminated.

What the evidence supports instead: the logprobs-consuming scorer exists and works, Bedrock
supplies valid logprobs in the expected shape, and nothing is emitted anyway. The only variable
left is the **model id**. So the likely shape is an allowlist, prefix match, or provider
inference on the id — or on the response's `model` field, which Bedrock echoes as its own id —
deciding whether to score at all, rather than that decision resting on whether logprobs are
present.

A secondary possibility worth ruling out cheaply: something else in Bedrock's response envelope
(a differing `finish_reason`, a missing field, a differing `object`/`model` value) causes the
scorer to bail early and return nothing rather than degrade.

## Suggested fix

1. **Never emit `confidenceComponents: null` for a field that grounded successfully.** There is
   already a fallback in the codebase: the `tools` path produces
   `{"groundingScore": 0.95, "source": "no-logprobs"}` — a grounding-only score with no logprobs
   involved. Degrading to that is strictly better than nothing and needs no new scoring logic.
2. **Gate the logprobs scorer on whether logprobs are present, not on the model id.** Bedrock's
   response satisfies the former and evidently fails the latter, which is the wrong test.
3. If the block genuinely cannot be produced, make it **explicit** — a documented per-provider
   capability or a distinguishable marker — rather than `null` where a dict is expected. `null`
   makes ordinary access raise.
4. Add a test asserting `confidenceComponents` is populated for a successfully grounded field,
   run across the supported provider/endpoint/model matrix rather than one model. A matrix of
   one is why `gpt-4.1` and `qwen…` diverging on the same code path went unnoticed.

## Related

* **SDK-047** (filed alongside) — `include_page_images` no-op; same repro script.
* **SDK-045** (filed alongside) — how this pipeline reports a *real* grounding failure
  (`not_found`, 0.40), which is what makes a silent `None` here read as a gap.
* **NAPY-19 / SDK-040** — provider selection not influencing `extract_content()` output. Same
  family: provider-dependent behaviour that is not documented as provider-dependent.
* Full write-up and committed repro:
  <https://github.com/jonaddams/nutrient-sdk-samples/blob/main/docs/sdk-defects/sdk-048-bedrock-null-grounding.md>
