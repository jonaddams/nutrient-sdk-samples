import Link from "next/link";

export default function DocumentEnginePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      {/* Header */}
      <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 mb-2">
            ← Back to Home
          </Link>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="!mb-0">Document Engine Samples</h1>
            <div className="flex gap-3 mb-1">
              <a
                href="https://www.nutrient.io/sdk/document-engine/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-secondary"
              >
                Product Home
              </a>
              <a
                href="https://www.nutrient.io/guides/document-engine/"
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
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h2 className="!mb-6">Coming Soon</h2>
          <p className="text-xl opacity-80 max-w-4xl mb-8">
            Document Engine samples are currently in development. Check back
            soon for interactive examples demonstrating server-side document
            generation, conversion, and processing at scale.
          </p>
          <p className="opacity-70 max-w-4xl">
            In the meantime, visit the{" "}
            <a
              href="https://www.nutrient.io/sdk/document-engine/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              Document Engine documentation
            </a>{" "}
            to learn more about this product.
          </p>
        </div>
      </main>
    </div>
  );
}
