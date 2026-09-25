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

/**
 * One extraction, as `GET /api/extractions/:id` returns it.
 *
 * Superset of ExtractionListItem: the detail endpoint also returns the raw
 * body, the per-field citations, the attachment metadata and the run counters.
 * This lived as a local `Detail` interface inside the old inline detail
 * component; it is exported here because two routes now need it.
 */
export interface ExtractionDetail {
  id: string;
  email_id: string;
  from_address: string | null;
  subject: string | null;
  received_at: string | null;
  status: ExtractionStatus;
  raw_body: string | null;
  extracted_data: Record<string, unknown> | null;
  field_citations: Record<string, FieldCitation> | null;
  /** The service's untouched response, kept for the JSON tab. */
  raw_extraction: Record<string, unknown> | null;
  attachment_meta: {
    filename?: string;
    content_type?: string;
    size?: number;
  } | null;
  attachment_count: number;
  content_sha256: string | null;
  deduped_from: string | null;
  review_flags: string[];
  context_flags: string[];
  error_reason: string | null;
  attempt_count: number | null;
  has_attachment: boolean;
  created_at: string;
  updated_at: string;
}
