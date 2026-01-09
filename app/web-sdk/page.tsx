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
    name: "Document Search",
    category: "User Interface",
    description:
      "Search through PDF documents with context-aware results, instant highlighting, and automatic navigation to matches",
    path: "/web-sdk/search",
  },
  {
    name: "Custom Menu Interface",
    category: "User Interface",
    description:
      "A completely custom menu interface with custom toolbar, annotation tools, document comparison, and measurement capabilities",
    path: "/web-sdk/custom-menu",
  },
  {
    name: "Form Designer",
    category: "Forms",
    description:
      "Drag and drop form fields onto PDF documents with an intuitive form creator mode for building interactive forms",
    path: "/web-sdk/form-designer",
  },
  {
    name: "Patient Intake Forms",
    category: "Forms",
    description:
      "Digital patient check-in with smart form pre-population, progressive form completion, and HIPAA-compliant data handling",
    path: "/web-sdk/patient-intake",
  },
  {
    name: "Annotation State Management",
    category: "Annotations",
    description:
      "Save and restore annotation states locally with version control-like functionality for managing document changes",
    path: "/web-sdk/annotation-state",
  },
  {
    name: "Text Comparison",
    category: "Document Comparison",
    description:
      "Side-by-side PDF comparison with synchronized viewing and interactive change tracking",
    path: "/web-sdk/text-comparison",
  },
  {
    name: "Cross-Page Text Comparison",
    category: "Document Comparison",
    description:
      "Extract and compare full document text across page boundaries with visual diff highlighting and change navigation",
    path: "/web-sdk/text-comparison-cross-page",
  },
  {
    name: "Content Editing API",
    category: "Content Editor",
    description:
      "Advanced content editing with text detection, find & replace, and AI text generation",
    path: "/web-sdk/content-edit-api",
  },
  {
    name: "Document Markup Modes",
    category: "Document Conversion",
    description:
      "View Word documents with tracked changes and comments in different markup modes: no markup, original, simple markup, and all markup",
    path: "/web-sdk/document-markup",
  },
];

const categories = [
  "All",
  "User Interface",
  "Annotations",
  "Forms",
  "Signatures",
  "Document Editor",
  "Content Editor",
  "Redaction",
  "Document Comparison",
  "Document Conversion",
];

export default function WebSDKPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredSamples =
    selectedCategory === "All"
      ? samples
      : samples.filter((sample) => sample.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Web SDK"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/web/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/web/"
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
          {/* <h2 className="!mb-6">Available Samples</h2> */}

          {/* Category Filter */}
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
