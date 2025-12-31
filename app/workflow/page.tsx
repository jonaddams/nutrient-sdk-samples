import { PageHeader } from "@/app/_components/PageHeader";

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Workflow"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <a
            href="https://www.nutrient.io/workflow-automation"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-secondary"
          >
            Product Home
          </a>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h2 className="!mb-6">Coming Soon</h2>
          <p className="text-xl opacity-80 max-w-4xl mb-8">
            Workflow automation samples are currently in development. Check back
            soon for interactive examples demonstrating how to automate
            document-centric business processes with AI-powered workflow
            orchestration and intelligent routing.
          </p>
          <p className="opacity-70 max-w-4xl">
            In the meantime, visit the{" "}
            <a
              href="https://www.nutrient.io/workflow-automation"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              Workflow documentation
            </a>{" "}
            to learn more about this product.
          </p>
        </div>
      </main>
    </div>
  );
}
