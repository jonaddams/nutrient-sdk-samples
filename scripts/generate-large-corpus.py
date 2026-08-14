"""Generate the large-document half of the extraction cost corpus.

Why this exists: the studio's demo corpus is 1-2 pages throughout, which is the
size where a fixed per-call SDK overhead reads as its LARGEST percentage. A cost
comparison run only on small documents tells a prospect the least useful version
of the truth. These three documents span 12 to 40 pages so the same constant can
be seen falling from tens of percent to low single digits.

Three properties this script is built around:

1. LETTER SIZE, MANY PAGES. Page *area* drives the SDK's local rasterization
   cost (a D-size architectural sheet ran 33-36s against 5-9s for everything
   else, and was retired for it). Page *count* is the variable we actually want
   to vary, so every page here is plain Letter.

2. THE ANSWER KEY IS EMITTED IN THE SAME PASS AS THE PDF. Values are written
   into the document and into the JSON from one dict, so they cannot drift. Two
   earlier corpus additions shipped guessed field values that were caught only
   because a reviewer opened the images; generating both halves together removes
   that failure mode by construction.

3. IT VERIFIES ITSELF. After writing, each PDF is re-opened, its text extracted,
   and every answer value asserted present. A document whose key does not match
   its own text is a corpus that lies, so the script fails loudly rather than
   emitting one.

These documents are deliberately NOT registered in the studio's document strip
(`lib/docs.ts`). They are corpus for the cost tool. A 40-page document in the
sales demo means a presenter picks it and waits — the exact problem retiring the
D-size sheet solved.

Everything here is synthetic. Names, identifiers and figures are invented, and
every page carries a banner saying so.

    python scripts/generate-large-corpus.py
"""

from __future__ import annotations

import json
from pathlib import Path

import fitz  # PyMuPDF

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "documents"
KEY_PATH = OUT_DIR / "large-corpus-answers.json"

BANNER = "SYNTHETIC SAMPLE - generated for Nutrient SDK evaluation. Not a real record."

PAGE = fitz.paper_rect("letter")
MARGIN = 54.0
BODY_FONT = "helv"
BOLD_FONT = "hebo"


def _page(doc: fitz.Document, heading: str, lines: list[str]) -> None:
    """One Letter page: heading, body lines, synthetic-sample footer."""
    page = doc.new_page(width=PAGE.width, height=PAGE.height)
    y = MARGIN
    page.insert_text((MARGIN, y), heading, fontname=BOLD_FONT, fontsize=13)
    y += 26
    for line in lines:
        if y > PAGE.height - MARGIN - 40:
            break
        style = BOLD_FONT if line.startswith("**") else BODY_FONT
        text = line.removeprefix("**")
        page.insert_text((MARGIN, y), text, fontname=style, fontsize=9.5)
        y += 14
    page.insert_text(
        (MARGIN, PAGE.height - MARGIN + 10), BANNER, fontname=BODY_FONT, fontsize=7
    )


def _filler(prefix: str, start: int, count: int) -> list[list[str]]:
    """Realistic-looking continuation pages, so page count buys real tokens.

    Density matters as much as page count. A sparse 40-page PDF is page-count
    large but token-light, which both understates what a prospect's contracts
    and case files actually look like and understates how far the SDK's fixed
    overhead falls on them. These pages run ~40 lines of full-width prose and
    tabulated entries, in the region of 600 tokens per page.
    """
    pages = []
    for i in range(count):
        n = start + i
        body = [
            f"Entry {n:03d} recorded {n % 28 + 1:02d} March 2026 under reference {prefix}-{n:04d}.",
            "Reviewed against the supporting schedule and found consistent with the figures",
            "carried forward from the preceding section. No adjustment was required and the",
            "balance was released for onward processing in the ordinary course.",
            "",
            f"  Reference               {prefix}-{n:04d}",
            f"  Line amount             {(n * 1372) % 90000 + 1000:,}.00",
            f"  Counterparty            {'Ashfield' if n % 2 else 'Brackenmoor'} Holdings LLC",
            f"  Status                  {'Closed' if n % 3 else 'Open'}",
            f"  Approving authority     {'Regional' if n % 4 else 'Divisional'} Controller",
            "",
            "Supporting narrative continues below. This section is retained in full for the",
            "audit trail and is reproduced without amendment from the originating system of",
            "record. Where a figure has been restated, the original is shown in the notes to",
            "this section and the restatement is cross-referenced to the approving authority",
            "named above, together with the date on which the approval was minuted.",
            "",
            "The review procedure applied to this entry followed the standard three-stage",
            "process: initial capture by the originating department, independent check by a",
            "second reviewer holding no responsibility for the underlying transaction, and",
            "final release by an authority at or above the threshold applicable to the line",
            "amount. Each stage is evidenced within the system of record and no stage was",
            "waived or performed retrospectively in respect of this entry.",
            "",
            "Exceptions arising during the period were logged and cleared within the agreed",
            "service window. No exception relating to this reference remained open at the",
            "reporting date, and none was escalated beyond the divisional level. The ageing",
            "profile is unchanged from the prior period and no concentration threshold was",
            "breached in respect of the counterparty named above.",
            "",
            f"  Prior period comparative    {(n * 1180) % 84000 + 900:,}.00",
            f"  Movement in the period      {(n * 192) % 7000 + 50:,}.00",
            f"  Cumulative to date          {(n * 2551) % 240000 + 4000:,}.00",
            "",
            "Notes to this section: amounts are stated before the elimination of intra-group",
            "balances and are presented on a basis consistent with the preceding period. The",
            "classification applied reflects the substance of the underlying arrangement and",
            "not solely its legal form. Comparatives have been re-presented where necessary",
            "to conform to the current period's classification, and the effect of any such",
            "re-presentation is disclosed in the reconciliation appended to this section.",
        ]
        pages.append([f"CONTINUATION - {prefix} SCHEDULE, ENTRY {n:03d}"] + body)
    return pages


def build_claim_file() -> tuple[str, dict, list[list[str]], str]:
    a = {
        "claimNumber": {"printed": "NG-2026-004417", "value": "NG-2026-004417"},
        "policyNumber": {"printed": "NAP-88213-06", "value": "NAP-88213-06"},
        "dateOfLoss": {"printed": "2026-01-19", "value": "2026-01-19"},
        "insuredName": {"printed": "Harriet Okonjo-Vale", "value": "Harriet Okonjo-Vale"},
        "totalClaimed": {"printed": "48,215.60", "value": 48215.60},
    }
    front = [
        [
            "**NORTHGATE MUTUAL - CONSOLIDATED CLAIM FILE",
            "",
            f"  Claim number       {a['claimNumber']['printed']}",
            f"  Policy number      {a['policyNumber']['printed']}",
            f"  Date of loss       {a['dateOfLoss']['printed']}",
            f"  Insured            {a['insuredName']['printed']}",
            f"  Total claimed      {a['totalClaimed']['printed']}",
            "",
            "This file consolidates the first notice of loss, the adjuster's inspection",
            "record, third-party repair estimates and all correspondence to date.",
        ],
        [
            "**SECTION 1 - FIRST NOTICE OF LOSS",
            "",
            "Reported by the insured by telephone at 08:42 on the date of loss. Vehicle",
            "struck from the rear while stationary at a signalled junction. No injuries",
            "reported at the scene. Police attended and issued an incident reference.",
            "",
            "  Vehicle            2023 Aveline Estate 2.0",
            "  Registration       KX26 PLV",
            "  Location           Junction of Marsh Lane and Corley Road",
        ],
        [
            "**SECTION 2 - ADJUSTER INSPECTION",
            "",
            "Inspection carried out at the approved repair centre. Damage consistent with",
            "the reported mechanism. Rear crossmember deformed; boot floor displaced.",
            "",
            "  Assessed severity  Moderate",
            "  Repairable         Yes",
            "  Estimated days     11",
        ],
    ]
    return "northgate-claim-file.pdf", a, front + _filler("NG", 1, 9), "claims"


def build_annual_report() -> tuple[str, dict, list[list[str]], str]:
    a = {
        "fiscalYearEnd": {"printed": "2025-12-31", "value": "2025-12-31"},
        "totalRevenue": {"printed": "184,602,000", "value": 184602000},
        "netIncome": {"printed": "21,455,000", "value": 21455000},
        "totalAssets": {"printed": "402,118,000", "value": 402118000},
        "sharesOutstanding": {"printed": "48,300,000", "value": 48300000},
    }
    front = [
        [
            "**MERIDIAN INDUSTRIAL HOLDINGS - ANNUAL REPORT",
            "",
            f"  Fiscal year end        {a['fiscalYearEnd']['printed']}",
            f"  Total revenue          {a['totalRevenue']['printed']}",
            f"  Net income             {a['netIncome']['printed']}",
            f"  Total assets           {a['totalAssets']['printed']}",
            f"  Shares outstanding     {a['sharesOutstanding']['printed']}",
            "",
            "Amounts in United States dollars unless otherwise stated.",
        ],
        [
            "**MANAGEMENT DISCUSSION AND ANALYSIS",
            "",
            "Revenue grew across both operating segments, with the larger contribution",
            "from industrial fabrication. Margin improved on the prior year as input",
            "costs stabilised and the Ohio facility reached planned utilisation.",
            "",
            "  Segment - Fabrication      118,940,000",
            "  Segment - Distribution      65,662,000",
        ],
        [
            "**CONSOLIDATED STATEMENT OF OPERATIONS",
            "",
            f"  Revenue                    {a['totalRevenue']['printed']}",
            "  Cost of sales             (131,208,000)",
            "  Gross profit                53,394,000",
            "  Operating expenses         (24,901,000)",
            "  Operating income            28,493,000",
            "  Income tax                  (7,038,000)",
            f"  Net income                  {a['netIncome']['printed']}",
        ],
        [
            "**CONSOLIDATED BALANCE SHEET",
            "",
            "  Cash and equivalents        31,776,000",
            "  Accounts receivable         44,209,000",
            "  Inventory                   58,914,000",
            "  Property and equipment     201,433,000",
            "  Other assets                65,786,000",
            f"  Total assets               {a['totalAssets']['printed']}",
        ],
    ]
    return "meridian-annual-report.pdf", a, front + _filler("MIH", 1, 21), "finance"


def build_health_record() -> tuple[str, dict, list[list[str]], str]:
    a = {
        "recordId": {"printed": "RGH-77-401925", "value": "RGH-77-401925"},
        "admissionDate": {"printed": "2026-02-03", "value": "2026-02-03"},
        "dischargeDate": {"printed": "2026-02-11", "value": "2026-02-11"},
        "primaryDiagnosis": {
            "printed": "Community-acquired pneumonia",
            "value": "Community-acquired pneumonia",
        },
        "totalCharges": {"printed": "63,940.25", "value": 63940.25},
    }
    front = [
        [
            "**REGIONAL GENERAL HOSPITAL - INPATIENT RECORD",
            "",
            f"  Record identifier      {a['recordId']['printed']}",
            f"  Admission date         {a['admissionDate']['printed']}",
            f"  Discharge date         {a['dischargeDate']['printed']}",
            f"  Primary diagnosis      {a['primaryDiagnosis']['printed']}",
            f"  Total charges          {a['totalCharges']['printed']}",
            "",
            "Patient identifiers in this record are synthetic and do not correspond to",
            "any living or deceased individual.",
        ],
        [
            "**ADMISSION SUMMARY",
            "",
            "Presented to the emergency department with a four-day history of productive",
            "cough, fever and pleuritic chest pain. Chest radiograph demonstrated right",
            "lower lobe consolidation. Admitted for intravenous antibiotics and oxygen.",
            "",
            "  Triage category    2",
            "  Admitting service  General Medicine",
        ],
        [
            "**DISCHARGE SUMMARY",
            "",
            "Completed a course of intravenous antibiotics with sustained improvement in",
            "inflammatory markers and oxygen requirement. Ambulating independently and",
            "afebrile for 48 hours prior to discharge. Follow-up arranged at two weeks.",
            "",
            f"  Length of stay     8 days",
            f"  Discharge date     {a['dischargeDate']['printed']}",
        ],
    ]
    return "regional-health-record.pdf", a, front + _filler("RGH", 1, 37), "healthcare"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}

    for builder in (build_claim_file, build_annual_report, build_health_record):
        filename, answers, pages, category = builder()
        doc = fitz.open()
        for block in pages:
            _page(doc, block[0].removeprefix("**") if block else "", block[1:])
        path = OUT_DIR / filename
        doc.save(path)
        doc.close()

        # Self-verification. A corpus whose answer key disagrees with its own
        # documents is worse than no corpus, so this fails rather than warns.
        reopened = fitz.open(path)
        text = "".join(p.get_text() for p in reopened.pages())
        page_count = reopened.page_count
        reopened.close()
        missing = [k for k, v in answers.items() if v["printed"] not in text]
        if missing:
            raise SystemExit(f"{filename}: values not extractable from the PDF: {missing}")

        manifest[path.stem] = {
            "file": f"documents/{filename}",
            "category": category,
            "pages": page_count,
            "fields": answers,
        }
        print(f"  {page_count:>3}pp  {filename}  ({len(answers)} verified values)")

    KEY_PATH.write_text(json.dumps({"documents": manifest}, indent=2) + "\n")
    total = sum(d["pages"] for d in manifest.values())
    print(f"\n{len(manifest)} documents, {total} pages total")
    print(f"answer key -> {KEY_PATH.relative_to(OUT_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
