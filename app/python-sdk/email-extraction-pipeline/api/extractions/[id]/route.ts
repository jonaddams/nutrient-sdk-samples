import { type NextRequest, NextResponse } from "next/server";
import { extractionsPool } from "@/lib/extractions-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Full detail for one extraction, including the per-field citations the viewer
 * draws and the raw email body the list endpoint deliberately withholds.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const expected = process.env.DASHBOARD_TOKEN?.trim();
  if (
    expected &&
    request.headers.get("authorization") !== `Bearer ${expected}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { rows } = await extractionsPool().query(
    `select id, email_id, from_address, subject, received_at, status,
            raw_body, attachment_meta, attachment_count, content_sha256,
            deduped_from, extracted_data, field_citations, raw_extraction,
            review_flags, context_flags, error_reason, attempt_count,
            created_at, updated_at,
            attachment_blob_url is not null as has_attachment
       from extractions
      where id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}
