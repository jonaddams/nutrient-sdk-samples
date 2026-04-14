import { PageHeader } from "@/app/_components/PageHeader";

interface JavaSampleHeaderProps {
  title: string;
  description?: string;
}

export function JavaSampleHeader({
  title,
  description,
}: JavaSampleHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Java SDK", href: "/java-sdk" },
      ]}
    />
  );
}
