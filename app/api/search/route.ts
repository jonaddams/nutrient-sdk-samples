import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

interface DbRow {
  id: string;
  filename: string;
  format: "pdf" | "docx" | "xlsx" | "pptx";
  title: string;
  unit_label: string;
  locator: { type: string; value: number | string };
  snippet: string;
  score: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  if (!q) {
    return NextResponse.json({ hits: [] });
  }

  try {
    // FTS narrows the candidate set fast (GIN index); the position() filter
    // then drops hits where the literal query string isn't actually present
    // in the unit's content. Without it, Postgres' English stemmer produces
    // stem-only matches (e.g. "consultant" → "consult"/"consulted"/
    // "consultation") that Nutrient's exact in-document search can't
    // highlight, leaving the user on the cover page with no marker.
    // Group hits by file. The window function tags each row with the
    // max score of any hit in that file, so we can sort files by their
    // best hit (most-relevant file first) and keep each file's hits
    // contiguous in the response. Within a file, hits stay ranked by
    // their own score. The viewer only reloads on filename change, so
    // grouping makes consecutive sidebar clicks land on the same file
    // and skip the heavy reload.
    const { rows } = await pool().query<DbRow>(
      `WITH q AS (SELECT plainto_tsquery('english', $1) AS query),
            hits AS (
              SELECT
                u.id,
                u.filename,
                u.format,
                u.title,
                u.unit_label,
                u.locator,
                ts_headline(
                  'english',
                  u.content,
                  q.query,
                  'StartSel=[[mark]],StopSel=[[/mark]],MaxWords=30,MinWords=10,MaxFragments=2,FragmentDelimiter= … '
                ) AS snippet,
                ts_rank_cd(u.tsv, q.query) AS score
              FROM search_units u, q
              WHERE u.tsv @@ q.query
                AND position(lower($1) in lower(u.content)) > 0
            )
       SELECT h.*,
              MAX(score) OVER (PARTITION BY filename) AS file_score
       FROM hits h
       ORDER BY file_score DESC, filename, score DESC, id
       LIMIT $2`,
      [q, limit],
    );

    return NextResponse.json({
      hits: rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        format: r.format,
        title: r.title,
        unitLabel: r.unit_label,
        locator: r.locator,
        snippet: r.snippet,
        score: r.score,
      })),
    });
  } catch (err) {
    console.error("/api/search failed:", err);
    return NextResponse.json(
      { error: "search failed" },
      { status: 500 },
    );
  }
}
