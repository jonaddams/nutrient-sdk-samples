-- Email-in -> structured extraction pipeline.
--
-- Runs against its OWN Neon database (EXTRACTIONS_DATABASE_URL), not the one
-- migrations/001_search.sql targets. Two unrelated systems on one migration
-- track is how a search-index rebuild ends up dropping invoice rows.

create type extraction_status as enum (
  'received',     -- row written by the webhook; workflow not started or not finished
  'processing',   -- the workflow picked it up
  'processed',    -- extracted, validated, no review flags
  'needs_review', -- extracted, but a review rule fired
  'failed'        -- could not produce a result
);

create table extractions (
  id                  uuid primary key default gen_random_uuid(),

  -- Resend's id for the DELIVERY. The unique constraint on it is the
  -- concurrency control for the whole pipeline, not bookkeeping: the row is
  -- written before any work starts, so a webhook retry arriving mid-processing
  -- collides here instead of racing the first run.
  email_id            text        not null unique,
  from_address        text,
  subject             text,
  received_at         timestamptz,

  status              extraction_status not null default 'received',

  -- Written by the workflow, not the webhook. The webhook only ever writes the
  -- identity columns above; everything below is filled in later.
  raw_body            text,
  attachment_blob_url text,
  attachment_meta     jsonb,
  attachment_count    integer     not null default 0,

  -- SHA-256 of the ORIGINAL attachment bytes. Level-2 dedupe: the same invoice
  -- arriving in a different email has a different email_id but the same hash.
  -- NOT unique — one row per email that carried the document is correct.
  content_sha256      text,
  deduped_from        uuid        references extractions(id) on delete set null,

  -- Extraction output. `field_citations` mirrors the SDK's metadata shape, so
  -- nested fields and array elements keep their own bbox/page/groundingScore.
  extracted_data      jsonb,
  field_citations     jsonb,
  raw_extraction      jsonb,
  document_text       text,

  -- Review flags route to needs_review; context flags never do. Kept apart
  -- because conflating them sends clean body-only invoices to a human.
  review_flags        text[]      not null default '{}',
  context_flags       text[]      not null default '{}',

  error_reason        text,
  attempt_count       integer     not null default 0,

  -- Two columns, not one. `workflow_claimed_at` is set by the delivery that wins
  -- the right to start the workflow; `workflow_run_id` is written only after
  -- start() returns. A row existing is NOT evidence its work was scheduled --
  -- see the claim query in api/inbound/route.ts.
  workflow_claimed_at timestamptz,
  workflow_run_id     text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Dashboard list: newest first, filtered by status.
create index extractions_status_created_idx
  on extractions (status, created_at desc);

-- Level-2 dedupe lookup. Partial: body-only rows have no hash and never
-- participate, so they stay out of the index entirely.
create index extractions_content_sha256_idx
  on extractions (content_sha256, created_at desc)
  where content_sha256 is not null;

-- Sweeper: rows that claimed a workflow but never recorded a run id. This is
-- the index behind recovering from "insert succeeded, then start() threw".
create index extractions_stuck_idx
  on extractions (workflow_claimed_at)
  where workflow_run_id is null and status = 'received';

create or replace function extractions_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger extractions_set_updated_at
  before update on extractions
  for each row execute function extractions_touch_updated_at();
