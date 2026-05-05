export type Format = "pdf" | "docx" | "xlsx" | "pptx";

export type Locator =
  | { type: "page"; value: number }     // PDF: 0-based pageIndex
  | { type: "slide"; value: number }    // PPTX: 0-based slide index (= viewer page)
  | { type: "sheet"; value: string }    // XLSX: sheet name
  | { type: "section"; value: number }; // DOCX: 0-based chunk index

export interface IndexUnit {
  id: string;
  filename: string;
  format: Format;
  title: string;
  unitLabel: string;
  locator: Locator;
  text: string;
}

export interface ManifestEntry {
  filename: string;
  format: Format;
  title: string;
  unitCount: number;
}

export interface SearchHit {
  unit: IndexUnit;
  score: number;
  snippet: string;
  matches: Array<{ start: number; length: number }>;
}
