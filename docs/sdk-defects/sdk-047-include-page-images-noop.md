# SDK-047 — `include_page_images` is a no-op on `extract_structured()`

Registry id **SDK-047**. **Not yet filed upstream** — same Jira permission block as
[SDK-045](sdk-045-stamped-text-loss.md); ready-to-file body at
[`napy-ticket-sdk-047.md`](napy-ticket-sdk-047.md).

Repro: [`repro/napy_047_048_flag_and_grounding.py 047`](repro/napy_047_048_flag_and_grounding.py).

| | |
|---|---|
| **Symptom** | `ai.include_page_images = True` changes nothing. No image reaches the provider. |
| **Evidence** | The outbound request body is **byte-identical** with the flag on and off — same SHA-256 — on a text PDF *and* a scanned one. |
| **Severity** | Medium — a settable, documented-looking flag that silently does nothing |
| **Verified on** | `nutrient-sdk` / `nutrient-sdk-native` **1.0.9** (compiled 2026-07-09), Python 3.12.13, macOS Darwin 25.6.0 arm64 |
| **Verified** | 2026-08-06 (re-verified; first observed 2026-08-05) |

## Measurement

Captured by pointing `ai.endpoint` at a local recording proxy that logs each body and
forwards it to the real API — so this compares bytes on the wire, not anything the SDK
reports about itself.

| Document | flag | bytes | sha256 | message content parts | image? |
|---|---|---|---|---|---|
| `Invoice AC-2025-1047.pdf` | `False` | 15011 | `eddf4565b613c4d8` | `['str(system)', 'text', 'text']` | no |
| `Invoice AC-2025-1047.pdf` | **`True`** | 15011 | `eddf4565b613c4d8` | `['str(system)', 'text', 'text']` | no |
| `scanned-invoice.pdf` | `False` | 8965 | `bde064cff9f1bbed` | `['str(system)', 'text', 'text']` | no |
| `scanned-invoice.pdf` | **`True`** | 8965 | `bde064cff9f1bbed` | `['str(system)', 'text', 'text']` | no |

No `image_url` part, no `base64`, no image content part — either way. The SDK sends a text
"IR-lite" layout representation instead, and only that.

The scanned document matters: if the flag were going to do anything anywhere, a page with
no text layer worth speaking of is where it would.

### One caveat, so nobody is misled by a hash mismatch

An earlier run of the text PDF produced the same **byte length** but a different hash. The
difference was **reading-order nondeterminism between runs**, not the flag: blocks `b22`
and `b23` (`"AC-2025-1047 INVOICE NO:"` and `"DATE: March 1, 2025"`) swapped places, along
with their two bounding boxes. Same content, same length, different order.

So "byte-identical" is the usual result but not guaranteed run to run. The claim that
survives either way is the one that matters: **no image is ever present.** That is a small
determinism wart worth knowing about separately — identical inputs producing a differently
ordered document graph.

## Consequences

- **A vision model's vision is never exercised on this endpoint.** Do not describe the
  models as "reading the page" in a demo; they read the SDK's text IR. Multimodal models
  still work, just not for that reason.
- **It removes the escape hatch for [SDK-045](sdk-045-stamped-text-loss.md).** When the
  layout stage discards text under a stamp, the obvious workaround is "send the pixels
  too" — and it is unavailable, so the model can see neither the text nor the image.
- **The studio's Multimodal toggle was removed on 2026-08-06** because of this. It was a
  control a prospect could flip that provably changed nothing, and its help text had to
  admit as much. The request plumbing (`includePageImages` in `lib/api.ts`) is intact, so
  restoring it is a `Toggle` plus one piece of state once the flag is honoured. There is a
  test asserting its absence, so re-adding it is a decision rather than a reflex.

## Related

- **NAPY-15 / SDK-037** — `VisionFeatures.KEY_VALUE_REGION` is a no-op. Same family, and
  the reason a no-op is worth filing rather than shrugging at.
- **[SDK-045](sdk-045-stamped-text-loss.md)** — the defect this one denies a workaround to.
- **[SDK-048](sdk-048-bedrock-null-grounding.md)** — found and filed alongside; same repro
  script.
