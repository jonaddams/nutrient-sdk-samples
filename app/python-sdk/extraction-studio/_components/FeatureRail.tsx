"use client";

export type Feature = {
  id: string;
  label: string;
  enabled: boolean;
  /** Short line under the feature's title in the panel head. */
  blurb?: string;
  /**
   * The document this feature needs in order to demo at all — selecting the
   * feature loads it.
   *
   * Set on ONLY the two features that are useless on the wrong document, and
   * deliberately left unset everywhere else so "same document, different
   * feature" keeps working: showing a prospect structured extraction and then
   * OCR on the *same* page is a real demo move, and it is why the Text export
   * panel's own hand-off to Adaptive OCR keeps its document too.
   *
   * It names a DOCUMENT, not a category, and that is the whole point. Landing
   * on `handwriting`'s first document would put an unaccompanied presenter on
   * "Apricot cake recipe" — cursive — while HandwritingConfig defaults to the
   * `local` engine, which reads cursive as gibberish (measured 2026-08-11).
   * The print document is the one Local ICR wins on, so it is the one a rail
   * click lands on; the cursive contrast is a deliberate second step, made by
   * flipping the engine to VLM.
   */
  demoDocId?: string;
  /** Why that document, in a few words, for the note the switch shows. Kept
   *  short deliberately: the note lives in a 208px-usable rail column whose
   *  vertical budget is already tight, and every line it takes is a feature
   *  button pushed out of view. */
  demoDocReason?: string;
  /**
   * Fuller hover description for the rail. Written for someone who does not
   * know the SDK's vocabulary — several of these labels ("ICR", "VLM",
   * "adaptive") mean nothing without explanation. Says what the feature is
   * FOR, not which engine constant it sets.
   *
   * Sourced from the Nutrient Python SDK extraction guides
   * (nutrient.io/guides/python/extraction/) and this repo's own design doc,
   * which records the engine each rail item maps to.
   */
  description?: string;
};

export const FEATURES: Feature[] = [
  {
    id: "structured",
    label: "Structured extraction",
    enabled: true,
    blurb:
      "Pull schema-defined fields from the document, grounded with citations.",
    description:
      "Pulls out the specific fields you ask for — invoice number, date, total — as clean data, and shows you where on the page each value came from. An AI model does the reading: OpenAI, Claude, AWS Bedrock, or a model running on your own machine so documents never leave it.",
  },
  {
    id: "handwriting",
    // The PRINT document, not the category's first (cursive) one — see
    // `demoDocId`'s comment. Local ICR reads this and fails on cursive.
    demoDocId: "employment-application",
    demoDocReason: "a handwritten page",
    label: "Handwriting recognition",
    enabled: true,
    blurb:
      "Read handwriting and awkward print, on this machine or with a vision model.",
    description:
      "Reads handwritten and awkwardly printed documents. Runs entirely on this machine so nothing leaves your network — or hands the page to a vision AI model, which reads cursive the local engine cannot.",
  },
  {
    id: "adaptive_ocr",
    label: "Adaptive OCR",
    enabled: true,
    blurb: "Reads a scan into structured content, entirely on this machine.",
    description:
      "Turns a scan into structured content — paragraphs, tables and pictures, each with its position on the page. The general-purpose choice when you want the document's layout, not just its words.",
  },
  {
    id: "multilingual",
    // The ONLY document in the corpus with two languages on the page. Without
    // it this panel shows `eng + fra` over an English-only document and
    // silently implies French was found.
    demoDocId: "ocr-multiple-languages",
    demoDocReason: "two languages on one page",
    label: "Multilingual OCR",
    enabled: true,
    blurb: "Adaptive OCR told which languages are actually on the page.",
    description:
      "The same Adaptive OCR engine, told which languages are actually on the page — here, a book spread with French on the left and English on the right. Naming French raises average confidence from 0.93 to 0.95 and recovers the accents the English-only setting drops or mangles (à→a, è→e, elisions like l' vanish), on the French half only — the English half reads identically either way, and English-only OCR still produces readable French, just with flattened diacritics. Deselect French and run again to watch the accents degrade.",
  },
  {
    id: "tables",
    label: "Table extraction",
    enabled: true,
    blurb: "Pull every table off the page as rows, columns and cells.",
    description:
      "Finds the tables in a document and gives you back their actual structure — every row, column and cell, including cells that span more than one of either. Each cell carries how confident the model was and where it sits on the page, so you can check a figure against the original.",
  },
  {
    id: "markdown",
    label: "Markdown export",
    enabled: true,
    blurb: "Turn a page into Markdown — headings, paragraphs and tables.",
    description:
      "A vision model reads each page and writes it back as Markdown: headings, paragraphs, lists and tables, with the tables emitted as HTML so their structure survives. Runs one call per page, so a long document costs more than a short one. Useful for feeding documents to search indexes, static sites or a model's context window. Stops at the first 10 pages of a document.",
  },
  {
    id: "text",
    label: "Text export",
    enabled: true,
    blurb: "Plain text from the document's own text layer — instant, and free.",
    description:
      "Pulls the plain text straight out of the text layer the document already carries. One SDK call: no model, no API key, no network, and typically a few milliseconds. Columns and spacing are kept roughly as they appear on the page, which suits a diff or a grep but means a two-column page reads out of order. A scanned document has no text layer and returns nothing — that is exactly when Adaptive OCR is the right tool, and the panel offers the switch.",
  },
  {
    id: "describe",
    label: "Image description",
    enabled: true,
    blurb: "Describe a page in plain language — alt text, or a quick summary.",
    description:
      "Looks at a page as a picture and writes what it sees, in ordinary language. Useful as alt text so a screen reader can describe a scan, or as a quick answer to 'what is this document?'. The same call transcribes handwriting or summarises the page if you ask it to. Reads the first page only.",
  },
];

export function FeatureRail({
  features,
  value,
  onSelect,
}: {
  features: Feature[];
  value: string;
  onSelect: (id: string) => void;
}) {
  // A FLAT list, deliberately. This was six `group` headings over eight
  // features, four of those headings labelling a single item — 102px of
  // eyebrows plus 80px of inter-group margins to organise eight buttons. The
  // rail has no vertical space to spend on that: measured 2026-08-14, the
  // features nav had 179px of room at a 1440x900 viewport and 79px at
  // 1280x800, so a presenter on a laptop saw two of eight features, or none.
  return (
    <nav className="filter-bar sidebar" aria-label="Features">
      {features.map((f) => (
        // The wrapper, not the button, drives the hover: a disabled button
        // suppresses pointer events in some browsers, so hovering a "soon"
        // item would never reveal its description.
        <span className="rail-item" key={f.id}>
          <button
            type="button"
            className={`chip${value === f.id ? " active" : ""}`}
            disabled={!f.enabled}
            aria-pressed={value === f.id}
            aria-describedby={f.description ? `rail-tip-${f.id}` : undefined}
            onClick={() => f.enabled && onSelect(f.id)}
          >
            <span className="chip-label">{f.label}</span>
            {!f.enabled && <span className="tag wip">soon</span>}
          </button>
          {f.description && (
            <span className="rail-tip" id={`rail-tip-${f.id}`} role="tooltip">
              {f.description}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
