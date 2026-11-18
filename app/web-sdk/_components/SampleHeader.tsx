import { PageHeader } from "@/app/_components/PageHeader";

export type Section = { label: string; href: string };

interface SampleHeaderProps {
  title: string;
  description?: string;
  /** Breadcrumb parent (default: Web SDK) */
  section?: Section;
}

export function SampleHeader({
  title,
  description,
  section = { label: "Web SDK", href: "/web-sdk" },
}: SampleHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[{ label: "Home", href: "/" }, section]}
    />
  );
}
