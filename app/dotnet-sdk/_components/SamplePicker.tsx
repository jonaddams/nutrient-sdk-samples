"use client";

export interface SampleOption {
  id: string;
  label: string;
  subtitle?: string;
  url: string; // path under /public, served by Next.js
}

export function SamplePicker({
  samples,
  selectedId,
  onSelect,
  disabled,
}: {
  samples: SampleOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {samples.map((s) => {
        const isSelected = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            disabled={disabled}
            className={
              "w-full text-left px-3 py-2.5 transition-colors " +
              (disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer")
            }
            style={{
              border: `1px solid ${isSelected ? "var(--accent)" : "var(--line)"}`,
              background: isSelected ? "var(--accent-tint)" : "transparent",
              borderRadius: "var(--r-2)",
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !disabled) {
                e.currentTarget.style.background = "var(--accent-tint)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !disabled) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                <span
                  className="inline-block w-3.5 h-3.5"
                  style={{
                    borderRadius: "var(--r-pill)",
                    border: `2px solid ${
                      isSelected ? "var(--accent)" : "var(--ink-4)"
                    }`,
                    background: isSelected ? "var(--accent)" : "transparent",
                  }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--ink)" }}
                >
                  {s.label}
                </div>
                {s.subtitle && (
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {s.subtitle}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
