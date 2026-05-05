"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const IndexedSearchServerClient = dynamic(
  () => import("./client").then((m) => m.IndexedSearchServerClient),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading server-side indexed search…" />,
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
        Same extractors as the build-time sibling — <Code>pdfjs-dist</Code>,{" "}
        <Code>mammoth</Code>, <Code>SheetJS</Code>, <Code>JSZip</Code> — but the
        index lives in Postgres instead of a static JSON dump. A one-shot{" "}
        <Code>pnpm seed-search</Code> applies the migration and upserts each
        unit into a denormalized <Code>search_units</Code> table with a
        generated{" "}
        <TextLink href="https://www.postgresql.org/docs/current/datatype-textsearch.html">
          tsvector
        </TextLink>{" "}
        column (title weight A, unit-label B, content C) plus a{" "}
        <TextLink href="https://www.postgresql.org/docs/current/textsearch-indexes.html">
          GIN index
        </TextLink>{" "}
        for fast lookup. The browser hits{" "}
        <Code>GET /api/search?q=…</Code>, the route runs{" "}
        <Code>plainto_tsquery</Code> against the GIN index, and{" "}
        <TextLink href="https://www.postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-HEADLINE">
          ts_headline
        </TextLink>{" "}
        generates highlighted snippets server-side. Connection pooling is
        handled by Vercel's Neon integration via pgbouncer (
        <CodeLink href="https://node-postgres.com/">node-postgres</CodeLink>{" "}
        for the driver).
      </p>
      <div
        className="panel-section"
        style={{ paddingTop: 0, marginTop: 16, marginBottom: 8 }}
      >
        Why this vs the build-time sample
      </div>
      <p style={{ margin: 0 }}>
        <strong>Build-time JSON</strong> (
        <TextLink href="/web-sdk/indexed-search">/indexed-search</TextLink>):
        zero infra, ships to the client, fixed corpus, every visitor downloads
        the full index, rebuilds require a redeploy. Right for fixed reference
        material — docs, marketing pages, public catalogs.{" "}
        <strong>Server-side Postgres</strong> (this sample): real-time updates
        as documents are added/changed, scales with corpus size (GIN index
        keeps queries fast), per-tenant data isolation if you need it, server
        bears the index cost. Right for actual document repositories — internal
        knowledge bases, customer-facing search, anything that grows. The
        viewer + highlight layer (
        <Code>SearchViewer.tsx</Code>) is identical between the two — only
        the data source for the sidebar changes.
      </p>
    </div>
  );
}

export default function IndexedSearchServerPage() {
  return (
    <SampleFrame
      title="Indexed Cross-Document Search (Server-Side)"
      description="Same indexed search as the build-time sample, but with the index living in Postgres and queries served by an API route. Demonstrates the production path beyond a static JSON dump."
      wide
      intro={<HowItWorks />}
    >
      <IndexedSearchServerClient />
    </SampleFrame>
  );
}
