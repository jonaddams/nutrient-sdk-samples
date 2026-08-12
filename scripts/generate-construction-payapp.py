"""
Generate a realistic AIA-style "Application and Certificate for Payment"
(G702-style certificate only -- no G703 continuation sheet) for a fictional
construction project.

This replaces westbridge-engineering-submittal-form.pdf in the Extraction
Studio corpus. Westbridge was retired for being a *demo hazard*: at
1700x2338pt (architectural D-size) its rasterized payload is ~8x a Letter
page, driving 33-36s extraction times and roughly 50% failure rate against
the hosted backend. Its content-level difficulty (retainage math, derived
totals) is exactly what makes it a good accuracy test, so this document
keeps that content and fixes the geometry:

  - Letter page (612 x 792 pt) instead of D-size.

SDK-051 (see docs/internal/sdk-defects/) measured that it is *rasterized
pages*, not page density, that drive the slowness and failures: a
rasterized version of this same document degraded sharply past 4-6 fields
(1/4 to 1/6 success, 42-51s before failing) while a text-layer control
document stayed fast and reliable (5/5 success, 5.4-13.7s) at 8 fields. So
this generator emits the form as ordinary vector/text content directly --
no rasterize-to-image step. The result has a real, searchable text layer
and embedded fonts; verify with page.get_text() and page.get_fonts().

Iteration 2 (this version) dropped the G703-style continuation sheet
entirely, on measurement, not guesswork: a text-layer version of this
document WITH the continuation sheet still failed the hosted-backend
acceptance bar for Claude (one 500 -- finishReason=length truncation --
and one HTTP 200 with zero fields, out of three runs; the one clean run
took 22.8s, still over the 20s cap) even though it has a real text layer.
The control that motivated the text-layer fix (meridian-balance-sheet.pdf,
5/5 success at 8 fields) is a plain statement with no line-item table, so
the actual trigger is not rasterization alone -- it's how many distinct
regions the grounding stage has to locate, which includeSourceLocations
makes roughly proportional to page content. The continuation sheet was
the single largest contributor to that region count. Separately, all
three providers (not just Claude) repeatedly returned the Change Order
Summary box's figures (150,900 / 35,500 / 186,400) instead of the
certificate's own line values for retainage/contractSumToDate/
currentPaymentDue -- three providers failing identically points at the
form's layout, not three independent model errors. So this version:

  - Removes the continuation sheet's line-item table (and its rendering
    code) entirely. A standalone G702 certificate is completely realistic
    -- it is routinely issued on its own -- so this is not a compromise
    away from authenticity.
  - Keeps the Change Order Summary box (it is genuinely part of a real
    G702), but redraws it as its own bordered, half-width box set off
    from the numbered certificate lines, rather than flowing directly
    beneath them in the same unbounded right-aligned money column. On the
    previous layout the box's three dollar figures sat immediately under
    Line 9 in visually identical formatting to Lines 1-9, which is a
    plausible reason a model would pick a Change Order Summary figure
    when asked for a certificate-line figure. A distinct bordered box is
    both more realistic (real G702s box this section) and more visually
    separated from the numbered lines above it.

The certificate's own line items (1: original contract sum, 2: change
orders, 3: contract sum to date, 4: total completed & stored, 5:
retainage, 6: total earned less retainage, 7: less previous certificates,
8: current payment due, 9: balance to finish) are all still DERIVED --
computed from the same underlying facts as before (the original contract
sum, the two change-order figures, and the two completed-and-stored
totals below) -- not hand-typed, so the arithmetic is guaranteed
internally consistent, exactly as before. What changed is that the
per-line-item breakdown feeding "total completed & stored to date" (what
would live on a G703, if one were attached) is no longer rendered on the
page.

Usage: python3 scripts/generate-construction-payapp.py
Output: public/documents/construction-pay-application.pdf
"""

import os
import fitz  # PyMuPDF

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "documents")
PAGE_W, PAGE_H = fitz.paper_size("letter")  # 612 x 792
MARGIN = 40

INK = (0.12, 0.12, 0.12)
RULE = (0.35, 0.35, 0.35)
LIGHT = (0.55, 0.55, 0.55)
HEAD_FILL = (0.90, 0.90, 0.88)

# ---------------------------------------------------------------------------
# Project facts (fictional). All summary figures below are DERIVED from
# these, not independently authored.
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

# Completed-and-stored totals. These used to be the summed columns of a
# 3-row continuation-sheet line-item table (see git history prior to this
# iteration for that table); the per-line-item breakdown is no longer
# rendered on the page (there is no G703 attached to this document), but
# the two totals below are exactly the sums that table produced, so the
# certificate's own figures are unchanged from the previous iteration --
# only the visible breakdown is gone.
TOTAL_COMPLETED_STORED_TO_DATE = 3_949_100.00
PREV_TOTAL_COMPLETED_STORED = 3_468_400.00


def money(v):
    return f"${v:,.2f}"


def compute():
    change_orders = CHANGE_ORDERS_PREVIOUS + CHANGE_ORDERS_THIS_MONTH
    contract_sum_to_date = ORIGINAL_CONTRACT_SUM + change_orders

    total_completed_stored = TOTAL_COMPLETED_STORED_TO_DATE
    retainage = round(total_completed_stored * RETAINAGE_RATE, 2)
    total_earned_less_retainage = total_completed_stored - retainage

    # "Previous certificates for payment" = last application's total
    # completed-and-stored (approximated here as this period's cumulative
    # "previous applications" total, i.e. no materials were left stored
    # at the prior application) less that application's own retainage.
    prev_total_completed_stored = PREV_TOTAL_COMPLETED_STORED
    prev_retainage = round(prev_total_completed_stored * RETAINAGE_RATE, 2)
    less_previous_certificates = prev_total_completed_stored - prev_retainage

    current_payment_due = total_earned_less_retainage - less_previous_certificates
    balance_to_finish = contract_sum_to_date - total_earned_less_retainage

    return {
        "change_orders": change_orders,
        "contract_sum_to_date": contract_sum_to_date,
        "total_completed_stored": total_completed_stored,
        "retainage": retainage,
        "total_earned_less_retainage": total_earned_less_retainage,
        "less_previous_certificates": less_previous_certificates,
        "current_payment_due": current_payment_due,
        "balance_to_finish": balance_to_finish,
    }


def draw_source_page(page, calc):
    shape = page.new_shape()
    x0, x1 = MARGIN, PAGE_W - MARGIN
    y = MARGIN

    # --- Title block ---
    page.insert_text(fitz.Point(x0, y + 14), "APPLICATION AND CERTIFICATE FOR PAYMENT",
                      fontsize=13, fontname="hebo", color=INK)
    page.insert_text(fitz.Point(x0, y + 27), "AIA-style Document G702 (adapted format)",
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
            # See the certification-statement comment below: insert_textbox
            # silently renders nothing if the box is too short. Assert the
            # non-negative return value rather than trusting the drawing
            # code fit by inspection.
            rc = page.insert_textbox(fitz.Rect(px, py + 3, px + wrap_w, py + 3 + 22),
                                      value, fontsize=value_size, fontname="helv", color=INK)
            assert rc >= 0, f"field value did not fit its box (rc={rc}): {value!r}"
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
    y = line("4", "TOTAL COMPLETED & STORED TO DATE", calc["total_completed_stored"], y)
    y = line("5a", f"RETAINAGE: {RETAINAGE_RATE*100:.1f}% of Completed Work & Stored Materials", calc["retainage"], y, indent=6)
    y = line("5", "Total Retainage", calc["retainage"], y, rule_after=True)
    y = line("6", "TOTAL EARNED LESS RETAINAGE (Line 4 less Line 5 Total)", calc["total_earned_less_retainage"], y, bold=True)
    y = line("7", "LESS PREVIOUS CERTIFICATES FOR PAYMENT", calc["less_previous_certificates"], y, rule_after=True)
    y = line("8", "CURRENT PAYMENT DUE", calc["current_payment_due"], y, bold=True, rule_after=True)
    y = line("9", "BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 less Line 6)", calc["balance_to_finish"], y)
    y += 14

    # --- Change order summary: a genuinely part-of-the-form section, but
    # drawn as its own bordered, half-width box rather than flowing beneath
    # the numbered lines in the same unbounded right-aligned money column.
    # (See the module docstring: on the previous layout, its three dollar
    # figures sat directly under Line 9 in identical formatting to Lines
    # 1-9, and all three providers repeatedly returned one of THESE figures
    # -- 150,900 / 35,500 / 186,400 -- when asked for a certificate-line
    # field. A bordered box is both more realistic (real G702s box this
    # section) and visually distinct from the numbered lines above it.)
    co_rows = [
        ("Total changes approved in previous months", CHANGE_ORDERS_PREVIOUS),
        ("Total approved this month", CHANGE_ORDERS_THIS_MONTH),
        ("TOTAL", calc["change_orders"]),
    ]
    box_w = 260
    box_x0 = x0
    box_y0 = y
    head_h = 14
    row_h = 12
    box_h = head_h + row_h * len(co_rows) + 5

    shape.draw_rect(fitz.Rect(box_x0, box_y0, box_x0 + box_w, box_y0 + head_h))
    shape.finish(color=RULE, fill=HEAD_FILL, width=0.7)
    shape.commit()
    page.insert_text(fitz.Point(box_x0 + 5, box_y0 + head_h - 4),
                      "CHANGE ORDER SUMMARY", fontsize=7.3, fontname="hebo", color=INK)

    shape.draw_rect(fitz.Rect(box_x0, box_y0 + head_h, box_x0 + box_w, box_y0 + box_h))
    shape.finish(color=RULE, width=0.7)
    shape.commit()

    ry = box_y0 + head_h + 9
    for label, val in co_rows:
        page.insert_text(fitz.Point(box_x0 + 6, ry), label, fontsize=6.8, fontname="helv", color=INK)
        val_s = money(val)
        vw = fitz.get_text_length(val_s, fontname="helv", fontsize=6.8)
        page.insert_text(fitz.Point(box_x0 + box_w - 6 - vw, ry), val_s, fontsize=6.8, fontname="helv", color=INK)
        ry += row_h
    y = box_y0 + box_h + 16

    # --- Certification statement ---
    # NOTE: insert_textbox() silently draws NOTHING -- no exception, no
    # partial text -- if the box is even slightly too short for the text at
    # this fontsize/width (it returns a negative "unused space" value in
    # that case; verify with the return value, not just "did it raise").
    # This box was previously 28pt tall and this paragraph rendered
    # invisibly (zero characters, confirmed via get_text()) on every prior
    # iteration of this document, including before the G703 removal --
    # discovered here via a visual pixmap render and an extracted-text
    # check, not by inspection of the drawing code alone. 42pt fits this
    # paragraph at 6.8pt/three lines with margin.
    cert = ("The undersigned Contractor certifies that to the best of the Contractor's knowledge, the Work "
            "covered by this Application for Payment has been completed in accordance with the Contract "
            "Documents, that all amounts have been paid for Work for which previous Certificates for Payment "
            "were issued, and that the current payment shown herein is now due.")
    cert_rc = page.insert_textbox(fitz.Rect(x0, y, x1, y + 42), cert, fontsize=6.8, fontname="helv", color=LIGHT)
    assert cert_rc >= 0, f"certification statement did not fit its box (rc={cert_rc})"
    y += 44

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

    page.insert_text(fitz.Point(x0, PAGE_H - 20),
                      f"Meridian Builders, LLC   |   Application No. {PROJECT['application_no']}   |   Period ending {PROJECT['period_to']}",
                      fontsize=6.3, fontname="helv", color=LIGHT)


def build():
    calc = compute()

    # Draw the form as ordinary vector/text content directly onto the
    # output page -- no rasterize-to-image step, so the PDF keeps a real
    # text layer and embedded fonts (see SDK-051 in the module docstring).
    os.makedirs(OUT_DIR, exist_ok=True)
    out_doc = fitz.open()
    out_doc.set_metadata({
        "title": "Application and Certificate for Payment",
        "author": "Nutrient SDK Samples",
        "subject": "Construction pay application demo document (text-layer PDF, G702 certificate only)",
    })
    out_page = out_doc.new_page(width=PAGE_W, height=PAGE_H)
    draw_source_page(out_page, calc)

    out_path = os.path.join(OUT_DIR, "construction-pay-application.pdf")
    out_doc.save(out_path, garbage=4, deflate=True)
    out_doc.close()

    print(f"Generated: {out_path}")
    print(f"Page size: {PAGE_W} x {PAGE_H} pt (US Letter)")

    # Verify: has extractable text and embedded fonts, and no embedded
    # raster image anywhere on the page (i.e. this really is a text-layer
    # document, not an image with a thin text veneer).
    check = fitz.open(out_path)
    cp = check[0]
    text = cp.get_text()
    fonts = cp.get_fonts()
    images = cp.get_images()
    print(f"Verify -- extractable text length: {len(text)}, embedded fonts: {len(fonts)}, embedded images: {len(images)}")
    assert text != "", "Output PDF has no extractable text!"
    assert fonts != [], "Output PDF has no embedded fonts!"
    assert images == [], "Output PDF has an embedded raster image -- not a true text-layer document!"
    check.close()

    return calc


if __name__ == "__main__":
    c = compute()
    print("--- computed figures (sanity check) ---")
    for k, v in c.items():
        print(f"  {k}: {v}")
    build()
