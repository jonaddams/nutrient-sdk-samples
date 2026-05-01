import Link from "next/link";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  sticky?: boolean;
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [{ label: "Home", href: "/" }],
  actions,
  meta,
  sticky = false,
}: PageHeaderProps) {
  const trail = [...breadcrumbs, { label: title }];

  return (
    <section className="shell">
      <div
        className="page-head"
        style={sticky ? { position: "sticky", top: 0, zIndex: 40, background: "var(--bg)" } : undefined}
      >
        <div className="breadcrumb">
          {trail.map((crumb, i) => (
            <span
              key={`${crumb.label}-${i}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {i > 0 && <span className="sep">/</span>}
              {crumb.href ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--space-5)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 480px", minWidth: 0 }}>
            <h1 className="h1">{title}</h1>
            {description && <p className="lede" style={{ marginTop: "var(--space-3)" }}>{description}</p>}
          </div>
          {actions && (
            <div style={{ display: "flex", gap: "var(--space-3)", flexShrink: 0 }}>
              {actions}
            </div>
          )}
        </div>
        {meta && <div className="page-head-meta">{meta}</div>}
      </div>
    </section>
  );
}
