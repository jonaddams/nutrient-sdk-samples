import { PageHeader } from "@/app/_components/PageHeader";

export default function WorkflowPage() {
  return (
    <>
      <PageHeader
        title="Workflow"
        description="Automate document-centric business processes with AI-powered orchestration and intelligent routing."
        breadcrumbs={[{ label: "Home", href: "/" }]}
        meta={
          <>
            <span>
              <span className="tag">Coming soon</span>
            </span>
            <span>
              <a
                href="https://www.nutrient.io/workflow-automation"
                target="_blank"
                rel="noopener noreferrer"
              >
                Product home →
              </a>
            </span>
          </>
        }
      />

      <section className="shell" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-9)" }}>
        <div className="callout" style={{ maxWidth: "var(--reading-max)" }}>
          <span className="callout-label">In development</span>
          <p>
            Workflow samples are still being built. Visit the{" "}
            <a
              href="https://www.nutrient.io/workflow-automation"
              target="_blank"
              rel="noopener noreferrer"
            >
              product page
            </a>{" "}
            to learn more.
          </p>
        </div>
      </section>
    </>
  );
}
