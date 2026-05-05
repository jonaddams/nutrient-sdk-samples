/**
 * Builds the client-side MiniSearch index for /web-sdk/indexed-search.
 *
 * Walks public/documents/indexed/, extracts text via scripts/extract.ts,
 * and writes a MiniSearch dump + a manifest the UI uses to render the
 * corpus summary. The shipped JSON is loaded by the browser on first
 * paint and queried entirely client-side.
 *
 * Run: pnpm index
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";
import {
  capText,
  discoverCorpus,
  extract,
  formatOf,
  SOURCE_DIR,
  type Format,
  type IndexUnit,
} from "./extract";

interface ManifestEntry {
  filename: string;
  format: Format;
  title: string;
  unitCount: number;
}

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(REPO_ROOT, "public", "search-index");

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
    console.log(
      `  ✓ ${entry.file.padEnd(55)} ${String(units.length).padStart(4)} units  ${elapsed}ms`,
    );
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
  ms.addAll(capText(allUnits));

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
