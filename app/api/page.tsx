import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

const categories = [
  "All",
  "Generation",
  "Signatures",
  "Comparison",
  "Conversion",
];

export default function APIPage() {
  return (
    <SamplesIndex
      title="Nutrient DWS API"
      description="RESTful document operations without SDK installation or server management — convert, merge, split, and sign with HTTP."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/api/"
      guidesUrl="https://www.nutrient.io/guides/dws-api/"
      intro={
        <div className="callout">
          <span className="callout-label">Standalone demo</span>
          <p>
            <a
              href="https://dws-crud.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              DWS CRUD
            </a>{" "}
            — a self-contained CRUD app built on the DWS APIs (
            <a
              href="https://github.com/jonaddams/dws-crud"
              target="_blank"
              rel="noopener noreferrer"
            >
              source
            </a>
            ). Access requires a Nutrient Google account.
          </p>
        </div>
      }
    />
  );
}
