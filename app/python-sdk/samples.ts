import type { Sample } from "@/app/_components/SamplesIndex";

/**
 * The python sdk sample registry.
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
    path: "/python-sdk/office-to-pdf",
  },
  {
    name: "Markdown to PDF",
    category: "Conversion",
    description: "Convert Markdown documents to PDF format",
    path: "/python-sdk/md-to-pdf",
  },
  {
    name: "PDF to HTML",
    category: "Conversion",
    description: "Convert PDF documents to HTML for web display",
    path: "/python-sdk/pdf-to-html",
  },
  {
    name: "PDF to Office",
    category: "Conversion",
    description: "Convert PDF documents to Word and Excel formats",
    path: "/python-sdk/pdf-to-office",
  },
  {
    name: "Digital Signature",
    category: "Signatures",
    description: "Apply digital signatures to PDF documents with certificates",
    path: "/python-sdk/digital-signature",
  },
  {
    name: "PDF Redaction",
    category: "Editor",
    description: "Permanently remove sensitive content from PDF documents",
    path: "/python-sdk/redaction",
  },
  {
    name: "Form Field Detection",
    category: "Forms",
    description:
      "Detect form fields in an unfielded PDF with the Nutrient SDK's ML detector",
    path: "/python-sdk/form-detection",
  },
  {
    name: "PDF Form Fill",
    category: "Forms",
    description:
      "Programmatically fill PDF form fields with data and generate a filled PDF",
    path: "/python-sdk/form-fill",
  },
  {
    name: "OCR Extraction",
    category: "Extraction",
    description:
      "Extract printed text from images with Adaptive OCR — high-throughput, optimized for purely printed content",
    path: "/python-sdk/ocr-extraction",
  },
  {
    name: "Document to Markdown",
    category: "Extraction",
    description:
      "Convert a complex document to clean Markdown for RAG and LLM ingestion pipelines",
    path: "/python-sdk/markdown-extraction",
  },
  // Field Extraction UNLISTED 2026-08-06 (Jon's call: unlist, do not delete).
  // The extraction studio supersedes it — both do schema-driven field
  // extraction, but this one hand-writes a VLM prompt and post-parses the JSON
  // reply, while /structured calls the SDK's native extract_structured() and
  // gets grounded citations back. It is also built on
  // VisionFeatures.KEY_VALUE_REGION, which is a no-op (SDK-037 / NAPY-15),
  // worked around with describe().
  //
  // app/python-sdk/field-extraction/ is deliberately KEPT: the route still
  // works, and a demo of the pre-SDK-native approach has archival value while
  // SDK-037 is open. Re-listing is uncommenting this block.
  {
    name: "Extraction Studio",
    category: "Extraction",
    description:
      // Number derived from `grep -c "enabled: true" FeatureRail.tsx` (6),
      // never incremented by hand — this string went stale twice already.
      "Six extraction techniques in one shell — schema-driven fields with clickable citations, Adaptive OCR, table extraction, and image description",
    path: "/python-sdk/extraction-studio",
  },
  {
    name: "Word Template Generation",
    category: "Templates",
    description:
      "Generate PDF documents from Word templates populated with JSON data",
    path: "/python-sdk/word-template",
  },
];
