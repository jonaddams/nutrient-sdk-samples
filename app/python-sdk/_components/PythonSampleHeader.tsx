import { PageHeader } from "@/app/_components/PageHeader";

interface PythonSampleHeaderProps {
  title: string;
  description?: string;
}

export function PythonSampleHeader({ title, description }: PythonSampleHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Python SDK", href: "/python-sdk" },
      ]}
    />
  );
}
