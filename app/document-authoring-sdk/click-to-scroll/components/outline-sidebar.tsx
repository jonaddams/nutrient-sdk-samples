"use client";

import type { HeadingEntry } from "../lib/outline";

interface OutlineSidebarProps {
  headings: HeadingEntry[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
  isLoading: boolean;
}

export default function OutlineSidebar({
  headings,
  activeIndex,
  onSelect,
  isLoading,
}: OutlineSidebarProps) {
  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-elev)",
        borderRight: "1px solid var(--line)",
        color: "var(--ink)",
      }}
    >
      <header
        className="px-4 py-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div
          className="panel-section"
          style={{ paddingTop: 0, marginBottom: 8 }}
        >
          Outline
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          Click a heading to jump to it. Position is approximated from the
          document model — the SDK has no public scroll-to API yet.
        </p>
      </header>

      <nav
        aria-label="Document outline"
        className="flex-1 min-h-0 overflow-y-auto px-2 py-3"
      >
        {isLoading && (
          <p className="px-3 py-2 text-xs" style={{ color: "var(--ink-3)" }}>
            Reading document structure…
          </p>
        )}
        {!isLoading && headings.length === 0 && (
          <p className="px-3 py-2 text-xs" style={{ color: "var(--ink-3)" }}>
            No headings detected.
          </p>
        )}
        {!isLoading && headings.length > 0 && (
          <ul className="space-y-0.5">
            {headings.map((h, i) => {
              const isActive = i === activeIndex;
              const indent = h.level === 1 ? "pl-3" : "pl-7";
              const isLevel1 = h.level === 1;
              return (
                <li key={`${i}-${h.text}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    className={`w-full text-left ${indent} pr-3 py-1.5 text-sm transition-colors cursor-pointer ${
                      isLevel1 ? "font-medium" : "font-normal"
                    }`}
                    style={{
                      background: isActive
                        ? "color-mix(in srgb, var(--accent) 14%, var(--bg-elev))"
                        : "transparent",
                      color: isActive
                        ? "var(--accent)"
                        : isLevel1
                          ? "var(--ink-2)"
                          : "var(--ink-3)",
                      border: `1px solid ${
                        isActive
                          ? "color-mix(in srgb, var(--accent) 35%, var(--line))"
                          : "transparent"
                      }`,
                      borderRadius: "var(--r-2)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "var(--surface)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {h.text}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <footer
        className="px-4 py-3 text-[11px] leading-relaxed"
        style={{
          borderTop: "1px solid var(--line)",
          color: "var(--ink-4)",
        }}
      >
        Heuristic: paragraphs with bold formatting and pointSize ≥ 14 are
        treated as headings. Scroll target is weighted by character count.
      </footer>
    </aside>
  );
}
