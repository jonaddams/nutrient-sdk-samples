import Link from "next/link";

export default function AIDocumentProcessingHome() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      {/* Header */}
      <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 mb-2">
            ← Back to Home
          </Link>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="!mb-0">Nutrient AI Document Processing</h1>
              <p className="text-sm opacity-60 mt-2">
                Formerly known as XtractFlow
              </p>
            </div>
            <div className="flex gap-3 mb-1">
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
            </div>
          </div>
        </div>
      </header>

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
