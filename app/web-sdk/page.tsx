"use client";

import Link from "next/link";
import { useState } from "react";

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
    name: "Patient Intake Forms",
    category: "Forms",
    description:
      "Digital patient check-in with smart form pre-population, progressive form completion, and HIPAA-compliant data handling",
    path: "/web-sdk/patient-intake",
  },
  {
    name: "Text Comparison",
    category: "Document Comparison",
    description:
      "Side-by-side PDF comparison with synchronized viewing and interactive change tracking",
    path: "/web-sdk/text-comparison",
  },
  {
    name: "Content Editing API",
    category: "Content Editor",
    description:
      "Advanced content editing with text detection, find & replace, and AI text generation",
    path: "/web-sdk/content-edit-api",
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
];

export default function WebSDKPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredSamples =
    selectedCategory === "All"
      ? samples
      : samples.filter((sample) => sample.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      {/* Header */}
      <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 mb-2">
            ← Back to Home
          </Link>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="!mb-0">Web SDK Samples</h1>
            <div className="flex gap-3 mb-1">
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
            </div>
          </div>
        </div>
      </header>

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
