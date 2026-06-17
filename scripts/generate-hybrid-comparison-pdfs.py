"""
Generate a two-revision vector-PDF pair for the hybrid-comparison sample.
Rev A vs Rev B differ BOTH visually (a moved interior wall) and textually
(dimension label, title-block revision, spec note) on the same single page.

Usage: python3 scripts/generate-hybrid-comparison-pdfs.py
Output: public/documents/hybrid-comparison-a.pdf, hybrid-comparison-b.pdf
"""

import os
import fitz  # PyMuPDF

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "documents")
PAGE_W, PAGE_H = fitz.paper_size("letter")  # 612 x 792
MARGIN = 54

INK = fitz.utils.getColor("gray20")
DIM = (0.45, 0.45, 0.45)
FILL = (0.97, 0.97, 0.95)

# Plan bounds
PX, PY = MARGIN + 36, MARGIN + 64
PW = PAGE_W - 2 * PX
PH = PAGE_H - PY - MARGIN - 96


def revision(rev):
    """Return the per-revision values that differ between A and B."""
    if rev == "A":
        return {
            "wall_frac": 0.45,          # interior wall x position (fraction of PW)
            "dim_text": "24'-0\"",       # overall width dimension
            "spec": "Note: Partition per A-101. Fire rating 1HR.",
        }
    return {
        "wall_frac": 0.62,             # wall moved right
        "dim_text": "26'-0\"",          # dimension changed
        "spec": "Note: Partition per A-102. Fire rating 2HR.",
    }


def build(rev):
    doc = fitz.open()
    doc.set_metadata({
        "title": f"Tenant Improvement Plan - Rev {rev}",
        "author": "Nutrient SDK Samples",
        "subject": "Hybrid comparison demo document",
    })
    page = doc.new_page(width=PAGE_W, height=PAGE_H)
    v = revision(rev)
    shape = page.new_shape()

    # Sheet border
    shape.draw_rect(fitz.Rect(MARGIN, MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN))
    shape.finish(color=INK, width=1.2)

    # Plan outer walls
    plan = fitz.Rect(PX, PY, PX + PW, PY + PH)
    shape.draw_rect(plan)
    shape.finish(color=INK, fill=FILL, width=2.5)

    # Interior wall (the element that moves between revisions)
    wall_x = PX + v["wall_frac"] * PW
    shape.draw_line(fitz.Point(wall_x, PY), fitz.Point(wall_x, PY + PH))
    shape.finish(color=INK, width=2.0)

    # Top dimension line
    dim_y = PY - 14
    shape.draw_line(fitz.Point(PX, dim_y), fitz.Point(PX + PW, dim_y))
    shape.draw_line(fitz.Point(PX, dim_y - 4), fitz.Point(PX, dim_y + 4))
    shape.draw_line(fitz.Point(PX + PW, dim_y - 4), fitz.Point(PX + PW, dim_y + 4))
    shape.finish(color=DIM, width=0.6)
    shape.commit()

    # --- Text (real, extractable) ---
    page.insert_text(fitz.Point(MARGIN + 8, MARGIN + 22),
                     "Tenant Improvement Plan", fontsize=16, fontname="helv", color=INK)
    page.insert_text(fitz.Point(MARGIN + 8, MARGIN + 38),
                     "Suite 200 - Level 2", fontsize=9, fontname="helv", color=DIM)

    # Title-block revision (top right) - differs between A and B
    rev_text = f"REV: {rev}"
    tw = fitz.get_text_length(rev_text, fontname="hebo", fontsize=12)
    page.insert_text(fitz.Point(PAGE_W - MARGIN - 8 - tw, MARGIN + 22),
                     rev_text, fontsize=12, fontname="hebo", color=INK)

    # Overall dimension label - differs between A and B
    dw = fitz.get_text_length(v["dim_text"], fontname="helv", fontsize=8)
    page.insert_text(fitz.Point(PX + PW / 2 - dw / 2, dim_y - 5),
                     v["dim_text"], fontsize=8, fontname="helv", color=DIM)

    # Room labels (constant)
    page.insert_text(fitz.Point(PX + PW * 0.18, PY + PH * 0.5),
                     "Office", fontsize=11, fontname="helv", color=INK)
    page.insert_text(fitz.Point(PX + PW * 0.72, PY + PH * 0.5),
                     "Conference", fontsize=11, fontname="helv", color=INK)

    # Spec note (bottom) - differs between A and B
    page.insert_text(fitz.Point(PX, PY + PH + 28),
                     v["spec"], fontsize=9, fontname="helv", color=INK)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"hybrid-comparison-{rev.lower()}.pdf")
    doc.save(out)
    doc.close()
    print(f"Generated: {out}")


if __name__ == "__main__":
    build("A")
    build("B")
