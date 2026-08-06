# SDK · `ai.include_page_images = True` is a no-op on `extract_structured()` — no image reaches the provider

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Priority** | Medium — a settable flag that silently does nothing; misleads callers about what the model is given, and removes the only workaround for the SDK-045 text loss |
| **Type** | Bug |
| **Component** | Python SDK · Vision · `extract_structured()` request construction |
| **Affects version** | `nutrient-sdk==1.0.9` / `nutrient-sdk-native==1.0.9` (compiled 2026-07-09) |
| **Platform** | macOS 15 (Darwin 25.6.0), ARM64, Apple M4 |
| **Python** | 3.12.13 |
| **Reporter** | Jon Addams (Customer Engineering) |
| **Date** | 2026-08-06 |
| **Registry ID** | SDK-047 |

## Summary

Setting `document.settings.ai_processing_settings.include_page_images = True` before
`Vision.extract_structured()` has no observable effect. The request that leaves the process is
**byte-identical** to the one sent with the flag `False` — same length, same SHA-256 — and
contains no image content part, no `image_url`, and no base64 payload.

The SDK sends a text "IR-lite" layout representation and only that. Confirmed on a text PDF and
on a scanned PDF, the latter being precisely the case where page images would matter most.

## Steps to reproduce

The flag's effect is invisible from the SDK's own return value, so the check has to be made on
the wire. This points `ai.endpoint` at a local recording proxy that logs each outbound body and
forwards it to the real API, so the extraction still completes normally.

```python
"""napy_repro_page_images.py — is include_page_images honoured?

  python napy_repro_page_images.py text.pdf scanned.pdf

pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""
import glob, hashlib, json, os, sys, threading, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from dotenv import load_dotenv
from nutrient_sdk import Document, License, StructuredExtractionRequest, Vision

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])
WORK = "out"; os.makedirs(WORK, exist_ok=True); PORT = 8899

SCHEMA = json.dumps({"schema": {
    "type": "object",
    "properties": {"invoiceNumber": {"type": "string", "description": "The invoice number"}},
    "required": ["invoiceNumber"], "additionalProperties": False}})

class Recorder(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"; n = 0
    def log_message(self, *a): pass
    def do_POST(self):
        Recorder.n += 1
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        open(os.path.join(WORK, f"request-{Recorder.n:03d}.json"), "wb").write(body)
        req = urllib.request.Request(
            "https://api.openai.com" + self.path, data=body, method="POST",
            headers={"Content-Type": "application/json",
                     "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r: out, st = r.read(), r.status
        except urllib.error.HTTPError as e: out, st = e.read(), e.code
        self.send_response(st); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out))); self.end_headers()
        self.wfile.write(out)

server = HTTPServer(("127.0.0.1", PORT), Recorder)
threading.Thread(target=server.serve_forever, daemon=True).start()

def extract(pdf, flag):
    with Document.open(pdf) as doc:
        ai = doc.settings.ai_processing_settings
        ai.provider = "openai"
        ai.api_key = os.environ["OPENAI_API_KEY"]
        ai.endpoint = f"http://127.0.0.1:{PORT}/v1"
        ai.model = "gpt-5.4"
        ai.include_confidence = True
        ai.include_source_locations = True
        ai.include_page_images = flag          # <-- the flag under test
        r = StructuredExtractionRequest(); r.schema = SCHEMA
        Vision.set(doc).extract_structured(r)
    newest = max(glob.glob(os.path.join(WORK, "request-*.json")), key=os.path.getmtime)
    body = open(newest, "rb").read()
    payload = json.loads(body); parts = []
    for m in payload.get("messages", []):
        c = m.get("content")
        parts += [f"str({m['role']})"] if isinstance(c, str) else [p.get("type") for p in c]
    text = body.decode("utf-8", "replace")
    return {"bytes": len(body), "sha": hashlib.sha256(body).hexdigest()[:16], "parts": parts,
            "image": any(p and "image" in str(p).lower() for p in parts)
                     or "image_url" in text or "base64" in text}

print(f"\n{'document':26} {'flag':6} {'bytes':>7} {'sha256':18} {'parts':34} image?")
for pdf in sys.argv[1:]:
    seen = {}
    for flag in (False, True):
        d = seen[flag] = extract(pdf, flag)
        print(f"{os.path.basename(pdf)[:25]:26} {str(flag):6} {d['bytes']:7} {d['sha']:18} "
              f"{str(d['parts']):34} {'YES' if d['image'] else 'no'}")
    print(f"{'':26} -> identical bytes: {seen[False]['sha'] == seen[True]['sha']}")
server.shutdown()
```

## Observed output

```
document                   flag     bytes sha256             parts                              image?
Invoice AC-2025-1047.pdf   False    15011 eddf4565b613c4d8   ['str(system)', 'text', 'text']    no
Invoice AC-2025-1047.pdf   True     15011 eddf4565b613c4d8   ['str(system)', 'text', 'text']    no
                           -> identical bytes: True
scanned-invoice.pdf        False     8965 bde064cff9f1bbed   ['str(system)', 'text', 'text']    no
scanned-invoice.pdf        True      8965 bde064cff9f1bbed   ['str(system)', 'text', 'text']    no
                           -> identical bytes: True
```

Message content is always `system` string plus two `text` parts. Never an image part, never an
`image_url`, never base64 — including on the scanned document, which has no useful text layer
and is exactly where a page image would earn its keep.

Documents used, both public:
<https://github.com/jonaddams/nutrient-sdk-samples/blob/main/public/invoices/Invoice%20AC-2025-1047.pdf>
and <https://github.com/jonaddams/nutrient-sdk-samples/blob/main/public/documents/scanned-invoice.pdf>

### Incidental finding, reported so a hash mismatch does not confuse anyone

One earlier run of the text PDF produced the same byte **length** but a different hash. The
difference was **run-to-run reading-order nondeterminism**, not the flag: blocks `b22` and
`b23` (`"AC-2025-1047 INVOICE NO:"` and `"DATE: March 1, 2025"`) swapped position, along with
their two bounding boxes — same content, same length, different order.

Worth a look on its own terms (identical input, differently ordered document graph), but it
does not affect this report: no image is present in any run.

## Expected behavior

Either `include_page_images = True` attaches page images to the provider request, or the SDK
makes the limitation explicit — raise, warn, or document that the flag does not apply to
`extract_structured()`. A silently ignored setting is the one outcome that misleads.

## Actual behavior

The flag is accepted, stored, and has no effect on the outbound request.

## Impact

* **Callers are misled about what the model actually sees.** A reasonable reading of the flag
  is "the model gets the page image too". It never does, so any conclusion drawn about
  multimodal behaviour on this endpoint is wrong. We had to stop describing our own demo
  models as reading the page.
* **It removes the only workaround for a more serious defect.** In the companion report
  (registry SDK-045) the layout stage discards text under a rotated stamp, so a required field
  returns `""`. The natural mitigation is "send the pixels as well and let the model read
  them" — unavailable, so the model can see neither the text nor the image.
* **We removed a UI control because of it.** Our extraction studio had a "Multimodal" toggle
  wired to this flag; it was deleted once a request capture proved it changed nothing, since a
  control a prospect can flip that provably does nothing is worse than its absence.

## Root cause hypothesis

The flag is plumbed into `AiProcessingSettings` but never consulted by whatever builds the
`messages` array for `extract_structured()`. The `extract_content()`/`describe()` paths do
render page images, so the capability exists in the codebase; the structured path appears to
have been built on the IR-lite text representation only, with the flag left connected to
nothing.

## Suggested fix

1. Honour the flag: attach page images as image content parts when it is set.
2. If that is not intended for this endpoint, make it **loud** — raise on `True`, or log a
   warning naming `extract_structured()` — and say so in the API docs.
3. Add a test asserting the outbound request contains an image part when the flag is set. A
   request-level assertion is what catches this class of defect; a return-value assertion
   cannot, which is presumably why it survived.

## Related

* **NAPY-15 / SDK-037** — `VisionFeatures.KEY_VALUE_REGION` is a no-op. Same family: a
  licensed, settable capability that silently produces nothing.
* **SDK-045** (filed alongside) — the text-loss defect this one denies a workaround to.
* **SDK-048** (filed alongside) — `groundingScore` null for Bedrock ids; same repro script.
* Full write-up and committed repro:
  <https://github.com/jonaddams/nutrient-sdk-samples/blob/main/docs/sdk-defects/sdk-047-include-page-images-noop.md>
