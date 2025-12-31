import { PageHeader } from "@/app/_components/PageHeader";

interface SampleHeaderProps {
  title: string;
  description?: string;
}

export function SampleHeader({ title, description }: SampleHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Web SDK", href: "/web-sdk" },
      ]}
    />
  );
}
