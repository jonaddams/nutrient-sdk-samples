"use client";
import type { ReactNode } from "react";

// A titled block in the studio panel: uppercase eyebrow, divider, content.
// Mirrors the DWS Studio grammar (SCHEMA BUILDER / EXTRACTION RULES / …).
export function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <section> with an accessible name maps to ARIA role "region", not "group" — PanelSection.test.tsx asserts role="group" (this panel groups related controls, not a landmark region), so the explicit role is required to get the correct semantics.
    <section className="studio-sec" role="group" aria-label={title}>
      <div className="eyebrow studio-sec-title">{title}</div>
      {children}
    </section>
  );
}
