"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const IndexedSearchClient = dynamic(
  () => import("./client").then((m) => m.IndexedSearchClient),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading indexed search…" />,
  },
);

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: "0.92em",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-1)",
  padding: "1px 6px",
};

const codeLinkStyle: React.CSSProperties = {
  ...codeStyle,
  color: "var(--accent)",
  textDecoration: "none",
};

const textLinkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

function Code({ children }: { children: React.ReactNode }) {
  return <span style={codeStyle}>{children}</span>;
}

function CodeLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={codeLinkStyle}>
      {children}
    </a>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={textLinkStyle}>
      {children}
    </a>
  );
}

function HowItWorks() {
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-3)",
        padding: "var(--space-4)",
        color: "var(--ink-2)",
        fontSize: "var(--text-sm)",
        lineHeight: 1.55,
      }}
    >
      <div className="panel-section" style={{ paddingTop: 0, marginBottom: 8 }}>
        How it works
      </div>
      <p style={{ margin: 0 }}>
        Indexed search across a folder of documents is outside the Web SDK's
        scope — the SDK searches only documents loaded in memory. This sample
        composes the missing piece. A build-time pipeline (
        <Code>scripts/build-search-index.ts</Code>) extracts text per page
        (PDF), slide (PPTX), sheet (XLSX), or section (DOCX) using{" "}
        <CodeLink href="https://github.com/mozilla/pdf.js">pdfjs-dist</CodeLink>,{" "}
        <CodeLink href="https://github.com/mwilliamson/mammoth.js">mammoth</CodeLink>,{" "}
        <CodeLink href="https://sheetjs.com/">SheetJS</CodeLink>, and{" "}
        <CodeLink href="https://stuk.github.io/jszip/">JSZip</CodeLink>, then
        writes a{" "}
        <CodeLink href="https://lucaong.github.io/minisearch/">MiniSearch</CodeLink>{" "}
        index to <Code>/search-index/index.json</Code>. The browser loads that
        dump on first paint, runs queries client-side, and hands the matched
        term to Nutrient's <Code>instance.search()</Code> to highlight in
        place.
      </p>
      <div
        className="panel-section"
        style={{ paddingTop: 0, marginTop: 16, marginBottom: 8 }}
      >
        In production
      </div>
      <p style={{ margin: 0 }}>
        Shipping a JSON index to the browser is fine for a fixed demo corpus,
        but doesn't scale: every visitor downloads the full index, and rebuilds
        require a redeploy. For a real document repository, move the index
        server-side. Common stacks:{" "}
        <TextLink href="https://www.postgresql.org/docs/current/textsearch.html">
          Postgres full-text search
        </TextLink>{" "}
        or{" "}
        <CodeLink href="https://www.sqlite.org/fts5.html">SQLite FTS5</CodeLink>{" "}
        when you want to keep infrastructure tight;{" "}
        <CodeLink href="https://www.meilisearch.com/">Meilisearch</CodeLink>,{" "}
        <CodeLink href="https://typesense.org/">Typesense</CodeLink>,{" "}
        <CodeLink href="https://www.elastic.co/elasticsearch">
          Elasticsearch
        </CodeLink>{" "}
        / <CodeLink href="https://opensearch.org/">OpenSearch</CodeLink>, or{" "}
        <CodeLink href="https://www.algolia.com/">Algolia</CodeLink> when you
        want a dedicated search service with relevance tuning, faceting, and
        analytics out of the box. Indexing runs as a background job triggered
        on document upload/change (queue, cron, or event handler) instead of
        at build time, and the browser hits a{" "}
        <Code>GET /api/search?q=…</Code> endpoint that returns{" "}
        <Code>{"{ filename, locator, snippet }"}</Code> hits. The viewer +
        highlight layer in this sample stays identical — only the index
        location moves.
      </p>
    </div>
  );
}

export default function IndexedSearchPage() {
  return (
    <SampleFrame
      title="Indexed Cross-Document Search"
      description="Search a corpus of mixed PDFs and Office documents using a prebuilt full-text index, then jump straight to the matching page in the viewer with the term highlighted."
      wide
      intro={<HowItWorks />}
    >
      <IndexedSearchClient />
    </SampleFrame>
  );
}
