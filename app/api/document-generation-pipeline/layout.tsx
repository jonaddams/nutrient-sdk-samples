// app/api/document-generation-pipeline/layout.tsx
// Force-dynamic prevents static prerendering for this route.
// Required because template.ts (a shared server+client module with function
// exports) in this directory triggers a Turbopack RSC serialization error
// during static generation in Next.js 16.
export const dynamic = "force-dynamic";

export default function DocumentGenerationPipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
