import { Pool, type PoolConfig } from "pg";

/**
 * Process-wide Postgres pool for the email-extraction-pipeline sample.
 *
 * Deliberately NOT lib/db.ts. That module is bound to DATABASE_URL, which in
 * this repo is the search-index database, and it caches its pool on
 * `globalThis.__pgPool`. Calling `pool()` from this sample would connect to the
 * wrong database — and because both are valid Postgres connections it would not
 * fail at connect time, only later as a missing-table error a long way from its
 * cause. Separate env var, separate cache key, same shape.
 */

declare global {
  // eslint-disable-next-line no-var
  var __extractionsPool: Pool | undefined;
}

function makePool(): Pool {
  const url = process.env.EXTRACTIONS_DATABASE_URL;
  if (!url) {
    throw new Error(
      "EXTRACTIONS_DATABASE_URL is not set. This sample uses its own Neon " +
        "database, separate from DATABASE_URL (the search index) — see the " +
        "sample README.",
    );
  }
  const config: PoolConfig = {
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
  return new Pool(config);
}

export function extractionsPool(): Pool {
  if (!globalThis.__extractionsPool) {
    globalThis.__extractionsPool = makePool();
  }
  return globalThis.__extractionsPool;
}

export type ExtractionStatus =
  | "received"
  | "processing"
  | "processed"
  | "needs_review"
  | "failed";

export interface ExtractionRow {
  id: string;
  email_id: string;
  from_address: string | null;
  subject: string | null;
  received_at: string | null;
  status: ExtractionStatus;
  attachment_count: number;
  content_sha256: string | null;
  deduped_from: string | null;
  extracted_data: unknown | null;
  review_flags: string[];
  context_flags: string[];
  error_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Columns safe to return from the LIST endpoint.
 *
 * `raw_body` and `document_text` are excluded on purpose: they hold the full
 * text of received email, and a list view has no reason to carry it. The detail
 * endpoint returns them behind the same auth.
 */
export const LIST_COLUMNS = `
  id, email_id, from_address, subject, received_at, status,
  attachment_count, content_sha256, deduped_from, extracted_data,
  review_flags, context_flags, error_reason, created_at, updated_at
`;
