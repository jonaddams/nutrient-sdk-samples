"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, type Breadcrumb } from "./PageHeader";

export interface Sample {
  name: string;
  category: string;
  description: string;
  path: string;
  wip?: boolean;
}

export interface SamplesIndexProps {
  title: string;
  description: string;
  samples: Sample[];
  categories?: string[];
  breadcrumbs?: Breadcrumb[];
  productHomeUrl?: string;
  guidesUrl?: string;
  /** Replace the default meta row entirely */
  meta?: React.ReactNode;
  /** Optional callout rendered between the header and the samples list */
  intro?: React.ReactNode;
}

export function SamplesIndex({
  title,
  description,
  samples,
  categories,
  breadcrumbs = [{ label: "Home", href: "/" }],
  productHomeUrl,
  guidesUrl,
  meta,
  intro,
}: SamplesIndexProps) {
  const [active, setActive] = useState("All");

  const cats = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>();
    for (const s of samples) set.add(s.category);
    return ["All", ...Array.from(set).sort()];
  }, [categories, samples]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: samples.length };
    for (const s of samples) m[s.category] = (m[s.category] || 0) + 1;
    return m;
  }, [samples]);

  const filtered = useMemo(
    () =>
      active === "All" ? samples : samples.filter((s) => s.category === active),
    [active, samples],
  );

  const showFilter = cats.length > 1;
  const defaultMeta = (
    <>
      <span>
        <strong>{samples.length}</strong>{" "}
        {samples.length === 1 ? "sample" : "samples"}
      </span>
      {showFilter && (
        <span>
          <strong>{cats.length - 1}</strong>{" "}
          {cats.length - 1 === 1 ? "category" : "categories"}
        </span>
      )}
      {productHomeUrl && (
        <span>
          <a href={productHomeUrl} target="_blank" rel="noopener noreferrer">
            Product home →
          </a>
        </span>
      )}
      {guidesUrl && (
        <span>
          <a href={guidesUrl} target="_blank" rel="noopener noreferrer">
            Guides →
          </a>
        </span>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        meta={meta ?? defaultMeta}
      />

      <section className="shell">
        {intro && <div style={{ paddingTop: "var(--space-6)" }}>{intro}</div>}
        {showFilter && (
          <div className="filter-bar">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={active === c}
                onClick={() => setActive(c)}
              >
                {c}
                <span className="count">{counts[c] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        <div className="samples-list" style={!showFilter ? { marginTop: "var(--space-6)" } : undefined}>
          {filtered.map((s, i) => (
            <Link key={s.path} href={s.path}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <div className="body">
                <h3>
                  {s.name}
                  {s.wip && (
                    <span className="tag wip" style={{ marginLeft: 6 }}>
                      WIP
                    </span>
                  )}
                </h3>
                <p>{s.description}</p>
              </div>
              <div className="meta">
                <span>{s.category}</span>
                <span className="sample-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
