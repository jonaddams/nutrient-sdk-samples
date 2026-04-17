import { PageHeader } from "@/app/_components/PageHeader";

export default function DocumentEnginePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Document Engine"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
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

        {/* Standalone Demo */}
        <div className="mb-16">
          <h2 className="!mb-6">Standalone Demo App</h2>
          <div className="border border-[var(--warm-gray-400)] rounded-lg p-6 max-w-4xl">
            <h3 className="!mb-3">DE CRUD</h3>
            <p className="opacity-80 !mb-6">
              A self-contained CRUD application built on Document Engine for
              viewing and editing documents. Hosted separately from this repo
              and intended to be run locally.
            </p>
            <div className="flex gap-4 flex-wrap !mb-4">
              <a
                href="https://github.com/jonaddams/decrud"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-yellow no-underline !text-[var(--black)]"
              >
                Source
              </a>
            </div>
            <p className="text-sm opacity-60 italic !mb-0">
              No hosted demo — clone the repo and follow its README to run
              locally, or ask your Nutrient rep for a walkthrough.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
