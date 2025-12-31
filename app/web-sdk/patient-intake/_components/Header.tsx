import { PageHeader } from "@/app/_components/PageHeader";

export default function Header() {
  return (
    <PageHeader
      title="Patient Intake Forms"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Web SDK", href: "/web-sdk" },
      ]}
      sticky={true}
    />
  );
}
