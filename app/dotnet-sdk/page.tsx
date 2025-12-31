import { PageHeader } from "@/app/_components/PageHeader";

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
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h2 className="!mb-6">Coming Soon</h2>
          <p className="text-xl opacity-80 max-w-4xl mb-8">
            .NET SDK samples are currently in development. Check back soon for
            interactive examples demonstrating document processing, form
            filling, and PDF manipulation in .NET applications.
          </p>
          <p className="opacity-70 max-w-4xl">
            In the meantime, visit the{" "}
            <a
              href="https://www.nutrient.io/sdk/dotnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              .NET SDK documentation
            </a>{" "}
            to learn more about this product.
          </p>
        </div>
      </main>
    </div>
  );
}
