import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";

export default function AIDocumentProcessingHome() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Nutrient AI Document Processing"
        description="Formerly known as XtractFlow"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/ai-document-processing/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/ai-document-processing/"
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
            Nutrient AI Document Processing provides powerful APIs for
            automating document-centric workflows. The platform combines machine
            learning models with rule-based validation to deliver accurate,
            production-ready results.
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="p-6 border border-[var(--warm-gray-400)] rounded-lg">
              <h3 className="!mb-3">Classification</h3>
              <p className="text-sm opacity-70">
                Automatically identify document types and route them to
                appropriate workflows.
              </p>
            </div>
            <div className="p-6 border border-[var(--warm-gray-400)] rounded-lg">
              <h3 className="!mb-3">Extraction</h3>
              <p className="text-sm opacity-70">
                Extract structured data from unstructured documents with high
                accuracy.
              </p>
            </div>
            <div className="p-6 border border-[var(--warm-gray-400)] rounded-lg">
              <h3 className="!mb-3">Validation</h3>
              <p className="text-sm opacity-70">
                Built-in validation ensures extracted data meets business rules
                and standards.
              </p>
            </div>
          </div>
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
                      href="/ai-document-processing/invoices"
                      className="hover:opacity-70 transition-opacity"
                    >
                      Invoice Management
                    </Link>
                  </td>
                  <td className="nutrient-td">
                    Automatically classify and extract data from invoices,
                    receipts, and purchase orders with built-in validation
                  </td>
                </tr>
                <tr>
                  <td className="nutrient-td opacity-50">
                    More Samples Coming Soon
                  </td>
                  <td className="nutrient-td opacity-50">
                    Additional samples will be added to demonstrate more use
                    cases
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-sm opacity-60">
          <p>
            These samples are proof-of-concept demonstrations of the Nutrient AI
            Document Processing API capabilities.
          </p>
        </div>
      </main>
    </div>
  );
}
