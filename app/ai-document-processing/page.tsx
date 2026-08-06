import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

export default function AIDocumentProcessingHome() {
  return (
    <SamplesIndex
      title="AI Document Processing"
      description="Classify and extract structured data from invoices, receipts, and purchase orders. Combines ML models with rule-based validation."
      samples={samples}
      productHomeUrl="https://www.nutrient.io/sdk/ai-document-processing/"
      guidesUrl="https://www.nutrient.io/guides/ai-document-processing/"
      intro={
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <div className="callout">
            <span className="callout-label">Classification</span>
            <p>Identify document types and route them to the right workflow.</p>
          </div>
          <div className="callout">
            <span className="callout-label">Extraction</span>
            <p>Pull structured data from unstructured documents at scale.</p>
          </div>
          <div className="callout">
            <span className="callout-label">Validation</span>
            <p>Apply business rules and integrity checks before handoff.</p>
          </div>
        </div>
      }
    />
  );
}
