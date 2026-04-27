"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

type Sample = {
  name: string;
  category: string;
  description: string;
  path: string;
  wip?: boolean;
};

const samples: Sample[] = [
  {
    name: "Linearize",
    category: "File Optimization",
    description:
      "Optimize PDFs for fast web view, allowing the first page to render before the entire file downloads.",
    path: "/dotnet-sdk/linearize",
  },
  {
    name: "OCR",
    category: "Text Extraction",
    description:
      "Recognize text in scanned PDFs and images. Output a searchable PDF or extract the recognized text as plain text.",
    path: "/dotnet-sdk/ocr",
  },
  {
    name: "Optimize",
    category: "File Optimization",
    description:
      "Reduce PDF file size with MRC compression. Especially effective on scanned and image-heavy documents.",
    path: "/dotnet-sdk/optimize",
  },
];

const categories = ["All", "File Optimization", "Text Extraction"];

export default function DotNetSDKPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredSamples =
    selectedCategory === "All"
      ? samples
      : samples.filter((sample) => sample.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title=".NET SDK"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/dotnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/dotnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Guides
            </a>
            <a
              href="https://github.com/jonaddams/nutrient-dotnet-api"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-16">
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
                      {sample.wip && (
                        <span className="ml-2 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                          Work in Progress
                        </span>
                      )}
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
