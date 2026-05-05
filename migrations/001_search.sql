-- Indexed cross-document search — server-side schema.
-- One denormalized row per indexed unit (PDF page / DOCX section / XLSX
-- sheet / PPTX slide). Title is duplicated per row so every query is a
-- single GIN-index lookup with no joins.

CREATE TABLE IF NOT EXISTS search_units (
  id          TEXT      PRIMARY KEY,                              -- "filename.pdf#page-7"
  filename    TEXT      NOT NULL,
  format      TEXT      NOT NULL CHECK (format IN ('pdf','docx','xlsx','pptx')),
  title       TEXT      NOT NULL,
  unit_label  TEXT      NOT NULL,                                 -- "Page 7" / "Slide 3" / etc.
  locator     JSONB     NOT NULL,                                 -- { type, value }
  content     TEXT      NOT NULL,
  tsv         TSVECTOR  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', title),      'A') ||
    setweight(to_tsvector('english', unit_label), 'B') ||
    setweight(to_tsvector('english', content),    'C')
  ) STORED
);

CREATE INDEX IF NOT EXISTS search_units_tsv_idx
  ON search_units USING GIN (tsv);

CREATE INDEX IF NOT EXISTS search_units_filename_idx
  ON search_units (filename);
