import type { ReactNode } from "react";
import { type Breadcrumb, PageHeader } from "./PageHeader";

interface SampleCanvasProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  /** Widen the main content area to 1800px for editor-style samples that need more horizontal room. The page header stays in the standard 1200px column for consistency. */
  wide?: boolean;
  /** CSS height of the content card. */
  height?: string;
  /** Min height of the content card in px. */
  minHeight?: number;
  /** Card body — typically a grid or flex layout. Should size itself with h-full to fill the card's fixed height. */
  children: ReactNode;
}

export function SampleCanvas({
  title,
  description,
  breadcrumbs,
  wide,
  height = "calc(100vh - 16rem)",
  minHeight = 560,
  children,
}: SampleCanvasProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
          ...(wide ? { maxWidth: 1800 } : null),
        }}
      >
        <div
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            overflow: "hidden",
            height,
            minHeight,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
