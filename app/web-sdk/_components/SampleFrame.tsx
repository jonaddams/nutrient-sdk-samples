import type { ReactNode } from "react";
import { SampleHeader } from "./SampleHeader";

interface SampleFrameProps {
  title: string;
  description?: string;
  /** Optional sidebar rendered to the left or right of the viewer */
  sidebar?: ReactNode;
  /** Side the sidebar should appear on (default: "left") */
  sidebarSide?: "left" | "right";
  /** Sidebar fixed width in px (default: 320) */
  sidebarWidth?: number;
  /** CSS height of the viewer card (default: "calc(100vh - 16rem)") */
  height?: string;
  /** Min height of the viewer card (default: 560) */
  minHeight?: number;
  /** Optional content rendered between the header and the viewer card */
  intro?: ReactNode;
  /** Optional content rendered below the viewer card */
  footer?: ReactNode;
  /** Use a wider container (1800px) for samples that need extra horizontal room */
  wide?: boolean;
  children: ReactNode;
}

export function SampleFrame({
  title,
  description,
  sidebar,
  sidebarSide = "left",
  sidebarWidth = 320,
  height = "calc(100vh - 16rem)",
  minHeight = 560,
  intro,
  footer,
  wide,
  children,
}: SampleFrameProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <SampleHeader title={title} description={description} />
      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
          ...(wide ? { maxWidth: 1800 } : null),
        }}
      >
        {intro && (
          <div style={{ marginBottom: "var(--space-5)" }}>{intro}</div>
        )}
        <div
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-3)",
            overflow: "hidden",
            height,
            minHeight,
            display: "flex",
            flexDirection: sidebarSide === "right" ? "row" : "row-reverse",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
          {sidebar && (
            <aside
              style={{
                width: sidebarWidth,
                flexShrink: 0,
                // Match the Tweaks panel's elevated look — bg-elev with a
                // subtle line divider against the viewer area. Section
                // labels inside should use the .panel-section class for
                // mono uppercase eyebrows that match the Tweaks aesthetic.
                background: "var(--bg-elev)",
                borderLeft:
                  sidebarSide === "right" ? "1px solid var(--line)" : undefined,
                borderRight:
                  sidebarSide === "left" ? "1px solid var(--line)" : undefined,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {sidebar}
            </aside>
          )}
        </div>
        {footer && (
          <div style={{ marginTop: "var(--space-5)" }}>{footer}</div>
        )}
      </main>
    </div>
  );
}
