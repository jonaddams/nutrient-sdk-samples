import { PageHeader } from "@/app/_components/PageHeader";

export default function APIPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Nutrient API"
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
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h2 className="!mb-6">Coming Soon</h2>
          <p className="text-xl opacity-80 max-w-4xl mb-8">
            Nutrient API samples are currently in development. Check back soon
            for interactive examples demonstrating RESTful document operations
            without SDK installation or server management.
          </p>
          <p className="opacity-70 max-w-4xl">
            In the meantime, visit the{" "}
            <a
              href="https://www.nutrient.io/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              Nutrient API documentation
            </a>{" "}
            to learn more about this product.
          </p>
        </div>
      </main>
    </div>
  );
}
