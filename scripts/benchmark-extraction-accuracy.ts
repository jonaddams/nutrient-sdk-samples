/**
 * Regenerates app/python-sdk/extraction-studio/lib/benchmark.ts.
 *
 * Run against the HOSTED backend, because that is what the demo uses:
 *
 *   NEXT_PUBLIC_PYTHON_SDK_API_URL=https://python-fast-api-production-0678.up.railway.app \
 *     pnpm tsx scripts/benchmark-extraction-accuracy.ts
 *
 * Runs sequentially, not in parallel: three concurrent SDK calls per document is
 * untested against this backend, and a benchmark that fails halfway is worse
 * than one that takes a few minutes. Run from the repo root — document paths
 * are resolved relative to the current working directory.
 *
 * A failed or non-OK call is never silently dropped: it is logged loudly as it
 * happens (including every retry) and counted again in the final summary, so a
 * short table can never pass for a complete one.
 *
 * TWO MODES:
 *
 * - RESUME (default). If lib/benchmark.ts already exists, its rows are loaded
 *   and only the (document, provider) pairs MISSING from it are fetched; the
 *   result is merged with the existing rows and rewritten. This exists because
 *   one flaky pair should not force re-paying for the other 41 successful
 *   extractions every time — any (document, provider) pair against this
 *   hosted backend can be slow or intermittently fail, and resume-filling just
 *   that one pair is cheaper than re-running the whole set. The historical
 *   case that motivated this: westbridge-engineering-submittal-form/anthropic
 *   intermittently failed on 2026-08-12 (that document has since been
 *   retired from the corpus), and the fix was to resume-fill just that one
 *   pair, not re-run all 42.
 *
 * - FULL. Pass `--full` or set `BENCHMARK_FULL_RERUN=1` to ignore any existing
 *   lib/benchmark.ts and regenerate every row from scratch (e.g. after a model
 *   version change, where every row is presumed stale, not just the missing
 *   ones):
 *
 *   pnpm tsx scripts/benchmark-extraction-accuracy.ts --full
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { presetFor } from "../app/python-sdk/extraction-studio/lib/categories";
import { DOCUMENTS } from "../app/python-sdk/extraction-studio/lib/docs";
import { buildSchema } from "../app/python-sdk/extraction-studio/lib/schema";
import { verifiedFor } from "../app/python-sdk/extraction-studio/lib/verified";
import {
  compareField,
  summarise,
} from "../app/python-sdk/extraction-studio/lib/verify";

const API = process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL;
if (!API) throw new Error("set NEXT_PUBLIC_PYTHON_SDK_API_URL");

const PROVIDERS = ["openai", "anthropic", "bedrock"];
const OUT_PATH = "app/python-sdk/extraction-studio/lib/benchmark.ts";

// Up to 3 attempts per (document, provider), with a generous per-request
// timeout. Some (document, provider) pairs against this hosted backend are
// pathologically slow rather than reliably broken, and their true ceiling is
// unknown — 82018ms was a MEASURED real duration for
// westbridge-engineering-submittal-form/anthropic (2026-08-12, before that
// document was retired from the corpus). 180s gives a slow-but-real response
// room to land rather than being treated as a failure identical to an actual
// server error.
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 180_000;
const RETRY_DELAYS_MS = [2_000, 5_000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mirrors the type exported from lib/benchmark.ts rather than importing it
// statically: this script is what CREATES that file, so on a clean checkout
// (or after deleting a stale one) a static import would fail before the first
// row is ever fetched. (The existing file IS loaded dynamically, below, when
// resuming — that happens at runtime, after confirming the file exists.)
type BenchmarkRow = {
  docId: string;
  provider: string;
  model: string;
  matched: number;
  verified: number;
  timingMs: number;
};

type Skip = { docId: string; provider: string; reason: string };

function rowKey(docId: string, provider: string): string {
  return `${docId}::${provider}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** One (document, provider) pair, retried up to MAX_ATTEMPTS times. Every
 *  failed attempt — non-OK response, timeout, or thrown network error — is
 *  logged as it happens, not just the final outcome, so a slow-but-eventually-
 *  successful pair is visible in the log rather than looking identical to an
 *  instant success. */
async function runOne(
  doc: { docId: string; filename: string },
  provider: string,
  schema: string,
  bytes: Buffer,
): Promise<{ row?: BenchmarkRow; skip?: Skip }> {
  const label = `${doc.docId} ${provider}`;
  let lastReason = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const form = new FormData();
      // Wrapped in a fresh Uint8Array rather than passed as a bare Buffer:
      // Buffer's default type param (ArrayBufferLike) is wider than BlobPart
      // accepts (it also covers SharedArrayBuffer), which tsc rejects once
      // `bytes` crosses a function boundary with an explicit `Buffer` type.
      form.append("file", new File([new Uint8Array(bytes)], doc.filename));
      form.append("json_schema", schema);
      form.append("instructions", "");
      const params = new URLSearchParams({
        provider,
        includeConfidence: "true",
        includeSourceLocations: "true",
        strict: "false",
      });
      const resp = await fetchWithTimeout(
        `${API}/api/extraction/structured?${params}`,
        { method: "POST", body: form },
        REQUEST_TIMEOUT_MS,
      );
      if (!resp.ok) {
        lastReason = `HTTP ${resp.status}`;
      } else {
        const body = await resp.json();
        const verdicts = body.data.fields.map(
          (f: { value: unknown; name: string; type: string }) =>
            compareField(f.value, verifiedFor(doc.docId, f.name), f.type),
        );
        const { matched, verified } = summarise(verdicts);
        const attemptNote =
          attempt > 1 ? ` [attempt ${attempt}/${MAX_ATTEMPTS}]` : "";
        console.log(
          `${label}: ${matched}/${verified} (${body.timingMs}ms, ${body.config.model})${attemptNote}`,
        );
        return {
          row: {
            docId: doc.docId,
            provider,
            model: body.config.model,
            matched,
            verified,
            timingMs: body.timingMs,
          },
        };
      }
    } catch (err) {
      // AbortError is what a timed-out fetch throws — distinguish it from a
      // generic network error so the log states plainly that this pair is
      // slow, not merely broken.
      lastReason =
        err instanceof Error
          ? err.name === "AbortError"
            ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
            : err.message
          : String(err);
    }

    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1) ?? 0;
      console.error(
        `RETRY ${attempt}/${MAX_ATTEMPTS} ${label}: ${lastReason} — retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  console.error(
    `SKIPPED ${label}: ${lastReason} (exhausted ${MAX_ATTEMPTS} attempts)`,
  );
  return { skip: { docId: doc.docId, provider, reason: lastReason } };
}

async function main() {
  // Not top-level await: this repo's scripts run via tsx under CommonJS
  // output (no "type": "module" in package.json), and esbuild refuses
  // top-level await under the "cjs" format outright. Wrapping the run in an
  // async main(), as build-search-index.ts and seed-search-index.ts already
  // do, is the existing convention this script follows.
  const forceFullRerun =
    process.argv.includes("--full") || process.env.BENCHMARK_FULL_RERUN === "1";

  // rowMap, not a plain array: merging resumed + freshly fetched rows by key
  // and then re-emitting them in DOCUMENTS/PROVIDERS order keeps the table's
  // row order stable and readable across any number of resume passes, rather
  // than accumulating newly-filled rows at the end out of sequence.
  const rowMap = new Map<string, BenchmarkRow>();

  if (!forceFullRerun && existsSync(OUT_PATH)) {
    const existing = await import(pathToFileURL(resolve(OUT_PATH)).href);
    const existingRows: BenchmarkRow[] = existing.BENCHMARK.rows;
    for (const r of existingRows) rowMap.set(rowKey(r.docId, r.provider), r);
    console.log(
      `Resuming: ${existingRows.length} existing row(s) found in ${OUT_PATH}. ` +
        `Only missing (document, provider) pairs will be fetched. ` +
        `Pass --full or set BENCHMARK_FULL_RERUN=1 to regenerate everything.`,
    );
  } else if (forceFullRerun) {
    console.log(
      "Full re-run requested: ignoring any existing lib/benchmark.ts.",
    );
  }

  const skips: Skip[] = [];
  let fetchedCount = 0;

  for (const doc of DOCUMENTS) {
    const schema = buildSchema(presetFor(doc.category));
    let bytes: Buffer | undefined;

    for (const provider of PROVIDERS) {
      const key = rowKey(doc.docId, provider);
      if (rowMap.has(key)) {
        continue; // already present from a previous run; resume mode skips it
      }

      bytes ??= await readFile(`public${doc.path}`);
      fetchedCount += 1;
      const result = await runOne(doc, provider, schema, bytes);
      if (result.row) rowMap.set(key, result.row);
      if (result.skip) skips.push(result.skip);
    }
  }

  // Re-emit in natural document/provider order regardless of how the map was
  // populated (resumed rows, freshly fetched rows, or a mix of both).
  const rows: BenchmarkRow[] = [];
  for (const doc of DOCUMENTS) {
    for (const provider of PROVIDERS) {
      const row = rowMap.get(rowKey(doc.docId, provider));
      if (row) rows.push(row);
    }
  }

  console.log(
    `\n${fetchedCount} pair(s) attempted this run, ${rows.length} row(s) total, ${skips.length} skipped.`,
  );
  if (skips.length > 0) {
    console.error("\nSKIPPED RUNS (excluded from the benchmark table):");
    for (const s of skips) {
      console.error(`  - ${s.docId} ${s.provider}: ${s.reason}`);
    }
  }

  // Local calendar date, not new Date().toISOString().slice(0, 10):
  // toISOString() reports the UTC date, which is a different calendar day
  // from local "today" for part of every 24-hour cycle outside UTC+0.
  // measuredOn is displayed in the UI as "when was this measured", so it must
  // match the wall-clock date the script actually ran on. In resume mode this
  // is "the date this file was last touched", not a per-row date — BenchmarkRow
  // carries no per-row date field, so a resumed fill of one old row still
  // bumps the whole table's displayed date. Acceptable: resume runs are
  // expected to happen shortly after the run they are filling gaps in, not
  // months later.
  const now = new Date();
  const measuredOn = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  writeFileSync(
    OUT_PATH,
    `// GENERATED by scripts/benchmark-extraction-accuracy.ts — do not hand-edit.\n` +
      `// Regenerate when model versions change; the date below is shown in the UI.\n` +
      `export type BenchmarkRow = {\n` +
      `  docId: string;\n  provider: string;\n  model: string;\n` +
      `  matched: number;\n  verified: number;\n  timingMs: number;\n};\n\n` +
      `export const BENCHMARK: {\n` +
      `  measuredOn: string;\n  rows: BenchmarkRow[];\n` +
      `} = ${JSON.stringify({ measuredOn, rows }, null, 2)};\n`,
  );

  // JSON.stringify quotes every key ("docId": ...) and omits trailing commas,
  // neither of which matches this project's biome style (bare keys, trailing
  // comma) — a freshly generated file would fail `pnpm exec biome check`
  // before a human ever touches it. Reformat in place with the PROJECT's own
  // biome binary, called by its exact path rather than through `pnpm exec` or
  // a bare `biome`: this machine has a global Homebrew biome (2.5.7) that
  // silently disagrees with the project's pinned biome (2.5.0) on formatting,
  // and a bare PATH lookup is exactly how that skew bites.
  const biomeBin = fileURLToPath(
    new URL("../node_modules/.bin/biome", import.meta.url),
  );
  execFileSync(biomeBin, ["format", "--write", OUT_PATH], { stdio: "inherit" });

  console.log(`wrote ${rows.length} rows to ${OUT_PATH}`);

  if (skips.length > 0) {
    // Non-zero exit keeps a partial run from being mistaken for a clean one
    // in CI or in shell history, even though the (incomplete) table was still
    // written above — some rows beat none.
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
