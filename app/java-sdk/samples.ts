import type { Sample } from "@/app/_components/SamplesIndex";

/**
 * The java sdk sample registry.
 *
 * Split out of page.tsx on 2026-08-06 so app/page.tsx can DERIVE its headline
 * counts from this array instead of a hand-written string. The landing page used
 * to store each count inside prose (`foot: "33 samples"`) and regex the total
 * back out of it, so nothing failed when they drifted — they had reached 57
 * claimed against 76 actual.
 *
 * Pure data, and the only import is a TYPE, so importing this costs nothing at
 * runtime and pulls no page code into whatever imports it.
 */
export const samples: Sample[] = [
  {
    name: "Office to PDF",
    category: "Conversion",
    description: "Convert Word, Excel, and PowerPoint documents to PDF format",
    path: "/java-sdk/office-to-pdf",
  },
  {
    name: "Markdown to PDF",
    category: "Conversion",
    description: "Convert Markdown documents to PDF format",
    path: "/java-sdk/md-to-pdf",
  },
  // HTML-to-PDF hidden — SDK's native HTML renderer crashes on Linux (NullReferenceException in ExportAsPdfStringNative)
  {
    name: "PDF to HTML",
    category: "Conversion",
    description: "Convert PDF documents to HTML for web display",
    path: "/java-sdk/pdf-to-html",
  },
  {
    name: "PDF to Office",
    category: "Conversion",
    description: "Convert PDF documents to Word and Excel formats",
    path: "/java-sdk/pdf-to-office",
  },
  {
    name: "Digital Signature",
    category: "Signatures",
    description: "Apply digital signatures to PDF documents with certificates",
    path: "/java-sdk/digital-signature",
  },
  // OCR and ICR extraction samples hidden until VlmEnhancedIcr ships in a future SDK release
];
