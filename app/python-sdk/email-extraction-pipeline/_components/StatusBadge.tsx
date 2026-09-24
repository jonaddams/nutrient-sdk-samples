import type { ExtractionStatus } from "../_lib/types";

/**
 * Status pill, coloured from design-system state tokens rather than raw hex.
 *
 * `received` and `processing` are rendered distinctly rather than folded into
 * one "pending" state: in-flight work being visible is half of what the durable
 * workflow buys, and it is the only place a viewer can see that the pipeline
 * survives a redeploy mid-extraction.
 */

// The --bg-state-* tokens below are NOT defined by this app's design system —
// it ships a neutral scale (--ink/--line/--bg-elev) and no semantic status
// colours. The var() form is kept so a future token would win, but the pale
// fallbacks are what actually render, in both themes. That is deliberate: a
// status chip should read the same in light and dark, which is also why the
// label sets its own dark colour below instead of inheriting the page ink.
const STYLES: Record<
  ExtractionStatus,
  { label: string; bg: string; spinner: boolean }
> = {
  received: {
    label: "Received",
    bg: "var(--bg-state-neutral, #f0f0f0)",
    spinner: true,
  },
  processing: {
    label: "Processing",
    bg: "var(--bg-state-neutral, #f0f0f0)",
    spinner: true,
  },
  processed: {
    label: "Processed",
    bg: "var(--bg-state-success, #d3f9d8)",
    spinner: false,
  },
  needs_review: {
    label: "Needs review",
    bg: "var(--bg-state-warning, #fff3bf)",
    spinner: false,
  },
  failed: {
    label: "Failed",
    bg: "var(--bg-state-error, #ffe3e3)",
    spinner: false,
  },
};

export function StatusBadge({ status }: { status: ExtractionStatus }) {
  const style = STYLES[status] ?? STYLES.received;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
      // The backgrounds are pale in BOTH themes, so the label cannot inherit
      // the page ink — in dark mode that is near-white on near-white.
      style={{ background: style.bg, color: "#1C1917" }}
    >
      {style.spinner && (
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-current opacity-60"
        />
      )}
      {style.label}
    </span>
  );
}
