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
    id: "icr",
    group: "Recognition",
    label: "Local ICR",
    enabled: false,
    description:
      "Reads handwriting and awkward print entirely on this machine, with nothing sent to an outside service. For documents that aren't allowed to leave your network.",
  },
  {
    id: "vlm_icr",
    group: "Recognition",
    label: "VLM-enhanced ICR",
    enabled: false,
    description:
      "The same handwriting reading, with a vision AI model checking the parts it finds hardest. Slower than local ICR, but more accurate on messy or poor-quality scans.",
  },
  {
    id: "adaptive_ocr",
    group: "OCR",
    label: "Adaptive OCR",
    enabled: false,
    description:
      "Turns a scan into structured content — paragraphs, tables and pictures, each with its position on the page. The general-purpose choice when you want the document's layout, not just its words.",
  },
  {
    id: "multilingual",
    group: "OCR",
    label: "Multilingual OCR",
    enabled: false,
    description:
      "Adaptive OCR set up to expect more than one language in the same document, for scans that mix scripts — English alongside Japanese, say.",
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
    id: "text",
    group: "Text",
    label: "Text export",
    enabled: false,
    description:
      "Pulls the plain text out of a PDF, keeping columns and spacing roughly as they appear on the page, ready to feed into another tool.",
  },
  {
    id: "describe",
    group: "Describe",
    label: "Image description",
    enabled: false,
    description:
      "Writes a short description of each picture in a document. Mainly for accessibility, where every image needs alt text a screen reader can read out.",
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
