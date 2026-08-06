"""SDK-045 — text under a rotated stamp is silently discarded by the layout stage.

Self-contained: builds its own two-PDF fixture with the SDK's own HTML -> PDF, so no
external document is needed. The two PDFs differ ONLY by a decorative rotated stamp
drawn across one line of text.

    python napy_045_stamp_text_loss.py

Stage 1 (needs only NUTRIENT_LICENSE_KEY) proves the defect:
  - export_as_text() finds "12/04/2016" in BOTH PDFs, so the text layer is intact.
  - Vision.extract_content() finds it only in the unstamped one. In the stamped one
    the region is replaced by a {"type": "picture"} element and the text inside it
    is gone. No LLM provider is involved, so this is not a model failure.

Stage 2 (also needs OPENAI_API_KEY) shows what a caller actually sees:
  extract_structured() returns "" for a REQUIRED field, with metadata
  match="not_found" and confidenceComponents.groundingScore=0.40 — which reads as a
  confidence problem and sends you looking at the model instead of the layout stage.

Install: pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""

import json
import os

from dotenv import load_dotenv
from nutrient_sdk import (
    Document,
    License,
    StructuredExtractionRequest,
    Vision,
    VisionFeatures,
)

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])

NEEDLE = "12/04/2016"

# The stamp: a rotated, bordered text box drawn across the date line. Positioned to
# overlap the date, which is what matters — a stamp elsewhere on the page does not
# trigger the loss.
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

# Four variants isolate the trigger: the stamp is what matters, the dashed border
# around the region is not.
VARIANTS = [
    ("plain", "", ""),
    ("dashedbox", DASHED, ""),
    ("stamp", "", STAMP),
    ("both", DASHED, STAMP),
]

SCHEMA = json.dumps(
    {
        # The outer {"schema": {...}} envelope is required; a bare JSON Schema is
        # rejected with InvalidArgumentException 3016 [Source: Vision].
        "schema": {
            "type": "object",
            "properties": {
                "patientName": {
                    "type": "string",
                    "description": "The patient's name, as printed",
                },
                "admissionDate": {
                    "type": "string",
                    "description": "The date of admission, as printed",
                },
            },
            "required": ["patientName", "admissionDate"],
            "additionalProperties": False,
        }
    }
)


def build(name: str, frame: str, stamp: str) -> str:
    """Render one variant to PDF through the SDK's implicit HTML conversion."""
    html, pdf = f"v-{name}.html", f"v-{name}.pdf"
    with open(html, "w", encoding="utf-8") as fh:
        fh.write(PAGE.format(frame=frame, stamp=stamp))
    with Document.open(html) as doc:
        doc.export_as_pdf(pdf)
    return pdf


def in_text_layer(pdf: str) -> bool:
    out = pdf + ".txt"
    with Document.open(pdf) as doc:
        doc.export_as_text(out)
    with open(out, encoding="utf-8", errors="replace") as fh:
        return NEEDLE in fh.read()


def content_graph(pdf: str) -> tuple[bool, dict | None]:
    """Vision.extract_content() — the document graph, no LLM provider involved."""
    with Document.open(pdf) as doc:
        doc.settings.get_vision_settings().set_features(VisionFeatures.ALL.value)
        raw = str(Vision.set(doc).extract_content())
    picture = None
    try:
        graph = json.loads(raw)
    except ValueError:
        graph = None
    if graph is not None:
        stack = [graph]
        while stack:
            node = stack.pop()
            if isinstance(node, dict):
                if str(node.get("type", "")).lower() == "picture":
                    picture = {
                        k: v for k, v in node.items() if k not in ("children", "points")
                    }
                stack.extend(node.values())
            elif isinstance(node, list):
                stack.extend(node)
    return NEEDLE in raw, picture


def structured(pdf: str) -> dict:
    """What the caller sees. Requires OPENAI_API_KEY."""
    with Document.open(pdf) as doc:
        ai = doc.settings.ai_processing_settings
        ai.provider = "openai"
        ai.api_key = os.environ["OPENAI_API_KEY"]
        ai.model = os.environ.get("OPENAI_STRUCTURED_MODEL", "gpt-5.4")
        ai.include_confidence = True
        ai.include_source_locations = True
        request = StructuredExtractionRequest()
        request.schema = SCHEMA
        payload = json.loads(Vision.set(doc).extract_structured(request))
    meta = (payload.get("metadata") or {}).get("admissionDate") or {}
    return {
        "value": (payload.get("extraction", payload)).get("admissionDate"),
        "match": meta.get("match"),
        "grounding": (meta.get("confidenceComponents") or {}).get("groundingScore"),
    }


pdfs = {name: build(name, frame, stamp) for name, frame, stamp in VARIANTS}

print("\nStage 1 — license key only, no LLM provider")
print(f"{'variant':12} {'export_as_text':15} {'extract_content':16} picture element")
print("-" * 78)
pictures = {}
for name, pdf in pdfs.items():
    found, picture = content_graph(pdf)
    pictures[name] = picture
    print(
        f"{name:12} {('FOUND' if in_text_layer(pdf) else 'LOST'):15} "
        f"{('FOUND' if found else 'LOST'):16} "
        f"{(picture.get('classification') if picture else '-')}"
    )

if pictures.get("stamp"):
    print("\nThe picture element that replaced the date line:")
    print(json.dumps(pictures["stamp"], indent=2))

if os.environ.get("OPENAI_API_KEY"):
    print("\nStage 2 — what extract_structured() returns to the caller")
    print(f"{'variant':12} {'admissionDate':16} {'match':11} groundingScore")
    print("-" * 60)
    for name, pdf in pdfs.items():
        r = structured(pdf)
        print(f"{name:12} {repr(r['value']):16} {str(r['match']):11} {r['grounding']}")
else:
    print("\nStage 2 skipped — set OPENAI_API_KEY to see the caller-visible symptom.")
