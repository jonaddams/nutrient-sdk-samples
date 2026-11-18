/**
 * "How this works" explainer: one card per pipeline stage, in order, each tagged
 * with what does the work. Collapsed by default so the viewer stays above the
 * fold on a laptop; the summary line alone states the one fact that matters
 * (only ingestion differs).
 *
 * Keep it true to the code: if a stage changes (model, top-k, parse modes,
 * chunk size), change the text here too.
 */

type Who =
  | "Nutrient DWS"
  | "Nutrient Web SDK"
  | "Anthropic Claude"
  | "CUAD dataset"
  | "Both pipelines";

const STAGES: { title: string; who: Who[]; body: string }[] = [
  {
    title: "1. Documents",
    who: ["CUAD dataset"],
    body: "Six real commercial contracts from CUAD v1 (The Atticus Project, CC BY 4.0), as filed on SEC EDGAR. They include scanned commission schedules with no text layer and a two-page patent schedule.",
  },
  {
    title: "2. Ingestion",
    who: ["Nutrient DWS"],
    body: "Plain text: pdf.js reads each page's text layer, which is empty on scans and flattens tables. Nutrient: the DWS Data Extraction API (/extraction/parse) OCRs every page and returns typed elements with bounding boxes, using structure mode everywhere and understand mode on table pages for cell-accurate tables. This runs once, ahead of time, never per question.",
  },
  {
    title: "3. Chunking",
    who: ["Both pipelines"],
    body: "Both use the same 1,000-character budget. Plain text is cut into fixed windows, often mid-clause. Nutrient chunks keep whole paragraphs, drop page headers and footers, keep each table whole as Markdown captioned by the text above it, and carry their bounding boxes.",
  },
  {
    title: "4. Retrieval",
    who: ["Both pipelines"],
    body: "Identical for both. Each chunk is embedded once (a local bge-small model via transformers.js, or OpenAI text-embedding-3-small). A question is embedded the same way, and the 5 closest chunks by cosine similarity are retrieved.",
  },
  {
    title: "5. Answer",
    who: ["Anthropic Claude", "Both pipelines"],
    body: 'Identical for both: Claude (Sonnet 5.5) gets the same prompt and the 5 retrieved chunks as search results, and must answer only from them or reply "Not found in these documents." Its native citations point back to the exact chunks it used.',
  },
  {
    title: "6. Verification",
    who: ["Nutrient Web SDK"],
    body: "Clicking a Nutrient citation opens the source in the Web SDK viewer and draws a highlight from the parse's bounding boxes, narrowed to the quoted row for tables. Plain text has no coordinates, so its citations can only open the page.",
  },
];

export function HowItWorks() {
  return (
    <details className="callout crag-how">
      <summary>
        <span className="callout-label">How this works</span>
        <span className="crag-how-summary">
          Two RAG pipelines with the same retrieval, prompt and model. Only
          ingestion differs: plain text extraction vs. Nutrient parsing.
        </span>
      </summary>
      <ol className="crag-how-grid">
        {STAGES.map((s) => (
          <li key={s.title}>
            <h4>{s.title}</h4>
            <div className="crag-how-tags">
              {s.who.map((w) => (
                <span key={w} className="tag">
                  {w}
                </span>
              ))}
            </div>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
