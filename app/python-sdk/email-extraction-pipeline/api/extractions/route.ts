import { type NextRequest, NextResponse } from "next/server";
import { extractionsPool, LIST_COLUMNS } from "@/lib/extractions-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paginated list for the dashboard.
 *
 * Never returns `raw_body` or `document_text`. This table holds the full text of
 * received email; a list view has no reason to carry it, and a sample that
 * publishes one person's invoice to the next visitor is not a sample worth
 * shipping. See LIST_COLUMNS.
 */

function authorised(request: NextRequest): boolean {
  const expected = process.env.DASHBOARD_TOKEN?.trim();
  // Unset means open, which is fine for local development and wrong in a
  // deployment. The sample README says so explicitly.
  if (!expected) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(
      Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
      1,
    ),
    200,
  );
  const offset = Math.max(
    Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );
  const status = url.searchParams.get("status");

  try {
    const pool = extractionsPool();
    const params: unknown[] = [];
    let where = "";
    if (status) {
      params.push(status);
      where = `where status = $${params.length}::extraction_status`;
    }
    params.push(limit, offset);

    const { rows } = await pool.query(
      `select ${LIST_COLUMNS}
         from extractions
         ${where}
        order by created_at desc
        limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    const { rows: counts } = await pool.query<{ status: string; n: string }>(
      "select status::text as status, count(*)::text as n from extractions group by status",
    );

    return NextResponse.json({
      extractions: rows,
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
      limit,
      offset,
    });
  } catch (err) {
    // Surfaced rather than swallowed: the most likely cause is
    // EXTRACTIONS_DATABASE_URL pointing at the search database (or being unset),
    // and a generic 500 would send a reader looking in the wrong place.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[extractions] query failed: %s", message);
    return NextResponse.json(
      { error: "query_failed", message },
      { status: 500 },
    );
  }
}
