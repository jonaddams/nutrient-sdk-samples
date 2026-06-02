"use client";

import { useState } from "react";

export interface ExtractionResultPanelProps {
  /** Heading shown at the top-left of the panel. */
  title: string;
  /** Optional summary line (e.g. "3 tables | 18 cells"). */
  stats?: React.ReactNode;
  /** Label for the rendered/formatted view toggle. */
  primaryLabel: string;
  /** The rendered/formatted view. */
  primary: React.ReactNode;
  /** Label for the raw view toggle (e.g. "JSON", "Markdown"). */
  secondaryLabel: string;
  /** The raw view. */
  secondary: React.ReactNode;
  /** Triggered by the Download button. */
  onDownload: () => void;
  /** When provided, renders an Expand/Collapse button driven by the page. */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const toggleBtn = (active: boolean) =>
  `px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
    active
      ? "bg-[var(--surface)] text-[var(--ink)]"
      : "text-[var(--ink-3)] hover:bg-[var(--surface)]"
  }`;

const actionBtn =
  "px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] transition-colors cursor-pointer";

export function ExtractionResultPanel({
  title,
  stats,
  primaryLabel,
  primary,
  secondaryLabel,
  secondary,
  onDownload,
  expanded,
  onToggleExpand,
}: ExtractionResultPanelProps) {
  const [view, setView] = useState<"primary" | "secondary">("primary");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--line)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--ink-2)]">{title}</h3>
          {stats && (
            <span className="text-xs text-[var(--ink-3)]">{stats}</span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-[var(--line-strong)] overflow-hidden">
            <button
              type="button"
              onClick={() => setView("primary")}
              className={toggleBtn(view === "primary")}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={() => setView("secondary")}
              className={toggleBtn(view === "secondary")}
            >
              {secondaryLabel}
            </button>
          </div>
          <button type="button" onClick={onDownload} className={actionBtn}>
            Download
          </button>
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className={actionBtn}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[var(--bg-elev)]">
        {view === "primary" ? primary : secondary}
      </div>
    </div>
  );
}
