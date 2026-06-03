"use client";

import type { ProviderMode } from "./providers";

const MODES: { value: ProviderMode; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "openai", label: "OpenAI" },
  { value: "both", label: "Both" },
];

export interface ProviderToggleProps {
  value: ProviderMode;
  onChange: (mode: ProviderMode) => void;
  disabled?: boolean;
}

/** Segmented Claude / OpenAI / Both control shared by the VLM demo pages. */
export function ProviderToggle({
  value,
  onChange,
  disabled,
}: ProviderToggleProps) {
  return (
    <fieldset className="border-0 p-0 m-0 min-w-0">
      <legend className="block text-xs font-medium text-[var(--ink-3)] mb-1">
        VLM provider
      </legend>
      <div className="flex rounded-md border border-[var(--line-strong)] overflow-hidden">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            disabled={disabled}
            aria-pressed={value === m.value}
            className={`flex-1 px-2.5 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              value === m.value
                ? "bg-[var(--surface)] text-[var(--ink)]"
                : "text-[var(--ink-3)] hover:bg-[var(--surface)]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
