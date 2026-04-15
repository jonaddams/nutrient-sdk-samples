"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

type Sample = {
  name: string;
  category: string;
  description: string;
  path: string;
};

const samples: Sample[] = [
  {
    name: "Office to PDF",
    category: "Conversion",
    description: "Convert Word, Excel, and PowerPoint documents to PDF format",
    path: "/python-sdk/office-to-pdf",
  },
  {
    name: "Markdown to PDF",
    category: "Conversion",
    description: "Convert Markdown documents to PDF format",
    path: "/python-sdk/md-to-pdf",
  },
  {
    name: "PDF to HTML",
    category: "Conversion",
    description: "Convert PDF documents to HTML for web display",
    path: "/python-sdk/pdf-to-html",
  },
  {
    name: "PDF to Office",
    category: "Conversion",
    description: "Convert PDF documents to Word and Excel formats",
    path: "/python-sdk/pdf-to-office",
  },
  {
    name: "Digital Signature",
    category: "Signatures",
    description: "Apply digital signatures to PDF documents with certificates",
    path: "/python-sdk/digital-signature",
  },
  {
    name: "PDF Redaction",
    category: "Editor",
    description: "Permanently remove sensitive content from PDF documents",
    path: "/python-sdk/redaction",
  },
  {
    name: "PDF Form Fill",
    category: "Forms",
    description:
      "Programmatically fill PDF form fields with data and generate a filled PDF",
    path: "/python-sdk/form-fill",
  },
  {
    name: "Word Template Generation",
    category: "Templates",
    description:
      "Generate PDF documents from Word templates populated with JSON data",
    path: "/python-sdk/word-template",
  },
];

const categories = [
  "All",
  "Conversion",
  "Editor",
  "Signatures",
  "Forms",
  "Templates",
];

export default function PythonSDKPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredSamples =
    selectedCategory === "All"
      ? samples
      : samples.filter((sample) => sample.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Python SDK"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/python/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/python/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Guides
            </a>
            <a
              href="https://github.com/jonaddams/python-fast-api"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Backend API Repo
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
          <h2 className="text-lg font-semibold mb-2">How These Samples Work</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            This Next.js frontend sends requests to a{" "}
            <a
              href="https://github.com/jonaddams/python-fast-api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              FastAPI backend
            </a>{" "}
            that uses the Nutrient Python SDK for document processing. The
            frontend handles file uploads and result display, while the backend
            performs the actual PDF conversions, signing, redaction, and other
            operations.
          </p>
        </div>

        <div className="mb-16">
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`btn btn-sm ${
                  selectedCategory === category
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

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
                {filteredSamples.map((sample) => (
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
