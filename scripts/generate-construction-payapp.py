"""
Generate a realistic AIA-style "Application and Certificate for Payment"
(G702-style certificate + G703-style continuation sheet on one page) for a
fictional construction project.

This replaces westbridge-engineering-submittal-form.pdf in the Extraction
Studio corpus. Westbridge was retired for being a *demo hazard*, not for
being inaccurate: at 1700x2338pt (architectural D-size) its rasterized
payload is ~8x a Letter page, driving 33-36s extraction times and
intermittent hosted-backend failures. Its content-level difficulty
(retainage math, multi-line-item continuation sheet, derived totals) is
exactly what makes it a good accuracy test, so this document keeps that
content and fixes only the geometry:

  - Letter page (612 x 792 pt) instead of D-size.
  - Image-only (no text layer) at 200 DPI => 1700 x 2200 px raster
    (~3.74 MP), comfortably under scanned-invoice.pdf's 8.7 MP at ~9s.

Process: draw the form as ordinary vector/text content on a Letter-size
fitz page (this "source" page is never saved), rasterize that page to a
PNG at TARGET_DPI, then build a brand-new one-page PDF whose only content
is that PNG placed at Letter size. The result has zero extractable text
and zero embedded fonts -- verify with page.get_text() and page.get_fonts().

Every derived figure on the form (retainage, total earned less retainage,
current payment due, balance to finish, continuation-sheet totals) is
computed from the line items below, not hand-typed, so the arithmetic is
guaranteed internally consistent.

Usage: python3 scripts/generate-construction-payapp.py
Output: public/documents/construction-pay-application.pdf
"""

import os
import fitz  # PyMuPDF

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "documents")
PAGE_W, PAGE_H = fitz.paper_size("letter")  # 612 x 792
MARGIN = 40
TARGET_DPI = 150

INK = (0.12, 0.12, 0.12)
RULE = (0.35, 0.35, 0.35)
LIGHT = (0.55, 0.55, 0.55)
HEAD_FILL = (0.90, 0.90, 0.88)

# ---------------------------------------------------------------------------
# Project facts (fictional) and continuation-sheet line items. All summary
# figures below are DERIVED from these, not independently authored.
# ---------------------------------------------------------------------------

PROJECT = {
    "owner": "Cedar Hollow Regional Health District",
    "owner_addr": "400 Hollow Ridge Pkwy, Cedar Hollow, OH 43055",
    "project": "Cedar Hollow Family Health Center - New Outpatient Building",
    "project_no": "24-118",
    "contractor": "Meridian Builders, LLC",
    "contractor_addr": "118 Foundry St, Columbus, OH 43206",
    "architect": "Thornfield Architecture Group",
    "architect_addr": "900 Arlington Ave, Suite 4, Columbus, OH 43215",
    "application_no": "14",
    "period_to": "07/31/2026",
    "contract_date": "03/15/2025",
}

ORIGINAL_CONTRACT_SUM = 4_850_000.00
CHANGE_ORDERS_PREVIOUS = 150_900.00
CHANGE_ORDERS_THIS_MONTH = 35_500.00
RETAINAGE_RATE = 0.05

# (item no, description, scheduled value, from previous application,
#  this period, materials presently stored)
#
# Iteration 3: consolidated further, from a 10-row CSI-division breakdown to
# 3 cost-code groups. Each group's four input columns are the exact sums of
# the finer-grained rows it replaces (see git history for the 10- and 5-row
# versions), so every derived total/percentage/balance -- and every
# summary-section figure on the G702 above, computed from these same
# columns -- is unchanged across all three iterations. This is a *density*
# fix, not a difficulty fix: a busier table was empirically correlated with
# anthropic truncating its response (finishReason=length) before emitting
# the JSON payload; the 5 fields under test are summary-section fields, not
# table cells, so thinning the table doesn't touch what's being measured
# for accuracy.
LINE_ITEMS = [
    ("1", "General Requirements & Sitework", 1_396_400.00, 1_356_400.00, 40_000.00, 0.00),
    ("2", "Structural, Mechanical & Electrical", 3_175_000.00, 2_112_000.00, 279_000.00, 77_000.00),
    ("3", "Finishes (Drywall/Paint/Flooring)", 465_000.00, 0.00, 84_700.00, 0.00),
]


def money(v):
    return f"${v:,.2f}"


def compute():
    rows = []
    sum_sv = sum_prev = sum_this = sum_stored = sum_total = 0.0
    for no, desc, sv, prev, this, stored in LINE_ITEMS:
        total = prev + this + stored
        pct = (total / sv * 100.0) if sv else 0.0
        balance = sv - total
        rows.append({
            "no": no, "desc": desc, "sv": sv, "prev": prev, "this": this,
            "stored": stored, "total": total, "pct": pct, "balance": balance,
        })
        sum_sv += sv
        sum_prev += prev
        sum_this += this
        sum_stored += stored
        sum_total += total

    change_orders = CHANGE_ORDERS_PREVIOUS + CHANGE_ORDERS_THIS_MONTH
    contract_sum_to_date = ORIGINAL_CONTRACT_SUM + change_orders
    # The continuation sheet's scheduled-value column is built to foot
    # exactly to contract-sum-to-date -- assert rather than silently drift.
    assert abs(sum_sv - contract_sum_to_date) < 0.005, (sum_sv, contract_sum_to_date)

    total_completed_stored = sum_total
    retainage = round(total_completed_stored * RETAINAGE_RATE, 2)
    total_earned_less_retainage = total_completed_stored - retainage

    # "Previous certificates for payment" = last application's total
    # completed-and-stored (approximated here as this period's cumulative
    # "previous applications" column, i.e. no materials were left stored
    # at the prior application) less that application's own retainage.
    prev_total_completed_stored = sum_prev
    prev_retainage = round(prev_total_completed_stored * RETAINAGE_RATE, 2)
    less_previous_certificates = prev_total_completed_stored - prev_retainage

    current_payment_due = total_earned_less_retainage - less_previous_certificates
    balance_to_finish = contract_sum_to_date - total_earned_less_retainage

    return {
        "rows": rows,
        "change_orders": change_orders,
        "contract_sum_to_date": contract_sum_to_date,
        "total_completed_stored": total_completed_stored,
        "retainage": retainage,
        "total_earned_less_retainage": total_earned_less_retainage,
        "less_previous_certificates": less_previous_certificates,
        "current_payment_due": current_payment_due,
        "balance_to_finish": balance_to_finish,
        "sum_sv": sum_sv,
        "sum_prev": sum_prev,
        "sum_this": sum_this,
        "sum_stored": sum_stored,
    }


def draw_source_page(page, calc):
    shape = page.new_shape()
    x0, x1 = MARGIN, PAGE_W - MARGIN
    y = MARGIN

    # --- Title block ---
    page.insert_text(fitz.Point(x0, y + 14), "APPLICATION AND CERTIFICATE FOR PAYMENT",
                      fontsize=13, fontname="hebo", color=INK)
    page.insert_text(fitz.Point(x0, y + 27), "AIA-style Document G702/G703 (adapted format)",
                      fontsize=8, fontname="helv", color=LIGHT)
    y += 38
    shape.draw_line(fitz.Point(x0, y), fitz.Point(x1, y))
    shape.finish(color=RULE, width=1.0)
    shape.commit()
    y += 10

    # --- Project / parties block (two columns) ---
    left_x, right_x = x0, x0 + 340
    left_w = right_x - left_x - 16
    row_gap = 30
    col_top = y

    def field(px, py, label, value, value_size=8.5, wrap_w=None):
        page.insert_text(fitz.Point(px, py), label, fontsize=6.7, fontname="helv", color=LIGHT)
        if wrap_w:
            page.insert_textbox(fitz.Rect(px, py + 3, px + wrap_w, py + 3 + 22),
                                 value, fontsize=value_size, fontname="helv", color=INK)
        else:
            page.insert_text(fitz.Point(px, py + 11), value, fontsize=value_size, fontname="helv", color=INK)

    field(left_x, col_top, "TO OWNER", f"{PROJECT['owner']}, {PROJECT['owner_addr']}", 8, wrap_w=left_w)
    field(left_x, col_top + row_gap, "PROJECT", PROJECT["project"], 8, wrap_w=left_w)
    field(left_x, col_top + 2 * row_gap, "FROM CONTRACTOR", f"{PROJECT['contractor']}, {PROJECT['contractor_addr']}", 8, wrap_w=left_w)
    field(left_x, col_top + 3 * row_gap, "VIA ARCHITECT", f"{PROJECT['architect']}, {PROJECT['architect_addr']}", 8, wrap_w=left_w)

    field(right_x, col_top, "APPLICATION NO.", PROJECT["application_no"])
    field(right_x, col_top + row_gap, "PERIOD TO", PROJECT["period_to"])
    field(right_x, col_top + 2 * row_gap, "PROJECT NO.", PROJECT["project_no"])
    field(right_x, col_top + 3 * row_gap, "CONTRACT DATE", PROJECT["contract_date"])

    y = col_top + 3 * row_gap + 22
    shape.draw_line(fitz.Point(x0, y), fitz.Point(x1, y))
    shape.finish(color=RULE, width=1.0)
    shape.commit()
    y += 12

    # --- CONTRACTOR'S APPLICATION FOR PAYMENT (numbered lines) ---
    page.insert_text(fitz.Point(x0, y + 8), "CONTRACTOR'S APPLICATION FOR PAYMENT",
                      fontsize=9.5, fontname="hebo", color=INK)
    y += 16

    def line(no, label, value, y, indent=0, bold=False, rule_after=False):
        fn = "hebo" if bold else "helv"
        page.insert_text(fitz.Point(x0 + indent, y), f"{no}." if no else "", fontsize=8, fontname="helv", color=INK)
        page.insert_text(fitz.Point(x0 + 16 + indent, y), label, fontsize=8, fontname=fn, color=INK)
        val = money(value)
        vw = fitz.get_text_length(val, fontname=fn, fontsize=8.5)
        page.insert_text(fitz.Point(x1 - vw, y), val, fontsize=8.5, fontname=fn, color=INK)
        if rule_after:
            shape.draw_line(fitz.Point(x0, y + 4), fitz.Point(x1, y + 4))
            shape.finish(color=RULE, width=0.5)
            shape.commit()
        return y + 15

    y = line("1", "ORIGINAL CONTRACT SUM", ORIGINAL_CONTRACT_SUM, y)
    y = line("2", "Net change by Change Orders", calc["change_orders"], y)
    y = line("3", "CONTRACT SUM TO DATE (Line 1 +/- 2)", calc["contract_sum_to_date"], y, bold=True, rule_after=True)
    y = line("4", "TOTAL COMPLETED & STORED TO DATE (Column G on G703)", calc["total_completed_stored"], y)
    y = line("5a", f"RETAINAGE: {RETAINAGE_RATE*100:.1f}% of Completed Work & Stored Materials", calc["retainage"], y, indent=6)
    y = line("5", "Total Retainage", calc["retainage"], y, rule_after=True)
    y = line("6", "TOTAL EARNED LESS RETAINAGE (Line 4 less Line 5 Total)", calc["total_earned_less_retainage"], y, bold=True)
    y = line("7", "LESS PREVIOUS CERTIFICATES FOR PAYMENT", calc["less_previous_certificates"], y, rule_after=True)
    y = line("8", "CURRENT PAYMENT DUE", calc["current_payment_due"], y, bold=True, rule_after=True)
    y = line("9", "BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 less Line 6)", calc["balance_to_finish"], y)
    y += 8

    # --- Change order summary (small table) ---
    page.insert_text(fitz.Point(x0, y + 8), "CHANGE ORDER SUMMARY", fontsize=8.5, fontname="hebo", color=INK)
    y += 14
    co_rows = [
        ("Total changes approved in previous months", CHANGE_ORDERS_PREVIOUS),
        ("Total approved this month", CHANGE_ORDERS_THIS_MONTH),
        ("TOTAL", calc["change_orders"]),
    ]
    for label, val in co_rows:
        page.insert_text(fitz.Point(x0 + 10, y), label, fontsize=7.5, fontname="helv", color=INK)
        val_s = money(val)
        vw = fitz.get_text_length(val_s, fontname="helv", fontsize=7.5)
        page.insert_text(fitz.Point(x1 - vw, y), val_s, fontsize=7.5, fontname="helv", color=INK)
        y += 11
    y += 6

    # --- Certification statement ---
    cert = ("The undersigned Contractor certifies that to the best of the Contractor's knowledge, the Work "
            "covered by this Application for Payment has been completed in accordance with the Contract "
            "Documents, that all amounts have been paid for Work for which previous Certificates for Payment "
            "were issued, and that the current payment shown herein is now due.")
    page.insert_textbox(fitz.Rect(x0, y, x1, y + 28), cert, fontsize=6.8, fontname="helv", color=LIGHT)
    y += 30

    sig_y = y + 22
    page.insert_text(fitz.Point(x0, sig_y - 4), "CONTRACTOR:", fontsize=7, fontname="helv", color=LIGHT)
    shape.draw_line(fitz.Point(x0 + 60, sig_y), fitz.Point(x0 + 230, sig_y))
    page.insert_text(fitz.Point(x0 + 240, sig_y - 4), "DATE:", fontsize=7, fontname="helv", color=LIGHT)
    shape.draw_line(fitz.Point(x0 + 265, sig_y), fitz.Point(x0 + 330, sig_y))

    page.insert_text(fitz.Point(x0 + 345, sig_y - 4), "ARCHITECT:", fontsize=7, fontname="helv", color=LIGHT)
    shape.draw_line(fitz.Point(x0 + 400, sig_y), fitz.Point(x1 - 65, sig_y))
    page.insert_text(fitz.Point(x1 - 60, sig_y - 4), "DATE:", fontsize=7, fontname="helv", color=LIGHT)
    shape.draw_line(fitz.Point(x1 - 32, sig_y), fitz.Point(x1, sig_y))
    shape.finish(color=RULE, width=0.7)
    shape.commit()
    y = sig_y + 14

    amt_line = f"AMOUNT CERTIFIED: {money(calc['current_payment_due'])}"
    page.insert_text(fitz.Point(x0, y), amt_line, fontsize=7.5, fontname="hebo", color=INK)
    y += 16

    shape.draw_line(fitz.Point(x0, y), fitz.Point(x1, y))
    shape.finish(color=RULE, width=1.2)
    shape.commit()
    y += 10

    # --- Continuation sheet (G703-style) ---
    page.insert_text(fitz.Point(x0, y + 8), "CONTINUATION SHEET - APPLICATION NO. " + PROJECT["application_no"],
                      fontsize=9.5, fontname="hebo", color=INK)
    y += 16

    # Column widths sized so every header label (incl. "BALANCE TO / FINISH")
    # fits at the header fontsize; widths sum to exactly (x1 - x0).
    col_widths = [24, 128, 62, 58, 52, 52, 58, 22, 76]
    col_labels = ["ITEM", "DESCRIPTION OF WORK", "SCHEDULED\nVALUE", "PREVIOUS\nAPPLICATIONS",
                  "THIS\nPERIOD", "MATERIALS\nSTORED", "TOTAL\nCOMPLETED", "%", "BALANCE TO\nFINISH"]
    assert sum(col_widths) == x1 - x0
    col_x = [x0]
    for w in col_widths[:-1]:
        col_x.append(col_x[-1] + w)
    cols = list(zip(col_labels, col_x, col_widths))
    SV_X, PREV_X, THIS_X, STORED_X, TOTAL_X, PCT_X, BAL_X = col_x[2:9]

    header_h = 22
    shape.draw_rect(fitz.Rect(x0, y, x1, y + header_h))
    shape.finish(color=RULE, fill=HEAD_FILL, width=0.7)
    shape.commit()
    for label, cx, cw in cols:
        page.insert_textbox(fitz.Rect(cx + 2, y + 2, cx + cw - 2, y + header_h - 1),
                             label, fontsize=6.0, fontname="hebo", color=INK, align=1)
    y += header_h

    row_h = 13.2
    for r in calc["rows"]:
        shape.draw_rect(fitz.Rect(x0, y, x1, y + row_h))
        shape.finish(color=RULE, width=0.4)
        shape.commit()
        page.insert_text(fitz.Point(x0 + 4, y + row_h - 3.5), r["no"], fontsize=6.6, fontname="helv", color=INK)
        page.insert_text(fitz.Point(x0 + 28, y + row_h - 3.5), r["desc"], fontsize=6.6, fontname="helv", color=INK)

        def rtxt(cx, cw, text, size=6.6):
            tw = fitz.get_text_length(text, fontname="helv", fontsize=size)
            page.insert_text(fitz.Point(cx + cw - 4 - tw, y + row_h - 3.5), text, fontsize=size, fontname="helv", color=INK)

        rtxt(SV_X, col_widths[2], f"{r['sv']:,.0f}")
        rtxt(PREV_X, col_widths[3], f"{r['prev']:,.0f}")
        rtxt(THIS_X, col_widths[4], f"{r['this']:,.0f}")
        rtxt(STORED_X, col_widths[5], f"{r['stored']:,.0f}")
        rtxt(TOTAL_X, col_widths[6], f"{r['total']:,.0f}")
        rtxt(PCT_X, col_widths[7], f"{r['pct']:,.0f}")
        rtxt(BAL_X, col_widths[8], f"{r['balance']:,.0f}")
        y += row_h

    # Totals row
    shape.draw_rect(fitz.Rect(x0, y, x1, y + row_h + 1))
    shape.finish(color=RULE, fill=HEAD_FILL, width=0.7)
    shape.commit()
    page.insert_text(fitz.Point(x0 + 4, y + row_h - 3), "TOTAL", fontsize=6.8, fontname="hebo", color=INK)

    def rtxt_total(cx, cw, text):
        tw = fitz.get_text_length(text, fontname="hebo", fontsize=6.8)
        page.insert_text(fitz.Point(cx + cw - 4 - tw, y + row_h - 3), text, fontsize=6.8, fontname="hebo", color=INK)

    rtxt_total(SV_X, col_widths[2], f"{calc['sum_sv']:,.0f}")
    rtxt_total(PREV_X, col_widths[3], f"{calc['sum_prev']:,.0f}")
    rtxt_total(THIS_X, col_widths[4], f"{calc['sum_this']:,.0f}")
    rtxt_total(STORED_X, col_widths[5], f"{calc['sum_stored']:,.0f}")
    rtxt_total(TOTAL_X, col_widths[6], f"{calc['total_completed_stored']:,.0f}")
    rtxt_total(BAL_X, col_widths[8], f"{calc['balance_to_finish'] - calc['retainage']:,.0f}")
    y += row_h + 1

    shape.commit()

    page.insert_text(fitz.Point(x0, PAGE_H - 20),
                      f"Meridian Builders, LLC   |   Application No. {PROJECT['application_no']}   |   Period ending {PROJECT['period_to']}",
                      fontsize=6.3, fontname="helv", color=LIGHT)


def build():
    calc = compute()

    # 1. Draw the form on a normal (text-bearing) source page.
    src_doc = fitz.open()
    src_page = src_doc.new_page(width=PAGE_W, height=PAGE_H)
    draw_source_page(src_page, calc)

    # 2. Rasterize that page at TARGET_DPI, saved as JPEG so the embedded
    #    image XObject is actually compressed (a raw/PNG insert_image
    #    stream can land uncompressed in the PDF unless deflated -- JPEG
    #    keeps the file a realistic "scanned page" size, like
    #    scanned-invoice.pdf).
    zoom = TARGET_DPI / 72.0
    pix = src_page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), colorspace=fitz.csGRAY)
    os.makedirs(OUT_DIR, exist_ok=True)
    jpg_path = os.path.join(OUT_DIR, "_construction-payapp-raster.jpg")
    pix.save(jpg_path, jpg_quality=90)
    print(f"Rasterized at {TARGET_DPI} DPI: {pix.width}x{pix.height}px ({pix.width*pix.height/1e6:.2f} MP)")
    src_doc.close()

    # 3. Build the final image-only PDF: one Letter page, one full-page
    #    image, zero text objects, zero embedded fonts.
    out_doc = fitz.open()
    out_doc.set_metadata({
        "title": "Application and Certificate for Payment",
        "author": "Nutrient SDK Samples",
        "subject": "Construction pay application demo document (image-only scan)",
    })
    out_page = out_doc.new_page(width=PAGE_W, height=PAGE_H)
    out_page.insert_image(out_page.rect, filename=jpg_path)

    out_path = os.path.join(OUT_DIR, "construction-pay-application.pdf")
    out_doc.save(out_path, garbage=4, deflate=True)
    out_doc.close()
    os.remove(jpg_path)

    print(f"Generated: {out_path}")
    print(f"Page size: {PAGE_W} x {PAGE_H} pt (US Letter)")

    # 4. Verify: no extractable text, no embedded fonts.
    check = fitz.open(out_path)
    cp = check[0]
    text = cp.get_text()
    fonts = cp.get_fonts()
    print(f"Verify -- extractable text length: {len(text)!r}, embedded fonts: {fonts}")
    assert text == "", "Output PDF still has extractable text!"
    assert fonts == [], "Output PDF still has embedded fonts!"
    check.close()

    return calc


if __name__ == "__main__":
    c = compute()
    print("--- computed figures (sanity check) ---")
    for k, v in c.items():
        if k == "rows":
            continue
        print(f"  {k}: {v}")
    build()
