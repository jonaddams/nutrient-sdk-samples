import { SamplesIndex, type Sample } from "@/app/_components/SamplesIndex";

const samples: Sample[] = [
  {
    name: "Linearize",
    category: "File Optimization",
    description:
      "Optimize PDFs for fast web view, allowing the first page to render before the entire file downloads.",
    path: "/dotnet-sdk/linearize",
  },
  {
    name: "OCR",
    category: "Text Extraction",
    description:
      "Recognize text in scanned PDFs and images. Output a searchable PDF or extract the recognized text as plain text.",
    path: "/dotnet-sdk/ocr",
  },
  {
    name: "Optimize",
    category: "File Optimization",
    description:
      "Reduce PDF file size with MRC compression. Especially effective on scanned and image-heavy documents.",
    path: "/dotnet-sdk/optimize",
  },
];

const categories = ["All", "File Optimization", "Text Extraction"];

export default function DotNetSDKPage() {
  return (
    <SamplesIndex
      title=".NET SDK"
      description="File optimization, linearization, and OCR for .NET workloads."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/guides/dotnet/"
      guidesUrl="https://www.nutrient.io/guides/dotnet/"
      intro={
        <div className="callout">
          <span className="callout-label">How these samples work</span>
          <p>
            This Next.js frontend calls server-side .NET routes that wrap the
            Nutrient .NET SDK. Routes live under <code>/api/dotnet-sdk</code>.
          </p>
        </div>
      }
    />
  );
}
