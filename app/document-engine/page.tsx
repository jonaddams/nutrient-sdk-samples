import { PageHeader } from "@/app/_components/PageHeader";

export default function DocumentEnginePage() {
  return (
    <>
      <PageHeader
        title="Document Engine"
        description="Server-side document processing API for hosted or self-hosted deployments."
        breadcrumbs={[{ label: "Home", href: "/" }]}
        meta={
          <>
            <span>
              <span className="tag">Coming soon</span>
            </span>
            <span>
              <a
                href="https://www.nutrient.io/sdk/document-engine/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Product home →
              </a>
            </span>
            <span>
              <a
                href="https://www.nutrient.io/guides/document-engine/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Guides →
              </a>
            </span>
          </>
        }
      />

      <section className="shell" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-9)" }}>
        <div className="callout" style={{ maxWidth: "var(--reading-max)" }}>
          <span className="callout-label">In development</span>
          <p>
            Document Engine samples are still being built. In the meantime, the{" "}
            <a
              href="https://www.nutrient.io/sdk/document-engine/"
              target="_blank"
              rel="noopener noreferrer"
            >
              product documentation
            </a>{" "}
            covers the API surface.
          </p>
        </div>

        <div className="divider-eyebrow">/ Standalone demo</div>
        <div className="callout" style={{ maxWidth: "var(--reading-max)" }}>
          <span className="callout-label">DE CRUD</span>
          <p>
            A self-contained CRUD app built on Document Engine.{" "}
            <a
              href="https://github.com/jonaddams/decrud"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source on GitHub
            </a>
            . Clone and run locally — no hosted demo.
          </p>
        </div>
      </section>
    </>
  );
}
