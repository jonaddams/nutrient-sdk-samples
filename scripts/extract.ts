/**
 * Shared extraction layer for the indexed-search samples.
 *
 * Walks public/documents/indexed/ and yields one IndexUnit per logical
 * unit (PDF page / PPTX slide / XLSX sheet / DOCX section). Both the
 * client-side build script (build-search-index.ts) and the server-side
 * seeder (seed-search-index.ts) consume this module.
 */

import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export type Format = "pdf" | "docx" | "xlsx" | "pptx";

export type Locator =
  | { type: "page"; value: number }       // PDF: 0-based pageIndex
  | { type: "slide"; value: number }      // PPTX: 0-based slide index
  | { type: "sheet"; value: string }      // XLSX: sheet name
  | { type: "section"; value: number };   // DOCX: 0-based chunk index

export interface IndexUnit {
  id: string;
  filename: string;
  format: Format;
  title: string;
  unitLabel: string;
  locator: Locator;
  text: string;
}

export interface CorpusEntry {
  file: string;
  title: string;
}

const SUPPORTED_EXTS = new Set([".pdf", ".docx", ".xlsx", ".pptx"]);
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const SOURCE_DIR = join(REPO_ROOT, "public", "documents", "indexed");

/**
 * Cap on stored text per unit. Beyond ~6 KB, an XLSX sheet of time-series
 * numeric data inflates the search index by tens of thousands of unique
 * digit-tokens with no meaningful search value. Tunable per-consumer if
 * needed.
 */
export const DEFAULT_TEXT_CAP = 6000;

export async function discoverCorpus(): Promise<CorpusEntry[]> {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && SUPPORTED_EXTS.has(extname(e.name).toLowerCase()))
    .filter((e) => !e.name.startsWith("."))
    .map((e) => ({ file: e.name, title: titleFromFilename(e.name) }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function titleFromFilename(filename: string): string {
  const base = basename(filename, extname(filename));
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatOf(filename: string): Format {
  const ext = extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".xlsx") return "xlsx";
  if (ext === ".pptx") return "pptx";
  throw new Error(`Unsupported format: ${filename}`);
}

export async function extract(entry: CorpusEntry): Promise<IndexUnit[]> {
  const buffer = await readFile(join(SOURCE_DIR, entry.file));
  switch (formatOf(entry.file)) {
    case "pdf":  return extractPdf(buffer, entry);
    case "docx": return extractDocx(buffer, entry);
    case "xlsx": return extractXlsx(buffer, entry);
    case "pptx": return extractPptx(buffer, entry);
  }
}

export function capText(units: IndexUnit[], cap = DEFAULT_TEXT_CAP): IndexUnit[] {
  return units.map((u) => ({
    ...u,
    text: u.text.length > cap ? `${u.text.slice(0, cap)}…` : u.text,
  }));
}

// ─── Format-specific extractors ──────────────────────────────────────────────

async function extractPdf(buffer: Buffer, entry: CorpusEntry): Promise<IndexUnit[]> {
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const units: IndexUnit[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length < 20) continue;

    units.push({
      id: `${entry.file}#page-${i - 1}`,
      filename: entry.file,
      format: "pdf",
      title: entry.title,
      unitLabel: `Page ${i}`,
      locator: { type: "page", value: i - 1 },
      text,
    });
  }
  await doc.destroy();
  return units;
}

async function extractDocx(buffer: Buffer, entry: CorpusEntry): Promise<IndexUnit[]> {
  const { value: rawText } = await mammoth.extractRawText({ buffer });
  // DOCX has no native page concept. Chunk by paragraph boundaries into
  // ~1500-char sections so long contracts/regs return granular hits.
  const paragraphs = rawText.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((`${current} ${p}`).length > 1500 && current.length > 0) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim().length >= 20) chunks.push(current.trim());
  if (chunks.length === 0 && rawText.trim().length >= 20) chunks.push(rawText.trim());

  return chunks.map((text, idx) => ({
    id: `${entry.file}#section-${idx}`,
    filename: entry.file,
    format: "docx" as const,
    title: entry.title,
    unitLabel: chunks.length > 1 ? `Section ${idx + 1} of ${chunks.length}` : "Document",
    locator: { type: "section" as const, value: idx },
    text,
  }));
}

function extractXlsx(buffer: Buffer, entry: CorpusEntry): IndexUnit[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const units: IndexUnit[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
    if (csv.length < 5) continue;

    const text = csv.replace(/[\r\n,]+/g, " ").replace(/\s+/g, " ").trim();
    units.push({
      id: `${entry.file}#sheet-${sheetName}`,
      filename: entry.file,
      format: "xlsx",
      title: entry.title,
      unitLabel: `Sheet "${sheetName}"`,
      locator: { type: "sheet", value: sheetName },
      text,
    });
  }
  return units;
}

async function extractPptx(buffer: Buffer, entry: CorpusEntry): Promise<IndexUnit[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const numB = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return numA - numB;
    });

  const units: IndexUnit[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    // Extract <a:t>...</a:t> runs — the text content of PPTX shapes.
    const matches = xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
    const text = Array.from(matches, (m) => decodeXmlEntities(m[1]))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 5) continue;

    units.push({
      id: `${entry.file}#slide-${i}`,
      filename: entry.file,
      format: "pptx",
      title: entry.title,
      unitLabel: `Slide ${i + 1}`,
      locator: { type: "slide", value: i },
      text,
    });
  }
  return units;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
