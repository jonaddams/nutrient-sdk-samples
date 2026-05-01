import { SamplesIndex, type Sample } from "@/app/_components/SamplesIndex";

const samples: Sample[] = [
  {
    name: "Document Generator",
    category: "Templates",
    description:
      "Create professional documents from templates using an intuitive wizard interface with template selection, visual customization, and data integration",
    path: "/document-authoring-sdk/document-generator",
  },
  {
    name: "Template Variables",
    category: "Templates",
    description:
      "Insert template variables from a browsable sidebar instead of typing them manually, with search, categories, and sample data preview",
    path: "/document-authoring-sdk/template-variables",
  },
  {
    name: "Document Builder",
    category: "Programmatic API",
    description:
      "Build documents programmatically from form data using the transaction() API with live preview",
    path: "/document-authoring-sdk/document-builder",
  },
];

const categories = ["All", "Templates", "Programmatic API"];

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
