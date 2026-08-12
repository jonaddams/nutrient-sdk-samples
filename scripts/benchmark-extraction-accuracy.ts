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
 * happens and counted again in the final summary, so a short table can never
 * pass for a complete one.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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

// Mirrors the type exported from lib/benchmark.ts rather than importing it:
// this script is what CREATES that file, so on a clean checkout (or after
// deleting a stale one) importing from it would fail before the first row is
// ever fetched.
type BenchmarkRow = {
  docId: string;
  provider: string;
  model: string;
  matched: number;
  verified: number;
  timingMs: number;
};

type Skip = { docId: string; provider: string; reason: string };

async function main() {
  // Not top-level await: this repo's scripts run via tsx under CommonJS
  // output (no "type": "module" in package.json), and esbuild refuses
  // top-level await under the "cjs" format outright. Wrapping the run in an
  // async main(), as build-search-index.ts and seed-search-index.ts already
  // do, is the existing convention this script follows.
  const rows: BenchmarkRow[] = [];
  const skips: Skip[] = [];

  for (const doc of DOCUMENTS) {
    const schema = buildSchema(presetFor(doc.category));
    const bytes = await readFile(`public${doc.path}`);
    for (const provider of PROVIDERS) {
      const label = `${doc.docId} ${provider}`;
      try {
        const form = new FormData();
        form.append("file", new File([bytes], doc.filename));
        form.append("json_schema", schema);
        form.append("instructions", "");
        const params = new URLSearchParams({
          provider,
          includeConfidence: "true",
          includeSourceLocations: "true",
          strict: "false",
        });
        const resp = await fetch(`${API}/api/extraction/structured?${params}`, {
          method: "POST",
          body: form,
        });
        if (!resp.ok) {
          const reason = `HTTP ${resp.status}`;
          console.error(`SKIPPED ${label}: ${reason}`);
          skips.push({ docId: doc.docId, provider, reason });
          continue;
        }
        const body = await resp.json();
        const verdicts = body.data.fields.map(
          (f: { value: unknown; name: string; type: string }) =>
            compareField(f.value, verifiedFor(doc.docId, f.name), f.type),
        );
        const { matched, verified } = summarise(verdicts);
        rows.push({
          docId: doc.docId,
          provider,
          model: body.config.model,
          matched,
          verified,
          timingMs: body.timingMs,
        });
        console.log(
          `${label}: ${matched}/${verified} (${body.timingMs}ms, ${body.config.model})`,
        );
      } catch (err) {
        // A thrown error (network failure, malformed JSON) is exactly as loud
        // as a non-OK response — both mean this row is missing from the
        // table, and both must show up in the same skip ledger rather than
        // crashing the whole run and losing every row measured so far.
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`SKIPPED ${label}: ${reason}`);
        skips.push({ docId: doc.docId, provider, reason });
      }
    }
  }

  console.log(`\n${rows.length} row(s) produced, ${skips.length} skipped.`);
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
  // match the wall-clock date the script actually ran on.
  const now = new Date();
  const measuredOn = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const outPath = "app/python-sdk/extraction-studio/lib/benchmark.ts";
  writeFileSync(
    outPath,
    `// GENERATED by scripts/benchmark-extraction-accuracy.ts — do not hand-edit.\n` +
      `// Regenerate when model versions change; the date below is shown in the UI.\n` +
      `export type BenchmarkRow = {\n` +
      `  docId: string;\n  provider: string;\n  model: string;\n` +
      `  matched: number;\n  verified: number;\n  timingMs: number;\n};\n\n` +
      `export const BENCHMARK: {\n` +
      `  measuredOn: string;\n  instructionApplied: boolean;\n  rows: BenchmarkRow[];\n` +
      `} = ${JSON.stringify({ measuredOn, instructionApplied: false, rows }, null, 2)};\n`,
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
  execFileSync(biomeBin, ["format", "--write", outPath], { stdio: "inherit" });

  console.log(`wrote ${rows.length} rows to lib/benchmark.ts`);

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
