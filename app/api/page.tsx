import { SamplesIndex, type Sample } from "@/app/_components/SamplesIndex";

const samples: Sample[] = [
  {
    name: "Web SDK Digital Signature (DWS)",
    category: "Signatures",
    description:
      "Sign documents directly in the Nutrient Web SDK viewer using DWS API for secure, in-browser digital signatures",
    path: "/api/sign-document-web-sdk-dws",
  },
  {
    name: "DWS Document Signing",
    category: "Signatures",
    description:
      "Upload and sign PDF documents server-side using DWS Processor API with visible or invisible signatures",
    path: "/api/sign-document-dws",
  },
  {
    name: "Markdown Comparison",
    category: "Comparison",
    description:
      "Compare documents using Nutrient DWS API to convert PDFs to Markdown, preserving semantic structure for accurate cross-page comparison",
    path: "/api/markdown-comparison",
    wip: true,
  },
  {
    name: "HTML Comparison",
    category: "Comparison",
    description:
      "Compare documents using Nutrient DWS API to convert PDFs to HTML, preserving semantic structure for accurate cross-page comparison",
    path: "/api/html-comparison",
    wip: true,
  },
  {
    name: "Text File Viewer",
    category: "Conversion",
    description:
      "View .txt, .csv, and .xml files in the Nutrient viewer by converting them to styled HTML and then to PDF via DWS API",
    path: "/api/text-viewer",
  },
];

const categories = ["All", "Signatures", "Comparison", "Conversion"];

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
