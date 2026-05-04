import { type Sample, SamplesIndex } from "@/app/_components/SamplesIndex";

const samples: Sample[] = [
  {
    name: "Office to PDF",
    category: "Conversion",
    description: "Convert Word, Excel, and PowerPoint documents to PDF format",
    path: "/java-sdk/office-to-pdf",
  },
  {
    name: "Markdown to PDF",
    category: "Conversion",
    description: "Convert Markdown documents to PDF format",
    path: "/java-sdk/md-to-pdf",
  },
  // HTML-to-PDF hidden — SDK's native HTML renderer crashes on Linux (NullReferenceException in ExportAsPdfStringNative)
  {
    name: "PDF to HTML",
    category: "Conversion",
    description: "Convert PDF documents to HTML for web display",
    path: "/java-sdk/pdf-to-html",
  },
  {
    name: "PDF to Office",
    category: "Conversion",
    description: "Convert PDF documents to Word and Excel formats",
    path: "/java-sdk/pdf-to-office",
  },
  {
    name: "Digital Signature",
    category: "Signatures",
    description: "Apply digital signatures to PDF documents with certificates",
    path: "/java-sdk/digital-signature",
  },
  // OCR and ICR extraction samples hidden until VlmEnhancedIcr ships in a future SDK release
];

const categories = ["All", "Conversion", "Signatures"];

export default function JavaSDKPage() {
  return (
    <SamplesIndex
      title="Java SDK"
      description="Server-side conversion, OCR, and digital signing for JVM applications."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/sdk/java/"
      guidesUrl="https://www.nutrient.io/guides/java/"
      intro={
        <div className="callout">
          <span className="callout-label">How these samples work</span>
          <p>
            This Next.js frontend calls a{" "}
            <a
              href="https://github.com/jonaddams/java-spring-boot"
              target="_blank"
              rel="noopener noreferrer"
            >
              Spring Boot backend
            </a>{" "}
            that wraps the Nutrient Java SDK. The frontend handles uploads and
            displays results; the backend performs the conversions, signing, and
            other operations.
          </p>
        </div>
      }
    />
  );
}
