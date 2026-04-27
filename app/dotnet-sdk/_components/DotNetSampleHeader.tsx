import { PageHeader } from "@/app/_components/PageHeader";

interface DotNetSampleHeaderProps {
  title: string;
  description?: string;
}

export function DotNetSampleHeader({
  title,
  description,
}: DotNetSampleHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: ".NET SDK", href: "/dotnet-sdk" },
      ]}
    />
  );
}
