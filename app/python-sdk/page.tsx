import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

const categories = [
  "All",
  "Conversion",
  "Editor",
  "Signatures",
  "Forms",
  "Extraction",
  "Templates",
];

export default function PythonSDKPage() {
  return (
    <SamplesIndex
      title="Python SDK"
      description="Document conversion, redaction, form fill, and template generation."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/sdk/python/"
      guidesUrl="https://www.nutrient.io/guides/python/"
      intro={
        <div className="callout">
          <span className="callout-label">How these samples work</span>
          <p>
            This Next.js frontend calls a{" "}
            <a
              href="https://github.com/jonaddams/python-fast-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              FastAPI backend
            </a>{" "}
            that wraps the Nutrient Python SDK. The frontend handles uploads and
            displays results; the backend performs the conversions, signing, and
            template population.
          </p>
        </div>
      }
    />
  );
}
