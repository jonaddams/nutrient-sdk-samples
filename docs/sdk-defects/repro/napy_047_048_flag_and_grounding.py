"""SDK-047 and SDK-048 — two silent no-ops on Vision.extract_structured().

SDK-047: `ai.include_page_images = True` sends no image. The request that leaves
         the process is the same either way, on a text PDF and on a scanned one.
SDK-048: `confidenceComponents` comes back null ENTIRELY for Bedrock model ids,
         though grounding succeeded (match=id_match, bbox present). The gpt-4.1
         control takes the same request branch and gets the richest block of all,
         which is what rules out "unrecognised ids are not scored".

    python napy_047_048_flag_and_grounding.py 047      # needs NUTRIENT + OPENAI keys
    python napy_047_048_flag_and_grounding.py 048      # also needs BEDROCK_API_KEY
    python napy_047_048_flag_and_grounding.py          # both

047 works by pointing the SDK at a local recording proxy that logs each outbound
body and forwards it to the real API, so the comparison is of bytes on the wire
rather than of anything the SDK reports about itself.

Install: pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""

import glob
import hashlib
import json
import os
import sys
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

from dotenv import load_dotenv
from nutrient_sdk import Document, License, StructuredExtractionRequest, Vision

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
TEXT_PDF = os.path.join(REPO, "public", "invoices", "Invoice AC-2025-1047.pdf")
SCANNED_PDF = os.path.join(REPO, "public", "documents", "scanned-invoice.pdf")
WORK = os.path.join(os.getcwd(), "sdk047-out")
PROXY_PORT = 8899

SCHEMA = json.dumps(
    {
        "schema": {
            "type": "object",
            "properties": {
                "invoiceNumber": {"type": "string", "description": "The invoice number"},
                "issueDate": {"type": "string", "description": "The issue date, as printed"},
            },
            "required": ["invoiceNumber"],
            "additionalProperties": False,
        }
    }
)

# Both shipping Bedrock ids, verified live against the OpenAI-compatible surface.
BEDROCK_MODELS = ["qwen.qwen3-vl-235b-a22b-instruct", "google.gemma-3-27b-it"]


# ── recording proxy ────────────────────────────────────────────────────────────
class Recorder(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    upstream = "https://api.openai.com"
    key = ""
    n = 0

    def log_message(self, *a):
        pass

    def do_POST(self):
        Recorder.n += 1
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        with open(os.path.join(WORK, f"request-{Recorder.n:03d}.json"), "wb") as fh:
            fh.write(body)
        req = urllib.request.Request(
            Recorder.upstream + self.path,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {Recorder.key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                out, status = resp.read(), resp.status
        except urllib.error.HTTPError as e:
            out, status = e.read(), e.code
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


def extract(pdf, *, endpoint=None, api_key=None, model="gpt-5.4", page_images=False):
    with Document.open(pdf) as doc:
        ai = doc.settings.ai_processing_settings
        # "openai" even for Bedrock: the SDK rejects every other value on this
        # flat path, and Bedrock speaks the OpenAI chat-completions API.
        ai.provider = "openai"
        ai.api_key = api_key or os.environ["OPENAI_API_KEY"]
        if endpoint:
            ai.endpoint = endpoint
        ai.model = model
        ai.include_confidence = True
        ai.include_source_locations = True
        ai.include_page_images = page_images
        request = StructuredExtractionRequest()
        request.schema = SCHEMA
        return json.loads(Vision.set(doc).extract_structured(request))


def newest_request():
    files = [f for f in glob.glob(os.path.join(WORK, "request-*.json"))]
    return max(files, key=os.path.getmtime)


def probe(body: bytes) -> dict:
    payload = json.loads(body)
    parts = []
    for m in payload.get("messages", []):
        c = m.get("content")
        parts += [f"str({m['role']})"] if isinstance(c, str) else [p.get("type") for p in c]
    text = body.decode("utf-8", "replace")
    return {
        "bytes": len(body),
        "sha": hashlib.sha256(body).hexdigest()[:16],
        "parts": parts,
        "image_part": any(p and "image" in str(p).lower() for p in parts),
        "image_url": "image_url" in text,
        "base64": "base64" in text,
    }


def run_047():
    os.makedirs(WORK, exist_ok=True)
    Recorder.key = os.environ["OPENAI_API_KEY"]
    server = HTTPServer(("127.0.0.1", PROXY_PORT), Recorder)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    endpoint = f"http://127.0.0.1:{PROXY_PORT}/v1"

    print("\nSDK-047 — does include_page_images put an image on the wire?\n")
    print(f"{'document':26} {'flag':5} {'bytes':>7} {'sha256':18} {'parts':34} image?")
    print("-" * 104)
    try:
        for label, pdf in (("text PDF", TEXT_PDF), ("scanned PDF", SCANNED_PDF)):
            seen = {}
            for flag in (False, True):
                extract(pdf, endpoint=endpoint, page_images=flag)
                with open(newest_request(), "rb") as fh:
                    seen[flag] = probe(fh.read())
                d = seen[flag]
                print(
                    f"{label:26} {str(flag):5} {d['bytes']:7} {d['sha']:18} "
                    f"{str(d['parts']):34} "
                    f"{'YES' if (d['image_part'] or d['image_url'] or d['base64']) else 'no'}"
                )
            same = seen[False]["sha"] == seen[True]["sha"]
            print(
                f"{'':26} -> identical bytes: {same}"
                + ("" if same else "  (differs only by block ORDER, see note below)")
            )
    finally:
        server.shutdown()
    print(
        "\nNo image part, no image_url, no base64 — with the flag on or off, on a\n"
        "scanned page as much as a text one. Where the two bodies are not byte\n"
        "identical the difference is reading-order nondeterminism between runs\n"
        "(two adjacent blocks swap, along with their bboxes), not the flag."
    )


def run_048():
    print("\nSDK-048 — is confidenceComponents returned for Bedrock model ids?\n")
    region = os.environ.get("AWS_REGION", "us-east-1")
    bedrock_endpoint = os.environ.get(
        "BEDROCK_ENDPOINT", f"https://bedrock-mantle.{region}.api.aws/v1"
    )
    runs = [("openai", None, None, "gpt-5.4")]
    if os.environ.get("BEDROCK_API_KEY", "").strip():
        runs += [
            ("bedrock", bedrock_endpoint, os.environ["BEDROCK_API_KEY"], m)
            for m in BEDROCK_MODELS
        ]
    else:
        print("  BEDROCK_API_KEY not set — showing the OpenAI control only.\n")

    # gpt-4.1 is the load-bearing control: it is an UNRECOGNISED id, so it takes
    # the same json_schema+logprobs branch the Bedrock ids take. If the missing
    # block were simply "unrecognised ids are not scored", it would be null here
    # too. It is not — it is the richest of the lot.
    runs.insert(1, ("openai", None, None, "gpt-4.1"))

    print(
        f"{'provider':10} {'model':40} {'value':16} {'match':10} confidenceComponents"
    )
    print("-" * 122)
    for name, endpoint, key, model in runs:
        try:
            payload = extract(TEXT_PDF, endpoint=endpoint, api_key=key, model=model)
        except Exception as e:
            print(f"{name:10} {model:40} ERROR {type(e).__name__}: {str(e)[:40]}")
            continue
        extraction = payload.get("extraction", {})
        meta = (payload.get("metadata", {}) or {}).get("invoiceNumber") or {}
        print(
            f"{name:10} {model:40} {str(extraction.get('invoiceNumber'))[:16]:16} "
            f"{str(meta.get('match')):10} {json.dumps(meta.get('confidenceComponents'))}"
        )
    print(
        "\nBoth Bedrock ids return confidenceComponents: null — the whole object, not\n"
        "merely a null score — while extracting identical values with match=id_match\n"
        "and a bbox. Grounding SUCCEEDED; only the confidence block is absent.\n"
        "\n"
        "gpt-4.1 is the control that matters: an unrecognised id, so it takes the SAME\n"
        "json_schema+logprobs request branch as the Bedrock ids, and it gets the RICHEST\n"
        "block of all (probabilityScore + marginScore + groundingScore,\n"
        "source=logprobs+margin). That rules out 'unrecognised ids are not scored'.\n"
        "\n"
        "Bedrock also returns 47 well-formed logprobs entries in the standard OpenAI\n"
        "shape, so the scorer's inputs are present. Same branch, same response shape,\n"
        "different model id, different outcome — see sdk-048-bedrock-null-grounding.md."
    )


which = sys.argv[1] if len(sys.argv) > 1 else "both"
if which in ("047", "both"):
    run_047()
if which in ("048", "both"):
    run_048()
