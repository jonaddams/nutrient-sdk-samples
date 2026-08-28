"""
Generate the four-document legal set for the Web SDK "linked-exhibits" sample.

The documents deliberately contain NO annotations. The sample creates every
cross-document link at runtime with LinkAnnotation + URIAction, so these files
must stay plain -- adding links here would defeat the demonstration.

What matters about the text: each document refers to the others by a
DISTINCTIVE phrase that the sample searches for. Exhibits refer back with the
full "Master Services Agreement" title rather than "the Agreement", because
the latter appears in nearly every clause and would carpet the page in links.

Usage: python3 scripts/generate-linked-exhibits.py
"""

from __future__ import annotations

import os

import fitz  # PyMuPDF

OUT_DIR = "public/documents/linked-exhibits"

PAGE_W, PAGE_H = 612, 792  # US Letter
MARGIN = 72
BODY_SIZE = 10.5
LEADING = 15.5

TITLE_FONT = "tibo"  # Times-Bold
BODY_FONT = "tiro"  # Times-Roman
BOLD_FONT = "tibo"

AGREEMENT_TITLE = "Master Services Agreement"
AGREEMENT_DATE = "January 9, 2026"


class Writer:
    """Minimal flowing-text writer with automatic page breaks."""

    def __init__(self, doc: fitz.Document) -> None:
        self.doc = doc
        self.page = doc.new_page(width=PAGE_W, height=PAGE_H)
        self.y = MARGIN

    def _space(self, needed: float) -> None:
        if self.y + needed > PAGE_H - MARGIN:
            self.page = self.doc.new_page(width=PAGE_W, height=PAGE_H)
            self.y = MARGIN

    def title(self, text: str) -> None:
        self._space(34)
        self.page.insert_text(
            (MARGIN, self.y + 16), text, fontname=TITLE_FONT, fontsize=16
        )
        self.y += 34

    def heading(self, text: str) -> None:
        self._space(26)
        self.page.insert_text(
            (MARGIN, self.y + 12), text, fontname=BOLD_FONT, fontsize=11.5
        )
        self.y += 26

    def para(self, text: str) -> None:
        """Wrap text to the content width and emit it line by line."""
        width = PAGE_W - 2 * MARGIN
        words = text.split()
        line = ""
        for word in words:
            candidate = f"{line} {word}".strip()
            if fitz.get_text_length(candidate, BODY_FONT, BODY_SIZE) > width:
                self._space(LEADING)
                self.page.insert_text(
                    (MARGIN, self.y), line, fontname=BODY_FONT, fontsize=BODY_SIZE
                )
                self.y += LEADING
                line = word
            else:
                line = candidate
        if line:
            self._space(LEADING)
            self.page.insert_text(
                (MARGIN, self.y), line, fontname=BODY_FONT, fontsize=BODY_SIZE
            )
            self.y += LEADING
        self.y += 8


def build_agreement(path: str) -> None:
    doc = fitz.open()
    w = Writer(doc)
    w.title(AGREEMENT_TITLE)
    w.para(
        f"This {AGREEMENT_TITLE} (this agreement) is entered into as of "
        f"{AGREEMENT_DATE} between Vanarsdel Ltd., a Delaware corporation "
        "(the Client), and Northwind Consulting LLC (the Provider)."
    )

    w.heading("1. Services")
    w.para(
        "The Provider shall perform the services described in Exhibit A, which "
        "sets out the deliverables, milestones, and acceptance criteria for each "
        "engagement. No work shall commence until Exhibit A has been signed by "
        "both parties."
    )

    w.heading("2. Fees and Payment")
    w.para(
        "The Client shall pay the Provider according to the rate card in "
        "Exhibit B. Rates in Exhibit B are fixed for the initial twelve (12) "
        "month term and may be revised thereafter only by written amendment. "
        "Invoices are due within thirty (30) days of receipt."
    )

    w.heading("3. Confidentiality")
    w.para(
        "The parties' confidentiality obligations are governed by Exhibit C, "
        "which survives termination of this agreement for a period of three (3) "
        "years. Nothing in Exhibit C limits either party's obligations under "
        "applicable data protection law."
    )

    w.heading("4. Term and Termination")
    w.para(
        "This agreement commences on the date first written above and continues "
        "for twelve (12) months unless terminated earlier by either party on "
        "thirty (30) days written notice. Termination does not affect fees "
        "accrued for services already performed under Exhibit A."
    )

    w.heading("5. Independent Contractor")
    w.para(
        "The Provider is an independent contractor. Nothing in this agreement "
        "creates an employment, partnership, or agency relationship. The "
        "Provider is responsible for all taxes, insurance, and benefits for its "
        "personnel."
    )

    w.heading("6. Intellectual Property")
    w.para(
        "Work product created specifically for the Client under Exhibit A is "
        "assigned to the Client on payment in full. The Provider retains "
        "ownership of pre-existing materials, tools, and methodologies used in "
        "performing the services."
    )

    w.heading("7. Limitation of Liability")
    w.para(
        "Neither party shall be liable for indirect, incidental, or "
        "consequential damages. Each party's aggregate liability is limited to "
        "the fees paid or payable under this agreement in the twelve (12) months "
        "preceding the claim."
    )

    w.heading("8. Entire Agreement")
    w.para(
        "This agreement, together with the exhibits listed below, constitutes "
        "the entire agreement between the parties and supersedes all prior "
        "discussions. In the event of a conflict, the terms of this agreement "
        "control over any exhibit."
    )

    w.heading("Schedule of Exhibits")
    w.para("Exhibit A - Statement of Work")
    w.para("Exhibit B - Fee Schedule")
    w.para("Exhibit C - Mutual Non-Disclosure Agreement")

    doc.save(path)
    doc.close()


def exhibit_preamble(label: str) -> str:
    return (
        f"This {label} is attached to and incorporated into the "
        f"{AGREEMENT_TITLE} dated {AGREEMENT_DATE} between Vanarsdel Ltd. and "
        "Northwind Consulting LLC. Capitalized terms used but not defined here "
        f"have the meanings given in the {AGREEMENT_TITLE}."
    )


def build_exhibit_a(path: str) -> None:
    doc = fitz.open()
    w = Writer(doc)
    w.title("Exhibit A - Statement of Work")
    w.para(exhibit_preamble("Exhibit A"))

    w.heading("A.1 Scope")
    w.para(
        "The Provider shall deliver a phased document-workflow modernization "
        "program comprising discovery, solution design, implementation, and "
        "handover. Each phase concludes with a written acceptance milestone."
    )

    w.heading("A.2 Deliverables")
    w.para(
        "Phase 1 - Discovery report and current-state assessment. "
        "Phase 2 - Target architecture and migration plan. "
        "Phase 3 - Implementation of the agreed architecture in the Client's "
        "environment. Phase 4 - Handover documentation and administrator "
        "training."
    )

    w.heading("A.3 Rates")
    w.para(
        "Work under this Exhibit A is billed at the rates set out in Exhibit B. "
        "Any change to scope that affects the fee estimate requires a written "
        "change order signed by both parties."
    )

    w.heading("A.4 Confidential Material")
    w.para(
        "Client materials disclosed to the Provider in the course of this "
        "Exhibit A are Confidential Information and are handled in accordance "
        "with Exhibit C."
    )

    w.heading("A.5 Acceptance")
    w.para(
        "The Client shall review each deliverable within ten (10) business days "
        "and either accept it or provide written notice of deficiencies. "
        "Deliverables not rejected within that period are deemed accepted."
    )

    doc.save(path)
    doc.close()


def build_exhibit_b(path: str) -> None:
    doc = fitz.open()
    w = Writer(doc)
    w.title("Exhibit B - Fee Schedule")
    w.para(exhibit_preamble("Exhibit B"))

    w.heading("B.1 Professional Services Rates")
    w.para(
        "Principal Consultant - 285 USD per hour. "
        "Senior Consultant - 225 USD per hour. "
        "Consultant - 175 USD per hour. "
        "Project Coordinator - 120 USD per hour."
    )

    w.heading("B.2 Fixed-Fee Phases")
    w.para(
        "Phase 1 Discovery is delivered on a fixed-fee basis of 48,000 USD. "
        "Phases 2 through 4 as described in Exhibit A are billed on a "
        "time-and-materials basis against the rates in section B.1."
    )

    w.heading("B.3 Expenses")
    w.para(
        "Pre-approved travel and accommodation are reimbursed at cost without "
        "markup. Expenses exceeding 2,500 USD in any month require prior "
        "written approval from the Client."
    )

    w.heading("B.4 Rate Review")
    w.para(
        "The rates in this Exhibit B are fixed for the initial term of the "
        "Master Services Agreement. Any subsequent revision takes effect only "
        "on written amendment signed by both parties."
    )

    doc.save(path)
    doc.close()


def build_exhibit_c(path: str) -> None:
    doc = fitz.open()
    w = Writer(doc)
    w.title("Exhibit C - Mutual Non-Disclosure Agreement")
    w.para(exhibit_preamble("Exhibit C"))

    w.heading("C.1 Definition")
    w.para(
        "Confidential Information means non-public information disclosed by "
        "either party, in any form, that is designated as confidential or that "
        "a reasonable person would understand to be confidential given its "
        "nature and the circumstances of disclosure."
    )

    w.heading("C.2 Obligations")
    w.para(
        "Each party shall protect the other's Confidential Information with at "
        "least the degree of care it applies to its own, shall not disclose it "
        "to third parties without prior written consent, and shall use it only "
        "to perform its obligations under the Master Services Agreement."
    )

    w.heading("C.3 Exclusions")
    w.para(
        "These obligations do not apply to information that is or becomes "
        "public through no fault of the receiving party, was known to the "
        "receiving party before disclosure, or is independently developed "
        "without reference to the disclosing party's information."
    )

    w.heading("C.4 Term")
    w.para(
        "This Exhibit C survives termination of the Master Services Agreement "
        "for three (3) years. Obligations relating to personal data continue "
        "for as long as that data is retained."
    )

    w.heading("C.5 Return of Materials")
    w.para(
        "On written request, each party shall return or destroy the other's "
        "Confidential Information, except for copies retained in routine backup "
        "systems or as required by law. Material delivered under Exhibit A is "
        "returned in the format in which it was supplied."
    )

    doc.save(path)
    doc.close()


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    build_agreement(f"{OUT_DIR}/master-services-agreement.pdf")
    build_exhibit_a(f"{OUT_DIR}/exhibit-a-statement-of-work.pdf")
    build_exhibit_b(f"{OUT_DIR}/exhibit-b-fee-schedule.pdf")
    build_exhibit_c(f"{OUT_DIR}/exhibit-c-mutual-nda.pdf")
    print(f"Wrote 4 documents to {OUT_DIR}/")


if __name__ == "__main__":
    main()
