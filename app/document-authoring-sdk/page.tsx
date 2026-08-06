import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

const categories = ["All", "Templates", "Programmatic API", "Navigation"];

export default function DocumentAuthoringSdkSamplesPage() {
  return (
    <SamplesIndex
      title="Document Authoring SDK"
      description="Programmatic document generation with templates, variables, and live preview."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/sdk/document-authoring/"
      guidesUrl="https://www.nutrient.io/guides/document-authoring-sdk/"
    />
  );
}
