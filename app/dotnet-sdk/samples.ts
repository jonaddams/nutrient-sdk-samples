import type { Sample } from "@/app/_components/SamplesIndex";

/**
 * The dotnet sdk sample registry.
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
    name: "Linearize",
    category: "File Optimization",
    description:
      "Optimize PDFs for fast web view, allowing the first page to render before the entire file downloads.",
    path: "/dotnet-sdk/linearize",
  },
  {
    name: "OCR",
    category: "Text Extraction",
    description:
      "Recognize text in scanned PDFs and images. Output a searchable PDF or extract the recognized text as plain text.",
    path: "/dotnet-sdk/ocr",
  },
  {
    name: "Optimize",
    category: "File Optimization",
    description:
      "Reduce PDF file size with MRC compression. Especially effective on scanned and image-heavy documents.",
    path: "/dotnet-sdk/optimize",
  },
];
