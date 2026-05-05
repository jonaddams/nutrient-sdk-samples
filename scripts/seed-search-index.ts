/**
 * Seeds the Postgres search index for /web-sdk/indexed-search-server.
 *
 * - Connects via DATABASE_URL_UNPOOLED (direct, not pgbouncer — pgbouncer's
 *   transaction-mode pooling can interfere with DDL and bulk inserts).
 * - Runs migrations/001_search.sql to ensure schema exists.
 * - Truncates and refills search_units from public/documents/indexed/.
 *
 * Run: pnpm seed-search
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import {
  capText,
  discoverCorpus,
  extract,
  SOURCE_DIR,
  type IndexUnit,
} from "./extract";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
loadEnv({ path: join(REPO_ROOT, ".env.local") });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set in .env.local.");
  process.exit(1);
}

async function main() {
  const corpus = await discoverCorpus();
  if (corpus.length === 0) {
    console.warn(`No supported files found in ${SOURCE_DIR}`);
    return;
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log("Applying migration…");
    const migration = await readFile(
      join(REPO_ROOT, "migrations", "001_search.sql"),
      "utf8",
    );
    await client.query(migration);

    console.log(`\nExtracting ${corpus.length} files from ${SOURCE_DIR}\n`);
    const allUnits: IndexUnit[] = [];
    for (const entry of corpus) {
      const t0 = Date.now();
      const units = await extract(entry);
      console.log(
        `  ✓ ${entry.file.padEnd(55)} ${String(units.length).padStart(4)} units  ${Date.now() - t0}ms`,
      );
      allUnits.push(...units);
    }

    const capped = capText(allUnits);
    console.log(`\nTotal: ${capped.length} units. Refilling search_units…`);

    await client.query("BEGIN");
    await client.query("TRUNCATE search_units");
    await insertInBatches(client, capped, 200);
    await client.query("COMMIT");

    const { rows } = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM search_units",
    );
    console.log(`\nDone. search_units row count: ${rows[0].count}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

async function insertInBatches(client: Client, units: IndexUnit[], size: number) {
  for (let start = 0; start < units.length; start += size) {
    const batch = units.slice(start, start + size);
    const values: string[] = [];
    const params: unknown[] = [];
    batch.forEach((u, i) => {
      const o = i * 7;
      values.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`);
      params.push(
        u.id,
        u.filename,
        u.format,
        u.title,
        u.unitLabel,
        JSON.stringify(u.locator),
        u.text,
      );
    });
    await client.query(
      `INSERT INTO search_units
         (id, filename, format, title, unit_label, locator, content)
       VALUES ${values.join(", ")}
       ON CONFLICT (id) DO UPDATE SET
         filename   = EXCLUDED.filename,
         format     = EXCLUDED.format,
         title      = EXCLUDED.title,
         unit_label = EXCLUDED.unit_label,
         locator    = EXCLUDED.locator,
         content    = EXCLUDED.content`,
      params,
    );
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
