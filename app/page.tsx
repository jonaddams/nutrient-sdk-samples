import Link from "next/link";

interface SdkEntry {
  id: string;
  num: string;
  title: string;
  desc: string;
  foot: string;
  comingSoon?: boolean;
}

const SDKS: SdkEntry[] = [
  {
    id: "web-sdk",
    num: "01",
    title: "Web SDK",
    desc: "In-browser PDF viewing, annotations, forms, signatures, redaction, and comparison.",
    foot: "33 samples",
  },
  {
    id: "document-engine",
    num: "02",
    title: "Document Engine",
    desc: "Server-side document processing API for hosted or self-hosted deployments.",
    foot: "Coming soon",
    comingSoon: true,
  },
  {
    id: "ai-document-processing",
    num: "03",
    title: "AI Document Processing",
    desc: "Classify and extract structured data from invoices, receipts, and POs.",
    foot: "1 sample",
  },
  {
    id: "java-sdk",
    num: "04",
    title: "Java SDK",
    desc: "Server-side conversion, OCR, and digital signing for JVM applications.",
    foot: "5 samples",
  },
  {
    id: "python-sdk",
    num: "05",
    title: "Python SDK",
    desc: "Document conversion, redaction, form fill, and template generation.",
    foot: "7 samples",
  },
  {
    id: "dotnet-sdk",
    num: "06",
    title: ".NET SDK",
    desc: "File optimization, linearization, and OCR for .NET workloads.",
    foot: "3 samples",
  },
  {
    id: "api",
    num: "07",
    title: "Nutrient DWS API",
    desc: "Document Web Services — signing, conversion, and comparison via REST.",
    foot: "5 samples",
  },
  {
    id: "document-authoring-sdk",
    num: "08",
    title: "Document Authoring SDK",
    desc: "Programmatic document generation with templates, variables, and live preview.",
    foot: "3 samples",
  },
];

export default function Home() {
  const total = SDKS.reduce((n, s) => {
    const m = s.foot.match(/^(\d+)/);
    return n + (m ? Number(m[1]) : 0);
  }, 0);

  return (
    <section className="shell">
      <div className="hero">
        <div className="eyebrow" style={{ marginBottom: "var(--space-5)" }}>
          <span style={{ color: "var(--accent)" }}>●</span> Solutions Lab
        </div>
        <h1 className="display">
          A staged showcase for <em>document</em> SDK patterns.
        </h1>
        <p className="lede">
          Interactive demos and code samples for evaluating document SDKs and APIs.
          Each example is self-contained — copy a folder, swap the brand tokens, ship.
        </p>
        <div className="hero-meta">
          <span><span className="dot">●</span> {SDKS.filter((s) => !s.comingSoon).length} SDKs</span>
          <span>{total} working samples</span>
          <span>Light + dark</span>
          <span>MIT-licensed scaffold</span>
        </div>
      </div>

      <div className="section-label">
        <div className="num">/ Index</div>
        <div className="title">Pick an SDK</div>
      </div>

      <div className="sdk-grid">
        {SDKS.map((s) =>
          s.comingSoon ? (
            <div key={s.id} className="sdk-card coming-soon">
              <div className="top">
                <span className="id">
                  {s.num} — {s.id.replace(/-/g, " ")}
                </span>
                <span className="tag">Coming soon</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="foot">
                <span>{s.foot}</span>
              </div>
            </div>
          ) : (
            <Link key={s.id} href={`/${s.id}`} className="sdk-card">
              <div className="top">
                <span className="id">
                  {s.num} — {s.id.replace(/-/g, " ")}
                </span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="foot">
                <span>{s.foot}</span>
                <span className="arrow">→</span>
              </div>
            </Link>
          )
        )}
      </div>

      <div className="divider-eyebrow">/ Notes</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--space-6)",
          paddingBottom: "var(--space-7)",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            What this is
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--ink-2)",
              lineHeight: 1.6,
              maxWidth: "40ch",
            }}
          >
            A solutions-engineering laboratory. Each sample links to its source so
            you can fork the file and adapt it to your stack.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            How to use
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--ink-2)",
              lineHeight: 1.6,
              maxWidth: "40ch",
            }}
          >
            Pick an SDK, browse the samples, open one in the viewer. The repo is
            structured so a single sample folder is enough to read end to end.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Theming
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--ink-2)",
              lineHeight: 1.6,
              maxWidth: "40ch",
            }}
          >
            The whole vocabulary lives in CSS variables on{" "}
            <code>{`<html>`}</code>. Override <code>data-palette</code>,{" "}
            <code>data-theme</code>, or the tokens directly to rebrand.
          </p>
        </div>
      </div>
    </section>
  );
}
