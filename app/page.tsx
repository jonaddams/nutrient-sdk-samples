import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      {/* Header */}
      <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="!mb-0">Nutrient SDK Samples</h1>
          <a
            href="https://github.com/jonaddams/nutrient-sdk-samples"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--warm-gray-300)] hover:text-[var(--digital-pollen)] transition-colors no-underline"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Introduction */}
        <div className="mb-16">
          <p className="text-xl !mb-6">
            Explore interactive demos and code samples for Nutrient's SDKs and
            APIs. Each example demonstrates key features and implementation
            patterns to help you integrate document processing capabilities into
            your applications.
          </p>
        </div>

        {/* SDK Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Web SDK */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">Web SDK</h2>
            <p className="!mb-6">
              Client-side JavaScript SDK for viewing, annotating, and editing
              PDF documents in web browsers.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/web-sdk"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                View Samples
              </Link>
              <a
                href="https://www.nutrient.io/sdk/web/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* Document Engine */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">Document Engine</h2>
            <p className="!mb-6">
              Server-side API for document generation, conversion, and
              processing at scale.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="https://www.nutrient.io/sdk/document-engine/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* AI Document Processing */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">AI Document Processing</h2>
            <p className="!mb-6">
              AI-powered document understanding, extraction, and classification
              capabilities.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/ai-document-processing"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                View Samples
              </Link>
              <a
                href="https://www.nutrient.io/sdk/ai-document-processing/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* Java SDK */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">Java SDK</h2>
            <p className="!mb-6">
              Server-side Java library for PDF conversion, editing, form filling,
              signatures, and text extraction.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/java-sdk"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                View Samples
              </Link>
              <a
                href="https://www.nutrient.io/sdk/java/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* Python SDK */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">Python SDK</h2>
            <p className="!mb-6">
              Server-side Python library for PDF conversion, editing, form
              filling, signatures, and text extraction.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/python-sdk"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                View Samples
              </Link>
              <a
                href="https://www.nutrient.io/sdk/python/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* .NET SDK */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">.NET SDK</h2>
            <p className="!mb-6">
              Native .NET library for document processing, form filling, and PDF
              manipulation in .NET applications.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="https://www.nutrient.io/sdk/dotnet/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* API */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">Nutrient DWS API</h2>
            <p className="!mb-6">
              RESTful API for document operations without SDK installation or
              server management.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/api"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                View Samples
              </Link>
              <a
                href="https://www.nutrient.io/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* Document Authoring SDK */}
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 hover:border-[var(--digital-pollen)] transition-colors">
            <h2 className="!mb-4">Document Authoring SDK</h2>
            <p className="!mb-6">
              Create, edit, and collaborate on documents with rich formatting
              and templates.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/document-authoring-sdk"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                View Samples
              </Link>
              <a
                href="https://www.nutrient.io/sdk/document-authoring/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow-outline no-underline"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
