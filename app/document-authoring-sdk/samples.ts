import type { Sample } from "@/app/_components/SamplesIndex";

/**
 * The document authoring sdk sample registry.
 *
 * Split out of page.tsx on 2026-08-06 so app/page.tsx can DERIVE its headline
 * counts from this array instead of a hand-written string. The landing page used
 * to store each count inside prose (`foot: "33 samples"`) and regex the total
 * back out of it, so nothing failed when they drifted — they had reached 57
 * claimed against 76 actual.
 *
 * Pure data, and the only import is a TYPE, so importing this costs nothing at
 * runtime and pulls no page code into whatever imports it.
 */
export const samples: Sample[] = [
  {
    name: "Document Generator",
    category: "Templates",
    description:
      "Create professional documents from templates using an intuitive wizard interface with template selection, visual customization, and data integration",
    path: "/document-authoring-sdk/document-generator",
  },
  {
    name: "Template Variables",
    category: "Templates",
    description:
      "Insert template variables from a browsable sidebar instead of typing them manually, with search, categories, and sample data preview",
    path: "/document-authoring-sdk/template-variables",
  },
  {
    name: "Document Builder",
    category: "Programmatic API",
    description:
      "Build documents programmatically from form data using the transaction() API with live preview",
    path: "/document-authoring-sdk/document-builder",
  },
  {
    name: "Click-to-Scroll Outline",
    category: "Navigation",
    description:
      "Sidebar outline derived from the document model that jumps to a heading on click. Approximate (the SDK has no public scroll-to API) — see in-page notes",
    path: "/document-authoring-sdk/click-to-scroll",
  },
];
