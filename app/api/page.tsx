import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";

export default function APIPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Nutrient DWS API"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Guides
            </a>
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* About Section */}
        <div className="mb-8">
          <h2 className="!mb-6">About</h2>
          <p className="opacity-80 mb-6 max-w-4xl">
            Nutrient DWS API provides powerful RESTful document operations
            without requiring SDK installation or server management. Convert,
            merge, split, and process documents with simple HTTP requests.
          </p>
        </div>

        {/* Available Samples */}
        <div className="mb-16">
          <h2 className="!mb-6">Available Samples</h2>

          {/* Samples Table */}
          <div className="nutrient-table-container">
            <table className="nutrient-table">
              <thead>
                <tr>
                  <th className="nutrient-th nutrient-th-title">Name</th>
                  <th className="nutrient-th nutrient-th-title">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="nutrient-td nutrient-td-bold">
                    <Link
                      href="/api/digital-signature"
                      className="hover:opacity-70 transition-opacity"
                    >
                      Web SDK Digital Signature
                    </Link>
                  </td>
                  <td className="nutrient-td">
                    Sign documents directly in the Nutrient Web SDK viewer using
                    DWS API for secure, in-browser digital signatures
                  </td>
                </tr>
                <tr>
                  <td className="nutrient-td nutrient-td-bold">
                    <Link
                      href="/api/sign-document-dws"
                      className="hover:opacity-70 transition-opacity"
                    >
                      DWS Document Signing
                    </Link>
                  </td>
                  <td className="nutrient-td">
                    Upload and sign PDF documents server-side using DWS Processor
                    API with visible or invisible signatures
                  </td>
                </tr>
                <tr>
                  <td className="nutrient-td nutrient-td-bold">
                    <Link
                      href="/api/markdown-comparison"
                      className="hover:opacity-70 transition-opacity"
                    >
                      Markdown Comparison
                    </Link>
                    <span className="ml-2 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                      Work in Progress
                    </span>
                  </td>
                  <td className="nutrient-td">
                    Compare documents using Nutrient DWS API to convert PDFs to
                    Markdown, preserving semantic structure for accurate
                    cross-page comparison
                  </td>
                </tr>
                <tr>
                  <td className="nutrient-td nutrient-td-bold">
                    <Link
                      href="/api/html-comparison"
                      className="hover:opacity-70 transition-opacity"
                    >
                      HTML Comparison
                    </Link>
                    <span className="ml-2 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                      Work in Progress
                    </span>
                  </td>
                  <td className="nutrient-td">
                    Compare documents using Nutrient DWS API to convert PDFs to
                    HTML, preserving semantic structure for accurate cross-page
                    comparison
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-sm opacity-60">
          <p>
            These samples demonstrate the Nutrient DWS API capabilities.
            Requires a Nutrient DWS API key configured in .env.local
          </p>
        </div>
      </main>
    </div>
  );
}
