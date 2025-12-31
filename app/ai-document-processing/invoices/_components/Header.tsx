import { PageHeader } from "@/app/_components/PageHeader";

export default function Header() {
  return (
    <PageHeader
      title="Invoice Management"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "AI Document Processing", href: "/ai-document-processing" },
      ]}
      sticky={true}
    />
  );
}
