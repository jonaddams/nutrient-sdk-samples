"""Generate the counterparty contract for the AI Contract Redline sample.

A vendor-paper Master Services Agreement that deliberately breaks seven of the
customer's playbook rules (see app/document-authoring-sdk/ai-contract-redline/
playbook.ts) and keeps several compliant clauses the agent must leave alone.

    python3 scripts/generate-vendor-msa.py
"""

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

OUT = "public/documents/vendor-msa.docx"

SECTIONS = [
    (
        "1. Services",
        "Vendor will provide the subscription services and related support described in each Order Form "
        "(the \"Services\"). Each Order Form is governed by this Agreement.",
    ),
    (
        "2. Fees and Payment",
        # PLAYBOOK: payment terms (net 15 -> net 45) and late fee (1.5% -> 1%).
        "Customer will pay all fees within fifteen (15) days of the invoice date. Overdue amounts accrue "
        "interest at one and one-half percent (1.5%) per month until paid.",
    ),
    (
        "3. Term and Renewal",
        # PLAYBOOK: renewal notice (90 days -> 30 days).
        "This Agreement begins on the Effective Date and continues for an initial term of twelve (12) months. "
        "It renews automatically for successive twelve (12) month terms unless either party gives written "
        "notice of non-renewal at least ninety (90) days before the end of the then-current term.",
    ),
    (
        "4. Termination",
        # PLAYBOOK: customer termination for convenience (missing).
        "Either party may terminate this Agreement if the other party materially breaches it and does not "
        "cure the breach within thirty (30) days after written notice.",
    ),
    (
        "5. Confidentiality",
        # PLAYBOOK: confidentiality survival (1 year -> 3 years).
        "Each party will protect the other party's Confidential Information with at least reasonable care "
        "and use it only to perform under this Agreement. These obligations survive for one (1) year after "
        "this Agreement ends.",
    ),
    (
        "6. Data Security",
        # PLAYBOOK: breach notification (undue delay -> 72 hours).
        "Vendor will maintain administrative, physical, and technical safeguards designed to protect Customer "
        "Data. Vendor will notify Customer of any security breach affecting Customer Data without undue delay.",
    ),
    (
        "7. Intellectual Property",
        # Compliant: the agent should not touch this.
        "Customer owns all Customer Data. Vendor owns the Services and all improvements to them. Nothing in "
        "this Agreement transfers ownership of either party's intellectual property.",
    ),
    (
        "8. Limitation of Liability",
        # PLAYBOOK: liability cap (3 months of fees -> 12 months).
        "Each party's total liability arising out of this Agreement will not exceed the fees paid by Customer "
        "in the three (3) months before the event giving rise to the claim.",
    ),
    (
        "9. Governing Law",
        # Compliant: Delaware is the playbook standard.
        "This Agreement is governed by the laws of the State of Delaware, without regard to its conflict of "
        "laws rules.",
    ),
    (
        "10. General",
        # Compliant.
        "This Agreement is the entire agreement between the parties about its subject matter. Any amendment "
        "must be in writing and signed by both parties.",
    ),
]


def main() -> None:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    title = doc.add_heading("Master Services Agreement", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph(
        "This Master Services Agreement (the \"Agreement\") is entered into as of March 1, 2026 (the "
        "\"Effective Date\") between Brightline Software, Inc. (\"Vendor\") and Acme Corporation "
        "(\"Customer\")."
    )

    for heading, body in SECTIONS:
        doc.add_heading(heading, level=2)
        doc.add_paragraph(body)

    doc.add_paragraph()
    sig = doc.add_paragraph("Brightline Software, Inc.\t\t\tAcme Corporation")
    sig.runs[0].bold = True
    doc.add_paragraph("By: ____________________\t\tBy: ____________________")

    doc.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
