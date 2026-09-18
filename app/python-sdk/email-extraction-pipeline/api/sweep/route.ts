import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { extractionsPool } from "@/lib/extractions-db";
import { extractionWorkflow } from "../../_workflows/extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Restart rows that claimed a workflow but never recorded a run id.
 *
 * The webhook already un-claims on a failed `start()`, so this is the second
 * line of defence: it covers the case where the process died between `start()`
 * returning and the run id being written, and the case where Resend stopped
 * retrying. Without it those rows sit in 'received' forever with nothing to
 * notice them — the quietest failure in the whole pipeline.
 *
 * Wire as a Vercel Cron (every 10 minutes is ample) or call it by hand.
 */

const STUCK_AFTER_MINUTES = 10;

export async function POST(request: NextRequest) {
  const expected = process.env.DASHBOARD_TOKEN?.trim();
  if (
    expected &&
    request.headers.get("authorization") !== `Bearer ${expected}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = extractionsPool();

  // Re-claim under the same conditions the webhook uses, so a sweep racing a
  // live delivery cannot start the workflow twice.
  const { rows } = await pool.query<{ email_id: string }>(
    `update extractions
        set workflow_claimed_at = now()
      where status = 'received'
        and workflow_run_id is null
        and workflow_claimed_at < now() - ($1 || ' minutes')::interval
      returning email_id`,
    [String(STUCK_AFTER_MINUTES)],
  );

  const restarted: string[] = [];
  const failed: { emailId: string; error: string }[] = [];

  for (const row of rows) {
    try {
      const run = await start(extractionWorkflow, [row.email_id]);
      await pool.query(
        "update extractions set workflow_run_id = $1 where email_id = $2",
        [run.runId, row.email_id],
      );
      restarted.push(row.email_id);
    } catch (err) {
      // Leave it claimed-but-unrun; the next sweep picks it up again.
      failed.push({
        emailId: row.email_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ found: rows.length, restarted, failed });
}
