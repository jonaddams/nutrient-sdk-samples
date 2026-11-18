import type { Sample } from "@/app/_components/SamplesIndex";

/**
 * The ai document processing sample registry.
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
    name: "Invoice Management",
    category: "Extraction",
    description:
      "Automatically classify and extract data from invoices, receipts, and purchase orders with built-in validation",
    path: "/ai-document-processing/invoices",
  },
  {
    name: "Contract Q&A with Verifiable Citations",
    category: "Retrieval",
    description:
      "RAG over a legal deal room, side by side: plain-text extraction misses scanned schedules and dense tables that Nutrient parsing answers, and every Nutrient citation highlights its exact source on the page",
    path: "/ai-document-processing/contract-rag",
  },
];
