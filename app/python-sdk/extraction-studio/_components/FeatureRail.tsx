"use client";

export type Feature = {
  id: string;
  group: string;
  label: string;
  enabled: boolean;
  /** Short line under the feature's title in the panel head. */
  blurb?: string;
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
    group: "Structured",
    label: "Structured extraction",
    enabled: true,
    blurb:
      "Pull schema-defined fields from the document, grounded with citations.",
    description:
      "Pulls out the specific fields you ask for — invoice number, date, total — as clean data, and shows you where on the page each value came from. An AI model does the reading: OpenAI, Claude, AWS Bedrock, or a model running on your own machine so documents never leave it.",
  },
  {
    id: "handwriting",
    group: "Recognition",
    label: "Handwriting recognition",
    enabled: true,
    blurb:
      "Read handwriting and awkward print, on this machine or with a vision model.",
    description:
      "Reads handwritten and awkwardly printed documents. Runs entirely on this machine so nothing leaves your network — or hands the page to a vision AI model, which reads cursive the local engine cannot.",
  },
  {
    id: "adaptive_ocr",
    group: "OCR",
    label: "Adaptive OCR",
    enabled: true,
    blurb: "Reads a scan into structured content, entirely on this machine.",
    description:
      "Turns a scan into structured content — paragraphs, tables and pictures, each with its position on the page. The general-purpose choice when you want the document's layout, not just its words.",
  },
  {
    id: "multilingual",
    group: "OCR",
    label: "Multilingual OCR",
    enabled: true,
    blurb: "Adaptive OCR told which languages are actually on the page.",
    description:
      "The same Adaptive OCR engine, told which languages are actually on the page — here, a book spread with French on the left and English on the right. Naming French raises average confidence from 0.93 to 0.95 and recovers the accents the English-only setting drops or mangles (à→a, è→e, elisions like l' vanish), on the French half only — the English half reads identically either way, and English-only OCR still produces readable French, just with flattened diacritics. Deselect French and run again to watch the accents degrade.",
  },
  {
    id: "fast_ocr",
    group: "OCR",
    label: "Fast OCR",
    enabled: false,
    description:
      "Adds an invisible text layer to a scan so it becomes searchable and its text selectable, while looking exactly the same. Built for speed and high volume.",
  },
  {
    id: "tables",
    group: "Tables",
    label: "Table extraction",
    enabled: true,
    blurb: "Pull every table off the page as rows, columns and cells.",
    description:
      "Finds the tables in a document and gives you back their actual structure — every row, column and cell, including cells that span more than one of either. Each cell carries how confident the model was and where it sits on the page, so you can check a figure against the original.",
  },
  {
    id: "markdown",
    group: "Text",
    label: "Markdown export",
    enabled: true,
    blurb: "Turn a page into Markdown — headings, paragraphs and tables.",
    description:
      "A vision model reads each page and writes it back as Markdown: headings, paragraphs, lists and tables, with the tables emitted as HTML so their structure survives. Runs one call per page, so a long document costs more than a short one. Useful for feeding documents to search indexes, static sites or a model's context window. Stops at the first 10 pages of a document.",
  },
  {
    id: "text",
    group: "Text",
    label: "Text export",
    enabled: true,
    blurb: "Plain text from the document's own text layer — instant, and free.",
    description:
      "Pulls the plain text straight out of the text layer the document already carries. One SDK call: no model, no API key, no network, and typically a few milliseconds. Columns and spacing are kept roughly as they appear on the page, which suits a diff or a grep but means a two-column page reads out of order. A scanned document has no text layer and returns nothing — that is exactly when Adaptive OCR is the right tool, and the panel offers the switch.",
  },
  {
    id: "describe",
    group: "Describe",
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
  const groups = [...new Set(features.map((f) => f.group))];
  return (
    <nav className="filter-bar sidebar" aria-label="Features">
      {groups.map((g) => (
        <div key={g}>
          <div className="eyebrow">{g}</div>
          {features
            .filter((f) => f.group === g)
            .map((f) => (
              // The wrapper, not the button, drives the hover: a disabled
              // button suppresses pointer events in some browsers, so
              // hovering a "soon" item would never reveal its description.
              <span className="rail-item" key={f.id}>
                <button
                  type="button"
                  className={`chip${value === f.id ? " active" : ""}`}
                  disabled={!f.enabled}
                  aria-pressed={value === f.id}
                  aria-describedby={
                    f.description ? `rail-tip-${f.id}` : undefined
                  }
                  onClick={() => f.enabled && onSelect(f.id)}
                >
                  <span className="chip-label">{f.label}</span>
                  {!f.enabled && <span className="tag wip">soon</span>}
                </button>
                {f.description && (
                  <span
                    className="rail-tip"
                    id={`rail-tip-${f.id}`}
                    role="tooltip"
                  >
                    {f.description}
                  </span>
                )}
              </span>
            ))}
        </div>
      ))}
    </nav>
  );
}
