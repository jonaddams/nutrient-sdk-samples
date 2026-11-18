# Contract Q&A with Verifiable Citations

RAG over a six-contract legal deal room, run twice side by side. The two
pipelines share the same embedding model, top-k, prompt and model. **The only
difference is ingestion:**

| | Plain text extraction | Nutrient parsing |
|---|---|---|
| Ingest | pdf.js page text | DWS `/extraction/parse` (`structure`, plus `understand` on table pages) |
| Chunks | fixed 1,000-character windows | whole paragraphs; tables kept whole as Markdown, captioned with the text above them |
| Citation | opens the page | highlights the exact passage, or for tables the quoted row |

## Why the preset questions work

Each was run 5x through both pipelines and kept only if plain text failed 5/5
and Nutrient answered 5/5:

- **Scanned schedules** (Principal Life pp. 10–13) have no text layer, so plain
  text never sees them. The parse OCRs them, tables included.
- **The patent schedule** (Armstrong Flooring, Schedule 1.1(e)) loses its rows in
  plain text. Rows with status "Published" have blank cells, so values can't be
  realigned by position.
- **The NDA question** is a control. The answer isn't in the documents, so both
  pipelines must refuse.

Reword a preset and you must re-run that check (see `lib/corpus.ts`).

## Rebuilding the index

```bash
pnpm index:contract-rag
```

This writes `data/index.json` (committed). Parse responses are cached in
`scripts/.contract-rag-cache/` (gitignored). A cold run needs `NUTRIENT_API_KEY`
with Data Extraction access and costs about 200 extraction credits. A warm run
costs nothing.

## Runtime

- `ANTHROPIC_API_KEY` is required. `CONTRACT_RAG_MODEL` is optional (default
  `claude-sonnet-5-5`). Answers use Claude's native `search_result` citations,
  so every citation maps back to a chunk and its boxes.
- Queries are embedded locally with transformers.js (`Xenova/bge-small-en-v1.5`,
  about 33 MB, downloaded once per server instance into the OS temp dir).

## Known limits

- Parse bounding-box units vary by page and mode (PDF points vs. 200-dpi pixels),
  so boxes are stored as page fractions. See `lib/chunk.ts`.
- Row highlighting needs two or more table cells quoted verbatim in the answer.
  Otherwise the whole table is highlighted.
- An image-only table embedded as a picture (not used here) comes back as a single
  `picture` element, even in `agentic` mode.
- Embeddings handle exact-number lookups poorly ("filing date of US 9,108,335"
  fails in both pipelines). A BM25 hybrid would fix that.

Contracts: [CUAD v1](https://www.atticusprojectai.org/cuad), The Atticus Project,
CC BY 4.0, as filed on SEC EDGAR.
