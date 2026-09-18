import type { ExtractionStatus } from "../_lib/types";

/**
 * Status pill, coloured from design-system state tokens rather than raw hex.
 *
 * `received` and `processing` are rendered distinctly rather than folded into
 * one "pending" state: in-flight work being visible is half of what the durable
 * workflow buys, and it is the only place a viewer can see that the pipeline
 * survives a redeploy mid-extraction.
 */

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
      style={{ background: style.bg }}
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
