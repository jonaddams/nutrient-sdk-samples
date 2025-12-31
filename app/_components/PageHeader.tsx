import { ChevronRight } from "lucide-react";
import Link from "next/link";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  /**
   * Page title displayed as h1
   */
  title: string;

  /**
   * Optional description/subtitle
   */
  description?: string;

  /**
   * Breadcrumb trail. Last item is automatically the current page.
   * Example: [{ label: "Home", href: "/" }, { label: "Web SDK", href: "/web-sdk" }]
   */
  breadcrumbs?: Breadcrumb[];

  /**
   * Optional external action buttons (Product Home, Guides, etc.)
   */
  actions?: React.ReactNode;

  /**
   * Whether to make the header sticky
   */
  sticky?: boolean;
}

/**
 * Unified page header component with breadcrumb navigation
 *
 * Follows Nutrient brand guidelines with consistent spacing, typography, and colors.
 * Provides flexible breadcrumb navigation for all page types.
 *
 * @example
 * // Simple page with breadcrumb
 * <PageHeader
 *   title="Web SDK"
 *   breadcrumbs={[{ label: "Home", href: "/" }]}
 * />
 *
 * @example
 * // Deep page with full breadcrumb trail
 * <PageHeader
 *   title="Annotation State Management"
 *   description="Save and restore annotation states"
 *   breadcrumbs={[
 *     { label: "Home", href: "/" },
 *     { label: "Web SDK", href: "/web-sdk" }
 *   ]}
 * />
 *
 * @example
 * // Page with external actions
 * <PageHeader
 *   title="AI Document Processing"
 *   breadcrumbs={[{ label: "Home", href: "/" }]}
 *   actions={
 *     <>
 *       <a href="..." className="btn btn-sm btn-secondary">Product Home</a>
 *       <a href="..." className="btn btn-sm btn-secondary">Guides</a>
 *     </>
 *   }
 * />
 */
export function PageHeader({
  title,
  description,
  breadcrumbs = [{ label: "Home", href: "/" }],
  actions,
  sticky = false,
}: PageHeaderProps) {
  const headerClasses = `border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414] ${
    sticky ? "sticky top-0 z-50 backdrop-blur-sm" : ""
  }`;

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm mb-2">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--warm-gray-600)]">{crumb.label}</span>
              )}
            </div>
          ))}
          {/* Current page */}
          <ChevronRight className="w-4 h-4" />
          <span className="text-[var(--warm-gray-600)]">{title}</span>
        </nav>

        {/* Title and Actions */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="!mb-0">{title}</h1>
            {description && (
              <p className="text-[var(--warm-gray-600)] mt-2">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-3 mb-1">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
