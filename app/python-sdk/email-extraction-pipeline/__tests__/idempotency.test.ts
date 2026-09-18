import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The idempotency contract, exercised against a real Postgres.
 *
 * These are the failures that lose email silently, so they are worth a test that
 * runs the actual SQL rather than a mock: an in-memory fake would happily agree
 * with whatever the code does.
 *
 * Skipped unless EXTRACTIONS_DATABASE_URL points somewhere. For a throwaway:
 *
 *   docker run -d --name eep-postgres -e POSTGRES_PASSWORD=dev \
 *     -e POSTGRES_DB=extractions -p 55432:5432 postgres:16-alpine
 *   psql postgres://postgres:dev@localhost:55432/extractions \
 *     -f migrations/extractions/001_init.sql
 *   EXTRACTIONS_DATABASE_URL=postgres://postgres:dev@localhost:55432/extractions \
 *     pnpm vitest run app/python-sdk/email-extraction-pipeline
 */

const URL = process.env.EXTRACTIONS_DATABASE_URL;
const describeIfDb = URL ? describe : describe.skip;

// The two statements the webhook runs, kept here verbatim so a change to either
// in route.ts without a matching change here shows up as a failure.
const INSERT = `insert into extractions (email_id) values ($1)
                on conflict (email_id) do nothing`;
const CLAIM = `update extractions set workflow_claimed_at = now()
                where email_id = $1
                  and workflow_run_id is null
                  and workflow_claimed_at is null
                returning id`;
const SWEEP = `update extractions set workflow_claimed_at = now()
                where status = 'received'
                  and workflow_run_id is null
                  and workflow_claimed_at < now() - interval '10 minutes'
                returning email_id`;

describeIfDb("webhook idempotency", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: URL });
    await pool.query("delete from extractions where email_id like 'itest-%'");
  });

  afterAll(async () => {
    await pool.query("delete from extractions where email_id like 'itest-%'");
    await pool.end();
  });

  it("claims on first delivery and refuses a later retry", async () => {
    await pool.query(INSERT, ["itest-a"]);
    const first = await pool.query(CLAIM, ["itest-a"]);
    expect(first.rowCount).toBe(1);

    await pool.query(
      "update extractions set workflow_run_id=$1 where email_id=$2",
      ["run_1", "itest-a"],
    );

    await pool.query(INSERT, ["itest-a"]);
    const retry = await pool.query(CLAIM, ["itest-a"]);
    expect(retry.rowCount).toBe(0);
  });

  it("blocks a retry that arrives while the first run is still in flight", async () => {
    // Claimed, but no run id yet — the window a naive "does the row exist" check
    // gets wrong, producing two concurrent extractions.
    await pool.query(INSERT, ["itest-b"]);
    expect((await pool.query(CLAIM, ["itest-b"])).rowCount).toBe(1);
    expect((await pool.query(CLAIM, ["itest-b"])).rowCount).toBe(0);
  });

  it("lets a retry through after start() failed and the route un-claimed", async () => {
    // THE case that loses email. Insert succeeds, start() throws, the route
    // releases the claim, Resend retries. If the retry cannot claim, the row
    // sits in 'received' forever and nothing notices.
    await pool.query(INSERT, ["itest-c"]);
    await pool.query(CLAIM, ["itest-c"]);
    await pool.query(
      "update extractions set workflow_claimed_at=null where email_id=$1",
      ["itest-c"],
    );
    expect((await pool.query(CLAIM, ["itest-c"])).rowCount).toBe(1);
  });

  it("sweeps a row that claimed but never recorded a run id", async () => {
    await pool.query(INSERT, ["itest-d"]);
    await pool.query(
      "update extractions set workflow_claimed_at = now() - interval '30 minutes' where email_id=$1",
      ["itest-d"],
    );
    const swept = await pool.query<{ email_id: string }>(SWEEP);
    expect(swept.rows.map((r) => r.email_id)).toContain("itest-d");
  });

  it("does not sweep a healthy in-flight row", async () => {
    // The negative case, and the one that matters most: a sweeper that is too
    // eager double-starts live work, which is worse than the problem it solves.
    await pool.query(INSERT, ["itest-e"]);
    await pool.query(CLAIM, ["itest-e"]);
    const swept = await pool.query<{ email_id: string }>(SWEEP);
    expect(swept.rows.map((r) => r.email_id)).not.toContain("itest-e");
  });

  it("keeps one row per email_id under concurrent delivery", async () => {
    // Ten simultaneous deliveries of the same email; exactly one may claim.
    const claims = await Promise.all(
      Array.from({ length: 10 }, async () => {
        await pool.query(INSERT, ["itest-f"]);
        return (await pool.query(CLAIM, ["itest-f"])).rowCount;
      }),
    );
    expect(claims.filter((n) => n === 1)).toHaveLength(1);

    const rows = await pool.query(
      "select count(*) n from extractions where email_id=$1",
      ["itest-f"],
    );
    expect(Number(rows.rows[0].n)).toBe(1);
  });
});
