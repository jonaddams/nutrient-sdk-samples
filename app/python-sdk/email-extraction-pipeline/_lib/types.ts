export type ExtractionStatus =
  | "received"
  | "processing"
  | "processed"
  | "needs_review"
  | "failed";

/**
 * What the list endpoint returns. Deliberately narrower than the table: no
 * `raw_body`, no `document_text`. See LIST_COLUMNS in lib/extractions-db.ts.
 */
export interface ExtractionListItem {
  id: string;
  email_id: string;
  from_address: string | null;
  subject: string | null;
  received_at: string | null;
  status: ExtractionStatus;
  attachment_count: number;
  content_sha256: string | null;
  deduped_from: string | null;
  extracted_data: Record<string, unknown> | null;
  /** Non-empty means status is needs_review. */
  review_flags: string[];
  /** Descriptive only — never routes to review on its own. */
  context_flags: string[];
  error_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Per-field provenance from the SDK, after normalisation at the service
 * boundary: bbox as fractions of the page, page 0-indexed for the viewer.
 *
 * `boxes` is plural because ~8% of values span more than one text block
 * (measured: 131 single, 12 double across 144 grounded fields). Drawing only the
 * SDK's single merged `bbox` highlights more than the value in those cases.
 */
export interface FieldCitation {
  page: number;
  boxes: { x0: number; y0: number; x1: number; y1: number }[];
  groundingScore: number | null;
  match: string | null;
}
