/**
 * Indexed-search corpus builder.
 *
 * Extracts text from PDFs, DOCX, XLSX, and PPTX files, then writes a
 * MiniSearch index dump + a manifest the UI uses to render results.
 *
 * Run: pnpm index
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// ─── Corpus discovery ─────────────────────────────────────────────────────────
// Every supported file in public/documents/indexed/ is indexed. Drop new
// PDFs / DOCX / XLSX / PPTX into that folder and re-run `pnpm index`.
type CorpusEntry = { file: string; title: string };
const SUPPORTED_EXTS = new Set([".pdf", ".docx", ".xlsx", ".pptx"]);

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE_DIR = join(REPO_ROOT, "public", "documents", "indexed");
const OUT_DIR = join(REPO_ROOT, "public", "search-index");

async function discoverCorpus(): Promise<CorpusEntry[]> {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && SUPPORTED_EXTS.has(extname(e.name).toLowerCase()))
    .filter((e) => !e.name.startsWith(".")) // skip .DS_Store etc.
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Format = "pdf" | "docx" | "xlsx" | "pptx";

type Locator =
  | { type: "page"; value: number }   // PDF: 0-based pageIndex
  | { type: "slide"; value: number }  // PPTX: 0-based slide index (= viewer page)
  | { type: "sheet"; value: string }  // XLSX: sheet name
  | { type: "section"; value: number }; // DOCX: 0-based chunk index, no native page

interface IndexUnit {
  id: string;
  filename: string;       // relative path within /public/documents/
  format: Format;
  title: string;
  unitLabel: string;      // "Page 7", "Slide 3", etc.
  locator: Locator;
  text: string;
}

interface ManifestEntry {
  filename: string;
  format: Format;
  title: string;
  unitCount: number;
}

// ─── Format extractors ────────────────────────────────────────────────────────

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
  // Chunk by paragraph boundaries, ~1500-char chunks. DOCX has no native pages.
  const paragraphs = rawText.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + " " + p).length > 1500 && current.length > 0) {
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

// ─── Build pipeline ───────────────────────────────────────────────────────────

function formatOf(filename: string): Format {
  const ext = extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".xlsx") return "xlsx";
  if (ext === ".pptx") return "pptx";
  throw new Error(`Unsupported format: ${filename}`);
}

async function extract(entry: CorpusEntry): Promise<IndexUnit[]> {
  const buffer = await readFile(join(SOURCE_DIR, entry.file));
  const fmt = formatOf(entry.file);
  switch (fmt) {
    case "pdf":  return extractPdf(buffer, entry);
    case "docx": return extractDocx(buffer, entry);
    case "xlsx": return extractXlsx(buffer, entry);
    case "pptx": return extractPptx(buffer, entry);
  }
}

async function main() {
  const corpus = await discoverCorpus();
  if (corpus.length === 0) {
    console.warn(`No supported files found in ${SOURCE_DIR}`);
    console.warn("Drop .pdf / .docx / .xlsx / .pptx files there and re-run.");
    return;
  }
  console.log(`Indexing ${corpus.length} files from ${SOURCE_DIR}\n`);

  const allUnits: IndexUnit[] = [];
  const manifest: ManifestEntry[] = [];

  for (const entry of corpus) {
    const t0 = Date.now();
    const units = await extract(entry);
    const elapsed = Date.now() - t0;
    console.log(`  ✓ ${entry.file.padEnd(55)} ${String(units.length).padStart(4)} units  ${elapsed}ms`);
    allUnits.push(...units);
    if (units.length > 0) {
      manifest.push({
        filename: entry.file,
        format: formatOf(entry.file),
        title: entry.title,
        unitCount: units.length,
      });
    }
  }

  console.log(`\nTotal: ${allUnits.length} units across ${manifest.length} files`);

  // Cap text per unit at ~6 KB. Beyond that, an XLSX sheet of time-series
  // numeric data adds tens of thousands of unique digit-tokens to the
  // inverted index without contributing meaningful search value (no one
  // searches for a single hive temperature reading). The cap keeps the
  // shipped JSON small and the search useful — every meaningful header,
  // label, and prose paragraph fits well under 6 KB.
  const TEXT_CAP = 6000;
  const capped = allUnits.map((u) => ({
    ...u,
    text:
      u.text.length > TEXT_CAP ? `${u.text.slice(0, TEXT_CAP)}…` : u.text,
  }));

  const ms = new MiniSearch<IndexUnit>({
    idField: "id",
    fields: ["title", "unitLabel", "text"],
    storeFields: ["filename", "format", "title", "unitLabel", "locator", "text"],
    searchOptions: {
      boost: { title: 3, unitLabel: 2 },
      prefix: true,
      combineWith: "AND",
    },
  });
  ms.addAll(capped);

  await mkdir(OUT_DIR, { recursive: true });
  const indexJson = JSON.stringify(ms.toJSON());
  await writeFile(join(OUT_DIR, "index.json"), indexJson);
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  const sizeKb = (Buffer.byteLength(indexJson) / 1024).toFixed(1);
  console.log(`\nWrote search-index/index.json (${sizeKb} KB) and manifest.json`);
}

main().catch((err) => {
  console.error("Indexer failed:", err);
  process.exit(1);
});
