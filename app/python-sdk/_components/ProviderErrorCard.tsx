"use client";

import { PROVIDER_LABELS, type Provider } from "./providers";

export interface ProviderErrorCardProps {
  provider: Provider;
  message: string;
}

/** Fills a result-panel slot when one provider's request failed. */
export function ProviderErrorCard({
  provider,
  message,
}: ProviderErrorCardProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-2 bg-[var(--surface)] border-b border-[var(--line)] flex-shrink-0">
        <h3 className="text-sm font-semibold text-[var(--ink-2)]">
          {PROVIDER_LABELS[provider]}
        </h3>
      </div>
      <div className="flex-1 overflow-auto bg-[var(--bg-elev)] p-4">
        <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs whitespace-pre-wrap">
          {PROVIDER_LABELS[provider]} request failed: {message.slice(0, 300)}
        </div>
      </div>
    </div>
  );
}
