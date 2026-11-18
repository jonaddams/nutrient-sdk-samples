/**
 * Builds the two retrieval indexes for /ai-document-processing/contract-rag.
 *
 *   plain text: pdf.js page text  -> fixed 1000-char windows
 *   Nutrient:   DWS /extraction/parse (structure, plus understand on the table
 *               pages listed in CORPUS) -> paragraph/table-aware chunks + boxes
 *
 * Both are embedded with the same local model and written to one JSON file the
 * API route imports. Parse responses are cached under scripts/.contract-rag-cache
 * (gitignored), so a re-run after a chunking change spends no credits.
 *
 * Run:  pnpm index:contract-rag
 * Needs NUTRIENT_API_KEY (a DWS key with Data Extraction access) on a cold
 * cache. A full cold run costs ~200 extraction credits.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import {
  type Chunk,
  naiveChunks,
  type ParseElement,
  parsedChunks,
} from "../app/ai-document-processing/contract-rag/lib/chunk";
import { CORPUS } from "../app/ai-document-processing/contract-rag/lib/corpus";
import { embedPassages } from "../app/ai-document-processing/contract-rag/lib/embed";
import { extractPdf } from "./extract";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PDF_DIR = join(ROOT, "public", "documents", "contract-rag");
const CACHE_DIR = join(ROOT, "scripts", ".contract-rag-cache");
const OUT = join(
  ROOT,
  "app",
  "ai-document-processing",
  "contract-rag",
  "data",
  "index.json",
);

try {
  process.loadEnvFile(join(ROOT, ".env.local"));
} catch {
  // No .env.local: fine as long as the cache is warm or the key is exported.
}

async function parse(
  pdf: Uint8Array,
  mode: "structure" | "understand",
): Promise<ParseElement[]> {
  const key = process.env.NUTRIENT_API_KEY;
  if (!key)
    throw new Error("NUTRIENT_API_KEY is not set and the parse cache is cold.");
  const form = new FormData();
  form.append(
    "file",
    new Blob([pdf.slice()], { type: "application/pdf" }),
    "doc.pdf",
  );
  form.append(
    "instructions",
    JSON.stringify({ mode, output: { format: "spatial" } }),
  );
  const res = await fetch("https://api.nutrient.io/extraction/parse", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok)
    throw new Error(
      `parse ${mode} failed: HTTP ${res.status} ${await res.text()}`,
    );
  const json = await res.json();
  const usage = json.usage?.data_extraction_credits;
  if (usage)
    console.log(
      `    ${mode}: ${usage.cost} extraction credits (remaining ${usage.remainingCredits})`,
    );
  return json.output.elements;
}

async function cached(name: string, make: () => Promise<ParseElement[]>) {
  const file = join(CACHE_DIR, `${name}.json`);
  if (existsSync(file))
    return JSON.parse(await readFile(file, "utf8")) as ParseElement[];
  const elements = await make();
  await writeFile(file, JSON.stringify(elements));
  return elements;
}

async function parseDoc(doc: (typeof CORPUS)[number], bytes: Buffer) {
  const structure = await cached(`${doc.id}.structure`, () =>
    parse(bytes, "structure"),
  );
  if (doc.understandPages.length === 0) return structure;

  const pages: number[] = [...doc.understandPages];
  const understand = await cached(
    `${doc.id}.understand-${pages.join("-")}`,
    async () => {
      const src = await PDFDocument.load(bytes);
      const sub = await PDFDocument.create();
      for (const p of await sub.copyPages(
        src,
        pages.map((n) => n - 1),
      ))
        sub.addPage(p);
      return parse(await sub.save(), "understand");
    },
  );
  // Map the sub-document's page indexes back onto the original document.
  for (const e of understand) e.page.pageIndex = pages[e.page.pageIndex] - 1;
  const replaced = new Set(pages.map((n) => n - 1));
  return [
    ...structure.filter((e) => !replaced.has(e.page.pageIndex)),
    ...understand,
  ];
}

const round = (v: number[]) => v.map((x) => Math.round(x * 1e4) / 1e4);

async function embedAll(chunks: Chunk[]) {
  const out: (Chunk & { v: number[] })[] = [];
  for (let i = 0; i < chunks.length; i += 32) {
    const batch = chunks.slice(i, i + 32);
    const vecs = await embedPassages(batch.map((c) => c.text));
    for (const [j, c] of batch.entries()) out.push({ ...c, v: round(vecs[j]) });
  }
  return out;
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const naive: Chunk[] = [];
  const parsed: Chunk[] = [];

  for (const doc of CORPUS) {
    console.log(doc.file);
    const bytes = await readFile(join(PDF_DIR, doc.file));
    const units = await extractPdf(bytes, { file: doc.file, title: doc.title });
    const numPages = (await PDFDocument.load(bytes)).getPageCount();
    const pageText = Array.from({ length: numPages }, () => "");
    for (const u of units)
      if (u.locator.type === "page") pageText[u.locator.value] = u.text;
    naive.push(...naiveChunks(doc.id, pageText));
    parsed.push(...parsedChunks(doc.id, await parseDoc(doc, bytes)));
  }

  console.log(
    `\nembedding ${naive.length} plain-text + ${parsed.length} Nutrient chunks...`,
  );
  const index = {
    naive: await embedAll(naive),
    parsed: await embedAll(parsed),
  };
  await mkdir(join(OUT, ".."), { recursive: true });
  await writeFile(OUT, JSON.stringify(index));
  console.log(`wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
