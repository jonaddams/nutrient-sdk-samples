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
              "w-full text-left rounded-lg border px-3 py-2.5 transition-colors " +
              (isSelected
                ? "border-[var(--digital-pollen)] bg-[color-mix(in_srgb,var(--digital-pollen)_8%,transparent)]"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900") +
              (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
            }
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex-shrink-0">
                <span
                  className={
                    "inline-block w-3.5 h-3.5 rounded-full border-2 " +
                    (isSelected
                      ? "border-[var(--digital-pollen)] bg-[var(--digital-pollen)]"
                      : "border-gray-400 dark:border-gray-500")
                  }
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {s.label}
                </div>
                {s.subtitle && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
