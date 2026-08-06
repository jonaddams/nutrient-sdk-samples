# SDK · Text under a rotated stamp is silently discarded by the layout stage — `extract_structured()` returns `""` for a plainly-printed required field

| Field | Value |
| --- | --- |
| **Severity** | High |
| **Priority** | High — silent data loss on a common real-world document feature; the call reports success and the diagnostic metadata points at the wrong stage |
| **Type** | Bug |
| **Component** | Python SDK · Vision · document-graph / layout analysis (`extract_content()`, `extract_structured()`) |
| **Affects version** | `nutrient-sdk==1.0.9` / `nutrient-sdk-native==1.0.9` (compiled 2026-07-09) |
| **Platform** | macOS 15 (Darwin 25.6.0), ARM64, Apple M4 |
| **Python** | 3.12.13 |
| **Reporter** | Jon Addams (Customer Engineering) |
| **Date** | 2026-08-06 |
| **Registry ID** | SDK-045 |

## Summary

When a rotated stamp or watermark is drawn **across** a line of text, the layout stage replaces that page region with a single `{"type": "picture"}` element and **discards every text block whose geometry falls inside its bounds**. The text is still in the text layer — `export_as_text()` returns it — but it is absent from the document graph, and therefore absent from the IR-lite payload `extract_structured()` sends to the provider.

The visible consequence is that a **required** schema field comes back as an empty string:

```json
{ "patientName": "JOHN DOE", "admissionDate": "" }
```

with metadata:

```json
"admissionDate": {
  "match": "not_found",
  "source_blocks": [],
  "source_bboxes": [],
  "confidenceComponents": { "groundingScore": 0.4, "source": "no-logprobs" }
}
```

No exception, no warning — the envelope reports success.

**The `groundingScore: 0.40` / `match: "not_found"` pair is a symptom, not the cause, and it is actively misleading.** It reads as a confidence or model-quality problem, so the natural response is to change the prompt, the schema, or the provider. None of that can work: the value was removed before any model was called. In our case that misdirection cost six extraction runs, three schema variants and two independent providers before the request capture showed the text had never been sent.

Confirmed as pre-provider text loss: `Vision.extract_content()`, which involves **no LLM provider at all**, loses the text identically. So this is not a model failure.

## Steps to reproduce

Fully self-contained — builds its own two-PDF fixture with the SDK's own HTML → PDF, so no external document is needed. **Stage 1 requires only a license key** (no LLM credentials), which is the cleanest way to see the defect.

```python
"""napy_repro_stamp.py — text under a rotated stamp is dropped from the document graph.

  python napy_repro_stamp.py

Stage 1 (NUTRIENT_LICENSE_KEY only):
  export_as_text() finds "12/04/2016" in BOTH PDFs — the text layer is intact.
  Vision.extract_content() finds it only in the UNSTAMPED one.
Stage 2 (also OPENAI_API_KEY): extract_structured() returns "" for a required field.

pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""
import json, os
from dotenv import load_dotenv
from nutrient_sdk import (Document, License, StructuredExtractionRequest,
                          Vision, VisionFeatures)

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])
NEEDLE = "12/04/2016"

STAMP = '<div class="stamp">ARCHIVED 2021 - DISPOSED</div>'
DASHED = "border: 2px dashed #888;"

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>
  body {{ font: 15px monospace; margin: 40px; }}
  .frame {{ position: relative; height: 150px; {frame} }}
  h1 {{ font: bold 20px monospace; margin: 6px 0; }}
  .date {{ position: absolute; right: 0; bottom: -11px; color: #555; }}
  .stamp {{ position: absolute; right: 20px; bottom: -46px; transform: rotate(-12deg);
            border: 3px solid #b32; color: #b32; font: bold 26px sans-serif;
            padding: 10px 18px; letter-spacing: 1px; }}
  .row {{ margin: 26px 0 14px; }}
</style></head><body>
  <div class="frame">
    <h1>EMERGENCY DEPARTMENT BILLING WORKSHEET</h1>
    <div>Clinical Archive Dept | System Registry: LOC-99201-B</div>
    <div class="date">Date of Admission: 12/04/2016</div>
    {stamp}
  </div>
  <div class="row">PATIENT NAME: JOHN DOE</div>
  <div class="row" style="text-align: right;">RECORD ID: #9920-A (MASKED FILE ID)</div>
  <div class="row">FACILITY SUB-TOTAL: $4,300.00</div>
</body></html>"""

# The four variants isolate the trigger: only the OVERLAPPING STAMP matters.
VARIANTS = [("plain", "", ""), ("dashedbox", DASHED, ""),
            ("stamp", "", STAMP), ("both", DASHED, STAMP)]

SCHEMA = json.dumps({"schema": {
    "type": "object",
    "properties": {
        "patientName":   {"type": "string", "description": "The patient's name, as printed"},
        "admissionDate": {"type": "string", "description": "The date of admission, as printed"}},
    "required": ["patientName", "admissionDate"],
    "additionalProperties": False}})

def build(name, frame, stamp):
    html, pdf = f"v-{name}.html", f"v-{name}.pdf"
    open(html, "w").write(PAGE.format(frame=frame, stamp=stamp))
    with Document.open(html) as doc:
        doc.export_as_pdf(pdf)
    return pdf

def in_text_layer(pdf):
    with Document.open(pdf) as doc:
        doc.export_as_text(pdf + ".txt")
    return NEEDLE in open(pdf + ".txt", encoding="utf-8", errors="replace").read()

def content_graph(pdf):
    # VisionFeatures.ALL, not a narrow selection — see NAPY-20.
    with Document.open(pdf) as doc:
        doc.settings.get_vision_settings().set_features(VisionFeatures.ALL.value)
        raw = str(Vision.set(doc).extract_content())
    picture, stack = None, [json.loads(raw)]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            if str(node.get("type", "")).lower() == "picture":
                picture = {k: v for k, v in node.items() if k not in ("children", "points")}
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
    return NEEDLE in raw, picture

def structured(pdf):
    with Document.open(pdf) as doc:
        ai = doc.settings.ai_processing_settings
        ai.provider = "openai"
        ai.api_key = os.environ["OPENAI_API_KEY"]
        ai.model = "gpt-5.4"
        ai.include_confidence = True
        ai.include_source_locations = True
        r = StructuredExtractionRequest(); r.schema = SCHEMA
        p = json.loads(Vision.set(doc).extract_structured(r))
    m = (p.get("metadata") or {}).get("admissionDate") or {}
    return (p.get("extraction", p)).get("admissionDate"), m.get("match"), \
           (m.get("confidenceComponents") or {}).get("groundingScore")

pdfs = {n: build(n, f, s) for n, f, s in VARIANTS}

print("\nStage 1 — license key only, no LLM provider")
print(f"{'variant':12} {'export_as_text':15} {'extract_content':16} picture")
for n, pdf in pdfs.items():
    found, pic = content_graph(pdf)
    print(f"{n:12} {('FOUND' if in_text_layer(pdf) else 'LOST'):15} "
          f"{('FOUND' if found else 'LOST'):16} {pic.get('classification') if pic else '-'}")
    if n == "stamp" and pic:
        print("\n  picture element that replaced the date line:\n ",
              json.dumps(pic, indent=2).replace("\n", "\n  "), "\n")

if os.environ.get("OPENAI_API_KEY"):
    print("\nStage 2 — what extract_structured() returns")
    print(f"{'variant':12} {'admissionDate':16} {'match':11} groundingScore")
    for n, pdf in pdfs.items():
        v, match, g = structured(pdf)
        print(f"{n:12} {repr(v):16} {str(match):11} {g}")
```

## Observed output

### Stage 1 — no LLM provider involved

```
variant      export_as_text  extract_content  picture
plain        FOUND           FOUND            -
dashedbox    FOUND           FOUND            -
stamp        FOUND           LOST             line_chart
both         FOUND           LOST             line_chart
```

The text layer contains the date in **all four**. The document graph loses it in exactly the two with an overlapping stamp. The dashed border around the same region changes nothing, and a stamp placed elsewhere on the page (not overlapping) also changes nothing — **overlap is the condition**.

### The element that replaced the text

```json
{
  "type": "picture",
  "classification": "line_chart",
  "classificationConfidence": 0.4668875,
  "altDescription": "",
  "readingOrder": 3,
  "pageNumber": 1,
  "bounds": { "x": 2928.4182, "y": 191.15796, "width": 923.5818, "height": 298.61615 }
}
```

A rotated *text* stamp is classified as a **`line_chart`** at **0.467 confidence**, and that low-confidence guess is nonetheless allowed to delete the text within its bounds. `altDescription` is empty, so nothing replaces what was removed.

### Stage 2 — what the caller sees

```
variant      admissionDate    match       groundingScore
plain        '12/04/2016'     id_match    0.95
dashedbox    '12/04/2016'     id_match    0.95
stamp        ''               not_found   0.4
both         ''               not_found   0.4
```

An empty string — not `null`, not an error — for a field the schema marks **required**.

### More than one block is lost

The IR-lite payload for the unstamped variant carries six blocks, the date at `b3`:

```json
[["b0",["h2","EMERGENCY DEPARTMENT BILLING WORKSHEET"]],
 ["b1","Clinical Archive Dept | System Registry: LOC-99201-B"],
 ["b2","PATIENT NAME: JOHN DOE"],
 ["b3","Date of Admission: 12/04/2016"],
 ["b4","RECORD ID: #9920-A (MASKED FILE ID)"],
 ["b5","FACILITY SUB-TOTAL: $4,300.00"]]
```

The stamped variant carries five, and **both** the date line and the RECORD ID line are gone:

```json
[["b0",["h2","EMERGENCY DEPARTMENT BILLING WORKSHEET"]],
 ["b1","Clinical Archive Dept | System Registry: LOC-99201-B"],
 ["b2","PATIENT NAME: JOHN DOE"],
 ["b3",{"type":"picture","classification":"line_chart"}],
 ["b4","FACILITY SUB-TOTAL: $4,300.00"]]
```

Everything geometrically inside the picture's bounds is discarded, not only the line the stamp visibly touches.

### Confirmation on a real document

Same behaviour on a real one-page worksheet (`emergency-dept-billing-worksheet.pdf`, public: <https://github.com/jonaddams/nutrient-sdk-samples/blob/main/public/documents/emergency-dept-billing-worksheet.pdf>), which carries a rotated "ARCHIVED 2021 - DISPOSED" stamp across its `Date of Admission: 12/04/2016` line. There the region is classified `logo` rather than `line_chart`, with bounds x 980–1578, y 139–265 on a 1654×2339 page — exactly where the date sits.

Capturing the outbound request body confirms the omission end to end: 8,033 bytes, `messages[1].content` = two `text` parts (no image), containing `JOHN DOE` and `9920` but **neither `Date of Admission` nor `12/04/2016`**.

The stamp there is **page content** — a rotated vector box plus rotated text — not an annotation: the file has no `/Annots` and no image XObjects.

On that document the loss is **not confined to the Vision path**:

| Export | `12/04/2016` |
| --- | --- |
| `export_as_text()` | FOUND |
| `export_as_markdown()` | **LOST** |
| `export_as_html()` | **LOST** |
| `Vision.extract_content()` | **LOST** |
| `Vision.extract_structured()` | **LOST** |

So PDF→Markdown and PDF→HTML conversion are silently affected too. (The synthetic pair does *not* reproduce the markdown/HTML half, so those pipelines are not identical to the Vision one. The real document's markdown output additionally drops words with no stamp near them — `EMERGENCY` from the title, `Archive Dept | System Registry:` from the next line, `NAME:` after `PATIENT` — which looks like a separate, broader PDF→Markdown text-loss problem. Flagging it here rather than conflating it; happy to file separately.)

## Expected behavior

Text present in the page's text layer should reach the document graph — and therefore the provider — regardless of what graphics overlap it. If a region is classified as a picture, the classification should annotate the region, not delete its text content.

Failing that, a `required` schema field the pipeline cannot supply should be reported as such (an error, or `null` plus a diagnostic naming the discarded region) rather than returned as `""` under a success envelope.

## Actual behavior

The region is replaced by a `picture` element and the enclosed text blocks are dropped from the graph. `extract_structured()` sends the provider a payload with no evidence for the field, the model correctly returns `""`, and grounding — unable to locate an empty value — reports `match: "not_found"` with `groundingScore: 0.40`, which attributes an upstream layout failure to model confidence.

## Impact

* **Silent data loss on an ordinary document feature.** `ARCHIVED`, `VOID`, `PAID`, `DRAFT`, `CONFIDENTIAL`, `SUPERSEDED` — stamps over content are routine in the documents customers process. Any one landing across a field deletes that field's value from every layout-aware output.
* **The failure is invisible.** No exception, no warning, a success envelope, and an empty string for a required field. A pipeline that trusts the envelope stores a blank.
* **The diagnostics point at the wrong component.** `groundingScore: 0.40` sends users to prompts, schemas and model selection. Six runs, three schema variants and two providers here, all wasted.
* **No workaround from the public API.** `include_page_images = True` is itself a no-op on `extract_structured()` — a capture shows byte-identical requests with the flag both ways and no image part — so the model can see neither the text nor the pixels. The only recovery is to run `export_as_text()` separately and reconcile, which forfeits the point of schema-driven extraction.
* **Blast radius beyond Vision**: PDF→Markdown and PDF→HTML on the real document, both licensed features.

## Root cause hypothesis

The layout/segmentation stage assigns the stamped region a `picture` classification, and graph construction then treats a picture as **opaque** — emitting one element for the region and dropping the text blocks it contains, rather than keeping them as children or siblings. The evidence for "dropped rather than merged" is that the text appears nowhere in the graph, and that a second, non-overlapped line (`RECORD ID`) inside the same bounds is lost with it.

`classificationConfidence: 0.467` suggests the classifier is uncertain and is not gated on confidence before taking a destructive action.

## Suggested fix

1. **Never discard text blocks because of a region classification.** Keep them as children of the picture element (or as siblings retaining reading order) so downstream consumers can still see them. This alone resolves the defect.
2. **Gate destructive region handling on classification confidence.** A 0.467 `line_chart` guess over a text-bearing region should not win against extracted text.
3. **Prefer text when a candidate picture region contains text blocks** — a rotated text run is a stamp/watermark, not a chart.
4. If a region really must be collapsed, populate `altDescription` with the text that was removed, so the content is recoverable.
5. **Make the required-field contract honest.** A `required` field the pipeline cannot supply should not be returned as `""` under success.
6. Regression test: a page with a rotated stamp across a labelled value; assert the value is present in `extract_content()` output and extracts through `extract_structured()`.

## Workaround (partial, unsatisfying)

Call `export_as_text()` alongside the extraction and reconcile missing required fields against the raw text. This recovers the value but abandons schema-driven extraction and grounded citations for that field, and gives no signal about *which* fields need reconciling — `groundingScore: 0.40` plus `match: "not_found"` is the only hint, and it is not documented as meaning "the layout stage discarded your text".

## Related

* **NAPY-20 / SDK-041** — narrow `VisionFeatures` selection breaks `extract_content()`; why the repro requests `VisionFeatures.ALL`.
* **NAPY-15 / SDK-037** — `VisionFeatures.KEY_VALUE_REGION` is a no-op. Same family: a licensed capability that silently yields nothing.
* **NAPY-17** — opaque error codes and silent partial output on the Vision path.
* **`include_page_images` no-op on `extract_structured()`** — not yet filed; the reason there is no escape hatch here. Verified by request capture: byte-identical bodies with the flag on and off, including on a scanned PDF.
* Full write-up and the committed repro: <https://github.com/jonaddams/nutrient-sdk-samples/blob/main/docs/sdk-defects/sdk-045-stamped-text-loss.md>
