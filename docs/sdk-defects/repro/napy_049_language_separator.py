"""SDK-049 — a malformed OcrSettings.default_languages string returns an empty
document, silently.

`eng+deu` works. `eng,deu` — the obvious first guess — yields a 154-character
document with zero elements and raises nothing, so a caller concludes the page
is blank rather than that their separator was wrong. Two-letter ISO codes behave
the same way. Adaptive OCR needs no provider and no API key, so this reproduces
with a Nutrient license alone.

    python napy_049_language_separator.py

Install: pip install nutrient-sdk nutrient-sdk-native python-dotenv

Run and verified 2026-08-07 from this repo, using the sibling backend's venv
because that is where nutrient-sdk and the license key already live:

    cd ~/SE/code/python-fast-api && \
      DOC=~/SE/code/nutrient-sdk-samples/public/documents/input_ocr_multiple_languages.png \
      .venv/bin/python ~/SE/code/nutrient-sdk-samples/docs/sdk-defects/repro/napy_049_language_separator.py

It reproduced all five silent empties and re-derived the four confidence figures
below to the digit, so those numbers now have two independent measurements.

Each variant runs in a FRESH SUBPROCESS on purpose: a failed Vision call poisons
the process for every later call (NAPY-7 / SDK-003), so a single-process loop
would report failures that are really contamination from the first bad run.

Measured 2026-08-06 against SDK 1.0.9. Point DOC at any scan with no text layer;
the repo's own `public/documents/input_ocr_multiple_languages.png` is what the
numbers below came from, because it genuinely mixes scripts and so makes the
working multi-language case visibly better than the single-language one:

    eng           supported     conf 0.9322
    deu           supported     conf 0.8952
    eng+deu       supported     conf 0.9381   <- '+' is the separator
    eng+deu+fra   supported     conf 0.9485   <- and it scales past two
    eng,deu       EMPTY (154 chars, 0 elements, no exception)
    eng;deu       EMPTY
    eng|deu       EMPTY
    'eng deu'     EMPTY
    en,de         EMPTY
"""

import json
import os
import subprocess
import sys

DOC = os.environ.get("DOC", "input_ocr_multiple_languages.png")
PY = sys.executable

# Runs in a fresh interpreter per variant. Prints one RESULT line so the parent
# never has to interpret the SDK's own logging.
CHILD = r'''
import json, os, sys
from dotenv import load_dotenv
load_dotenv()
from nutrient_sdk import Document, License, Vision, VisionEngine, VisionFeatures
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])

langs = json.loads(sys.argv[1])
with Document.open(sys.argv[2]) as doc:
    settings = doc.get_settings()
    vision = settings.get_vision_settings()
    vision.set_engine(VisionEngine.ADAPTIVE_OCR)
    # ALL, not a narrowed bitmask: narrowing breaks extract_content() with error
    # 3024 (SDK-041 / NAPY-20), which would confound this test.
    vision.set_features(VisionFeatures.ALL.value)
    ocr = settings.get_ocr_settings()
    out = {"sdk_default": repr(ocr.get_default_languages())}
    if langs is not None:
        ocr.set_default_languages(langs)
    raw = Vision.set(doc).extract_content()

out["chars"] = len(raw)
try:
    elements = json.loads(raw).get("elements", [])
    out["elements"] = len(elements)
    confs = [
        e["confidence"] for e in elements
        if isinstance(e.get("confidence"), (int, float))
    ]
    out["avg_conf"] = round(sum(confs) / len(confs), 4) if confs else None
except Exception:
    out["elements"] = None
print("RESULT " + json.dumps(out))
'''


def run(langs):
    proc = subprocess.run(
        [PY, "-c", CHILD, json.dumps(langs), DOC],
        capture_output=True,
        text=True,
        timeout=900,
    )
    for line in proc.stdout.splitlines():
        if line.startswith("RESULT "):
            return json.loads(line[7:])
    err = (proc.stderr or "").strip().splitlines()
    return {"error": err[-1][:70] if err else "no output"}


# The two groups are the whole point: identical intent, one silently empty.
WORKING = ["eng", "deu", "eng+deu", "eng+deu+fra"]
MALFORMED = ["eng,deu", "eng;deu", "eng|deu", "eng deu", "en,de"]

baseline = run(None)
print(f"SDK's own get_default_languages(): {baseline.get('sdk_default')}")
print(f"unset baseline: {baseline.get('elements')} elements, "
      f"{baseline.get('chars')} chars\n")

print(f"{'languages':16} {'els':>5} {'chars':>8} {'avg_conf':>9}  verdict")
print("-" * 56)
empties = []
for langs in WORKING + MALFORMED:
    r = run(langs)
    if r.get("error"):
        print(f"{langs!r:16} {'':>5} {'':>8} {'':>9}  RAISED {r['error']}")
        continue
    els = r.get("elements") or 0
    verdict = "ok" if els else "EMPTY — no exception raised"
    if not els:
        empties.append(langs)
    print(f"{langs!r:16} {els:>5} {r.get('chars'):>8} "
          f"{str(r.get('avg_conf')):>9}  {verdict}")

print(
    f"\n{len(empties)} of {len(MALFORMED)} malformed strings returned an empty "
    "document without raising."
    if empties
    else "\nNo silent empties — the defect may be fixed in this SDK version."
)
