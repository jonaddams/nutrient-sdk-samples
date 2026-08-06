import type { Sample } from "@/app/_components/SamplesIndex";

/**
 * The api sample registry.
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
    name: "Document Generation Pipeline",
    category: "Generation",
    description:
      "Generate a contract from form data, auto-place signature fields by content with the DWS API (HTML→PDF, locate, redact, add fields), then sign it in the viewer.",
    path: "/api/document-generation-pipeline",
  },
  {
    name: "Web SDK Digital Signature (DWS)",
    category: "Signatures",
    description:
      "Sign documents directly in the Nutrient Web SDK viewer using DWS API for secure, in-browser digital signatures",
    path: "/api/sign-document-web-sdk-dws",
  },
  {
    name: "DWS Document Signing",
    category: "Signatures",
    description:
      "Upload and sign PDF documents server-side using DWS Processor API with visible or invisible signatures",
    path: "/api/sign-document-dws",
  },
  {
    name: "Markdown Comparison",
    category: "Comparison",
    description:
      "Compare documents using Nutrient DWS API to convert PDFs to Markdown, preserving semantic structure for accurate cross-page comparison",
    path: "/api/markdown-comparison",
    wip: true,
  },
  {
    name: "HTML Comparison",
    category: "Comparison",
    description:
      "Compare documents using Nutrient DWS API to convert PDFs to HTML, preserving semantic structure for accurate cross-page comparison",
    path: "/api/html-comparison",
    wip: true,
  },
  {
    name: "Text File Viewer",
    category: "Conversion",
    description:
      "View .txt, .csv, and .xml files in the Nutrient viewer by converting them to styled HTML and then to PDF via DWS API",
    path: "/api/text-viewer",
  },
];
