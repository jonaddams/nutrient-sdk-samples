"use client";

import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";

type Sample = {
  name: string;
  category: string;
  description: string;
  path: string;
};

const samples: Sample[] = [
  {
    name: "Document Generator",
    category: "Templates",
    description:
      "Create professional documents from templates using an intuitive wizard interface with template selection, visual customization, and data integration",
    path: "/document-authoring-sdk/document-generator",
  },
  {
    name: "Document Builder",
    category: "Programmatic API",
    description:
      "Build documents programmatically from form data using the transaction() API with live preview",
    path: "/document-authoring-sdk/document-builder",
  },
  {
    name: "Template Variables",
    category: "Templates",
    description:
      "Insert template variables from a browsable sidebar instead of typing them manually, with search, categories, and sample data preview",
    path: "/document-authoring-sdk/template-variables",
  },
  {
    name: "Click-to-Scroll Outline",
    category: "Navigation",
    description:
      "Sidebar outline derived from the document model that jumps to a heading on click. Approximate (the SDK has no public scroll-to API) — see in-page notes",
    path: "/document-authoring-sdk/click-to-scroll",
  },
];

export default function DocumentAuthoringSdkSamplesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Document Authoring SDK"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/document-authoring/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/document-authoring-sdk/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Guides
            </a>
            <a
              href="https://github.com/jonaddams/nutrient-sdk-samples"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Source
            </a>
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-16">
          {/* Samples Table */}
          <div className="nutrient-table-container">
            <table className="nutrient-table">
              <thead>
                <tr>
                  <th className="nutrient-th nutrient-th-title">Name</th>
                  <th className="nutrient-th nutrient-th-title">Category</th>
                  <th className="nutrient-th nutrient-th-title">Description</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((sample) => (
                  <tr key={sample.path}>
                    <td className="nutrient-td nutrient-td-bold">
                      <Link
                        href={sample.path}
                        className="hover:opacity-70 transition-opacity"
                      >
                        {sample.name}
                      </Link>
                    </td>
                    <td className="nutrient-td">{sample.category}</td>
                    <td className="nutrient-td">{sample.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
