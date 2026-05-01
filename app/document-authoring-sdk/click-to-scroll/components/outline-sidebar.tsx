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
    <aside className="h-full flex flex-col bg-gray-900 border-r border-gray-700 text-gray-100">
      <header className="px-4 py-4 border-b border-gray-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
          Outline
        </h2>
        <p className="mt-1 text-xs text-gray-400 leading-relaxed">
          Click a heading to jump to it. Position is approximated from the
          document model — the SDK has no public scroll-to API yet.
        </p>
      </header>

      <nav
        aria-label="Document outline"
        className="flex-1 min-h-0 overflow-y-auto px-2 py-3"
      >
        {isLoading && (
          <p className="px-3 py-2 text-xs text-gray-400">
            Reading document structure…
          </p>
        )}
        {!isLoading && headings.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-400">
            No headings detected.
          </p>
        )}
        {!isLoading && headings.length > 0 && (
          <ul className="space-y-0.5">
            {headings.map((h, i) => {
              const isActive = i === activeIndex;
              const indent = h.level === 1 ? "pl-3" : "pl-7";
              return (
                <li key={`${i}-${h.text}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    className={`w-full text-left ${indent} pr-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                      h.level === 1 ? "font-medium" : "font-normal"
                    } ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : h.level === 1
                          ? "text-gray-100 hover:bg-gray-800 hover:text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {h.text}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <footer className="px-4 py-3 border-t border-gray-700 text-[11px] text-gray-400 leading-relaxed">
        Heuristic: paragraphs with bold formatting and pointSize ≥ 14 are
        treated as headings. Scroll target is weighted by character count.
      </footer>
    </aside>
  );
}
