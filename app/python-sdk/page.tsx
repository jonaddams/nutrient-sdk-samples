import { type Sample, SamplesIndex } from "@/app/_components/SamplesIndex";

const samples: Sample[] = [
  {
    name: "Office to PDF",
    category: "Conversion",
    description: "Convert Word, Excel, and PowerPoint documents to PDF format",
    path: "/python-sdk/office-to-pdf",
  },
  {
    name: "Markdown to PDF",
    category: "Conversion",
    description: "Convert Markdown documents to PDF format",
    path: "/python-sdk/md-to-pdf",
  },
  {
    name: "PDF to HTML",
    category: "Conversion",
    description: "Convert PDF documents to HTML for web display",
    path: "/python-sdk/pdf-to-html",
  },
  {
    name: "PDF to Office",
    category: "Conversion",
    description: "Convert PDF documents to Word and Excel formats",
    path: "/python-sdk/pdf-to-office",
  },
  {
    name: "Digital Signature",
    category: "Signatures",
    description: "Apply digital signatures to PDF documents with certificates",
    path: "/python-sdk/digital-signature",
  },
  {
    name: "PDF Redaction",
    category: "Editor",
    description: "Permanently remove sensitive content from PDF documents",
    path: "/python-sdk/redaction",
  },
  {
    name: "Form Field Detection",
    category: "Forms",
    description:
      "Detect form fields in an unfielded PDF with the Nutrient SDK's ML detector",
    path: "/python-sdk/form-detection",
  },
  {
    name: "PDF Form Fill",
    category: "Forms",
    description:
      "Programmatically fill PDF form fields with data and generate a filled PDF",
    path: "/python-sdk/form-fill",
  },
  {
    name: "VLM Transcription",
    category: "Extraction",
    description:
      "Transcribe handwriting via Vision.describe() with a custom prompt — works on cursive where ICR doesn't",
    path: "/python-sdk/vlm-transcription",
  },
  {
    name: "OCR Extraction",
    category: "Extraction",
    description:
      "Extract printed text from images with Adaptive OCR — high-throughput, optimized for purely printed content",
    path: "/python-sdk/ocr-extraction",
  },
  {
    name: "ICR Extraction",
    category: "Extraction",
    description:
      "Extract structured document data from images using the Nutrient SDK's ICR engine — printed pages and hand-printed forms",
    path: "/python-sdk/icr-extraction",
  },
  {
    name: "VLM Extraction",
    category: "Extraction",
    description:
      "Extract structured content from documents without native form fields (e.g. invoices) via VLM-enhanced ICR with Claude",
    path: "/python-sdk/vlm-extraction",
  },
  {
    name: "Table Extraction",
    category: "Extraction",
    description:
      "Extract structured tables (rows, columns, spanning cells) from an invoice via VLM-enhanced extraction with Claude",
    path: "/python-sdk/table-extraction",
  },
  {
    name: "Document to Markdown",
    category: "Extraction",
    description:
      "Convert a complex document to clean Markdown for RAG and LLM ingestion pipelines",
    path: "/python-sdk/markdown-extraction",
  },
  {
    name: "Field Extraction",
    category: "Extraction",
    description:
      "Pull labeled fields into clean values — native key-value regions plus schema-driven extraction with a custom prompt",
    path: "/python-sdk/field-extraction",
  },
  {
    name: "Word Template Generation",
    category: "Templates",
    description:
      "Generate PDF documents from Word templates populated with JSON data",
    path: "/python-sdk/word-template",
  },
];

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
