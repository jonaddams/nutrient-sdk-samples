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
