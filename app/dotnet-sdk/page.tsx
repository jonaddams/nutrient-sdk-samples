import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";

type Demo = {
  name: string;
  description: string;
  path: string;
  available: boolean;
};

const demos: Demo[] = [
  {
    name: "Optimize",
    description: "MRC compression for scanned PDFs.",
    path: "/dotnet-sdk/optimize",
    available: true,
  },
  {
    name: "Convert",
    description: "Convert Office documents and other formats to PDF.",
    path: "/dotnet-sdk/convert",
    available: false,
  },
  {
    name: "OCR",
    description: "Extract text from scanned documents using optical character recognition.",
    path: "/dotnet-sdk/ocr",
    available: true,
  },
  {
    name: "Redact",
    description: "Permanently remove sensitive content from PDFs.",
    path: "/dotnet-sdk/redact",
    available: false,
  },
  {
    name: "PDF/A",
    description: "Convert PDFs to the archival PDF/A standard.",
    path: "/dotnet-sdk/pdfa",
    available: false,
  },
  {
    name: "Linearize",
    description: "Optimize PDFs for fast web viewing (fast web view).",
    path: "/dotnet-sdk/linearize",
    available: true,
  },
  {
    name: "Merge",
    description: "Combine multiple PDF documents into a single file.",
    path: "/dotnet-sdk/merge",
    available: false,
  },
  {
    name: "Watermark",
    description: "Apply text or image watermarks to PDF pages.",
    path: "/dotnet-sdk/watermark",
    available: false,
  },
];

export default function DotNetSDKPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title=".NET SDK"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/dotnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/dotnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Guides
            </a>
            <a
              href="https://github.com/jonaddams/nutrient-dotnet-api"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Backend API Repo
            </a>
            <a
              href="https://github.com/jonaddams/nutrient-sdk-samples"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Source
            </a>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
          <h2 className="text-lg font-semibold mb-2">How These Samples Work</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            This Next.js frontend sends requests to a{" "}
            <a
              href="https://github.com/jonaddams/nutrient-dotnet-api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              .NET backend
            </a>{" "}
            that uses the Nutrient .NET SDK for document processing. The
            frontend handles file uploads and result display, while the backend
            performs the actual PDF operations. API calls go through Next.js
            server-side proxy routes so the API key stays server-side.
          </p>
        </div>

        <div className="mb-16">
          {/* Demos table */}
          <div className="nutrient-table-container">
            <table className="nutrient-table">
              <thead>
                <tr>
                  <th className="nutrient-th nutrient-th-title">Demo</th>
                  <th className="nutrient-th nutrient-th-title">Description</th>
                  <th className="nutrient-th nutrient-th-title">Status</th>
                </tr>
              </thead>
              <tbody>
                {demos.map((demo) => (
                  <tr key={demo.path}>
                    <td className="nutrient-td nutrient-td-bold">
                      {demo.available ? (
                        <Link
                          href={demo.path}
                          className="hover:opacity-70 transition-opacity"
                        >
                          {demo.name}
                        </Link>
                      ) : (
                        <span className="opacity-40">{demo.name}</span>
                      )}
                    </td>
                    <td className={`nutrient-td${demo.available ? "" : " opacity-40"}`}>
                      {demo.description}
                    </td>
                    <td className="nutrient-td">
                      {demo.available ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Available
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Coming soon
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
