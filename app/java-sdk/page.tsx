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
    path: "/java-sdk/office-to-pdf",
  },
  {
    name: "Markdown to PDF",
    category: "Conversion",
    description: "Convert Markdown documents to PDF format",
    path: "/java-sdk/md-to-pdf",
  },
  // HTML-to-PDF hidden — SDK's native HTML renderer crashes on Linux (NullReferenceException in ExportAsPdfStringNative)
  // {
  //   name: "HTML to PDF",
  //   category: "Conversion",
  //   description: "Convert HTML documents to PDF format",
  //   path: "/java-sdk/html-to-pdf",
  // },
  {
    name: "PDF to HTML",
    category: "Conversion",
    description: "Convert PDF documents to HTML for web display",
    path: "/java-sdk/pdf-to-html",
  },
  {
    name: "PDF to Office",
    category: "Conversion",
    description: "Convert PDF documents to Word and Excel formats",
    path: "/java-sdk/pdf-to-office",
  },
  {
    name: "Digital Signature",
    category: "Signatures",
    description: "Apply digital signatures to PDF documents with certificates",
    path: "/java-sdk/digital-signature",
  },
  // OCR and ICR extraction samples hidden until VlmEnhancedIcr ships in a future SDK release
  // {
  //   name: "OCR Text Extraction",
  //   category: "Extraction",
  //   description: "Extract text from scanned documents using OCR",
  //   path: "/java-sdk/ocr-extraction",
  // },
  // {
  //   name: "ICR Data Extraction",
  //   category: "Extraction",
  //   description:
  //     "Extract structured data from handwritten forms using intelligent content recognition",
  //   path: "/java-sdk/icr-extraction",
  // },
];

const categories = ["All", "Conversion", "Signatures"];

export default function JavaSDKPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredSamples =
    selectedCategory === "All"
      ? samples
      : samples.filter((sample) => sample.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Java SDK"
        breadcrumbs={[{ label: "Home", href: "/" }]}
        actions={
          <>
            <a
              href="https://www.nutrient.io/sdk/java/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Product Home
            </a>
            <a
              href="https://www.nutrient.io/guides/java/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Guides
            </a>
            <a
              href="https://github.com/jonaddams/java-spring-boot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
            >
              Backend API Repo
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
              href="https://github.com/jonaddams/java-spring-boot"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              Spring Boot backend
            </a>{" "}
            that uses the Nutrient Java SDK for document processing. The
            frontend handles file uploads and result display, while the backend
            performs the actual PDF conversions, signing, and other operations.
          </p>
        </div>

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
