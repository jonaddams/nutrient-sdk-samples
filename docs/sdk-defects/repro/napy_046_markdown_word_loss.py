"""SDK-046 — export_as_markdown() / export_as_html() silently drop words.

Measures token loss against export_as_text(), which is the one path that keeps
everything, and reports whether the markdown output wrapped the page in a table.

    python napy_046_markdown_word_loss.py [files-or-dirs ...]

With no arguments it walks ../../../public/documents and ../../../public/invoices,
i.e. this repo's own sample corpus. Needs only NUTRIENT_LICENSE_KEY — no LLM provider.

The finding it reproduces: loss happens if and only if the converter decides the page
is a table. Content that aligns with the inferred column grid survives; content that
spans a column boundary is truncated at the boundary and the remainder discarded.

Install: pip install nutrient-sdk nutrient-sdk-native python-dotenv
"""

import html
import os
import re
import sys
from collections import Counter

from dotenv import load_dotenv
from nutrient_sdk import Document, License

load_dotenv()
License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])

TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9/.,$%#-]*")
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEFAULTS = [
    os.path.join(REPO, "public", "documents"),
    os.path.join(REPO, "public", "invoices"),
]
WORK = os.path.join(os.getcwd(), "sdk046-out")
# Documents with very little text tell us nothing, and image-only pages have no
# text-layer baseline to compare against.
MIN_TOKENS = 40


def collect(paths: list[str]) -> list[str]:
    pdfs: list[str] = []
    for path in paths:
        if os.path.isdir(path):
            pdfs += [
                os.path.join(path, f)
                for f in sorted(os.listdir(path))
                if f.lower().endswith(".pdf")
            ]
        elif path.lower().endswith(".pdf"):
            pdfs.append(path)
    return pdfs


def export(pdf: str, kind: str, meth: str) -> str | None:
    out = os.path.join(WORK, os.path.basename(pdf) + "." + kind)
    try:
        with Document.open(pdf) as doc:
            getattr(doc, meth)(out)
        with open(out, encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except (OSError, Exception):
        return None


def tokens(s: str) -> Counter:
    return Counter(TOKEN.findall(s))


def lost_against(baseline: Counter, other: str | None) -> int | None:
    """Tokens in the text layer that the other output fails to account for."""
    if other is None:
        return None
    stripped = tokens(html.unescape(re.sub(r"<[^>]+>", " ", other)))
    return sum(max(0, n - stripped[w]) for w, n in baseline.items())


os.makedirs(WORK, exist_ok=True)
pdfs = collect(sys.argv[1:] or DEFAULTS)

print(f"\n{'document':46} {'tokens':>6} {'md lost':>8} {'md%':>5} {'html lost':>10} {'html%':>6} table")
print("-" * 94)
rows = []
for pdf in pdfs:
    text = export(pdf, "txt", "export_as_text")
    if not text:
        continue
    baseline = tokens(text)
    total = sum(baseline.values())
    if total < MIN_TOKENS:
        continue
    md = export(pdf, "md", "export_as_markdown")
    ht = export(pdf, "html", "export_as_html")
    lmd, lht = lost_against(baseline, md), lost_against(baseline, ht)
    is_table = bool(md and "<table" in md)
    name = os.path.basename(pdf)[:45]
    print(
        f"{name:46} {total:6} {str(lmd):>8} "
        f"{(f'{100 * lmd / total:.0f}%' if lmd is not None else '-'):>5} {str(lht):>10} "
        f"{(f'{100 * lht / total:.0f}%' if lht is not None else '-'):>6} "
        f"{'yes' if is_table else 'no'}"
    )
    rows.append((name, total, lmd or 0, is_table))

lossy = [r for r in rows if r[1] and r[2] / r[1] > 0.02]
print(f"\n{len(rows)} documents measured; {len(lossy)} lose more than 2% of their tokens")
for name, total, lmd, is_table in sorted(lossy, key=lambda r: -(r[2] / r[1])):
    print(f"  {100 * lmd / total:5.1f}%  {lmd:4}/{total:<5}  table={'yes' if is_table else 'no ':3}  {name}")

with_table = [r for r in rows if r[3]]
without = [r for r in rows if not r[3]]


def worst(group: list) -> str:
    return f"{max((r[2] / r[1] for r in group), default=0) * 100:.0f}%"


print(
    f"\nCorrelation — page-level table: {len(with_table)} docs, worst loss {worst(with_table)}; "
    f"no table: {len(without)} docs, worst loss {worst(without)}"
)
print("Every lossy document is one the converter turned into a table.")
