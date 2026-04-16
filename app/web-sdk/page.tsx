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
    name: "Annotation Permissions",
    category: "Annotations",
    description:
      "Role-based annotation permissions with a teacher/student classroom model — toggle visibility per student",
    path: "/web-sdk/annotation-permissions",
  },
  {
    name: "Annotation Presets",
    category: "Annotations",
    description:
      "Customize default properties for annotation tools including colors, sizes, fonts, and line styles with live preview",
    path: "/web-sdk/annotation-presets",
  },
  {
    name: "Annotation State Management",
    category: "Annotations",
    description:
      "Save and restore annotation states locally with version control-like functionality for managing document changes",
    path: "/web-sdk/annotation-state",
  },
  {
    name: "Bookmark & Outline Navigation",
    category: "User Interface",
    description:
      "Browse the document's table of contents and bookmarks in a custom sidebar with click-to-navigate",
    path: "/web-sdk/bookmark-navigation",
  },
  {
    name: "Brightness & Contrast",
    category: "User Interface",
    description:
      "Bidirectional slider to brighten dark or poorly-scanned documents, or enable night mode for comfortable dark reading",
    path: "/web-sdk/brightness-contrast",
  },
  {
    name: "Collaboration Comments",
    category: "Annotations",
    description:
      "Threaded comment replies with author tracking, @mentions, and configurable display modes (Fitting, Floating, Popover)",
    path: "/web-sdk/collaboration-comments",
  },
  {
    name: "Content Editing API",
    category: "Content Editor",
    description:
      "Advanced content editing with text detection, find & replace, and AI text generation",
    path: "/web-sdk/content-edit-api",
  },
  {
    name: "Counting Annotations",
    category: "Annotations",
    description:
      "Click anywhere on a document to place numbered markers using custom-rendered annotations with a sidebar tracker",
    path: "/web-sdk/counting-annotations",
  },
  {
    name: "Cross-Page Text Comparison",
    category: "Document Comparison",
    description:
      "Extract and compare full document text across page boundaries with visual diff highlighting and change navigation",
    path: "/web-sdk/text-comparison-cross-page",
  },
  {
    name: "Custom Menu Interface",
    category: "User Interface",
    description:
      "A completely custom menu interface with custom toolbar, annotation tools, document comparison, and measurement capabilities",
    path: "/web-sdk/custom-menu",
  },
  {
    name: "Custom Renderers",
    category: "Annotations",
    description:
      "Creative custom annotation renderers showcasing visual effects, animations, interactive widgets, and more",
    path: "/web-sdk/custom-renderers",
  },
  {
    name: "Custom UI Form Creator",
    category: "Forms",
    description:
      "Build custom form builder UI by hiding SDK defaults and replacing with your own components",
    path: "/web-sdk/custom-ui-form-creator",
  },
  {
    name: "Document Assembly",
    category: "Document Editor",
    description:
      "Assemble documents by dragging pages between two panels with multi-select, reorder, rotate, duplicate, delete, upload, and export",
    path: "/web-sdk/document-assembly",
    wip: true,
  },
  {
    name: "Document Loading Methods",
    category: "User Interface",
    description:
      "Demonstrate all supported document loading methods: URL, ArrayBuffer, Blob, and Base64. Includes file upload with method selection",
    path: "/web-sdk/document-loading",
  },
  {
    name: "Document Markup Modes",
    category: "Document Conversion",
    description:
      "View Word documents with tracked changes and comments in different markup modes: no markup, original, simple markup, and all markup",
    path: "/web-sdk/document-markup",
  },
  {
    name: "Document Search",
    category: "User Interface",
    description:
      "Search through PDF documents with context-aware results, instant highlighting, and automatic navigation to matches",
    path: "/web-sdk/search",
  },
  {
    name: "Form Data Pre-Fill",
    category: "Forms",
    description:
      "Programmatically populate PDF form fields from JSON data presets with editable field values and apply/clear controls",
    path: "/web-sdk/form-prefill",
  },
  {
    name: "Form Designer",
    category: "Forms",
    description:
      "Drag and drop form fields onto PDF documents with an intuitive form creator mode for building interactive forms",
    path: "/web-sdk/form-designer",
  },
  {
    name: "Form Validation",
    category: "Forms",
    description:
      "Client-side validation rules with visual feedback on PDF form fields using a declarative rule engine",
    path: "/web-sdk/form-validation",
  },
  {
    name: "Grouped Form Fields",
    category: "Forms",
    description:
      "Drag and drop grouped form fields with image backgrounds, company logos, checkboxes, signatures, and date fields. Moving or deleting any element affects the entire group.",
    path: "/web-sdk/grouped-form-fields",
  },
  {
    name: "Keyword Highlight",
    category: "Annotations",
    description:
      "Automatically search and highlight configurable keywords in a document with color-coded annotations",
    path: "/web-sdk/keyword-highlight",
  },
  {
    name: "Layer Management",
    category: "User Interface",
    description:
      "Toggle PDF layer groups (OCGs) to show or hide building systems on a construction floor plan with quick presets",
    path: "/web-sdk/layer-management",
  },
  {
    name: "Multi-Document Tabs",
    category: "User Interface",
    description:
      "View multiple PDF documents in a tabbed interface with page position memory, closeable tabs, and file upload",
    path: "/web-sdk/multi-document-tabs",
  },
  {
    name: "Night Mode",
    category: "User Interface",
    description:
      "Toggle night mode in the PDF viewer with a custom toolbar button using CSS filter inversion",
    path: "/web-sdk/night-mode",
  },
  {
    name: "Patient Intake Forms",
    category: "Forms",
    description:
      "Digital patient check-in with smart form pre-population, progressive form completion, and HIPAA-compliant data handling",
    path: "/web-sdk/patient-intake",
  },
  {
    name: "QA Checklist Sidebar",
    category: "User Interface",
    description:
      "Custom sidebar with categorized QA checklist, severity badges on comments, and click-to-navigate — built with the slot UI customization API",
    path: "/web-sdk/qa-checklist-sidebar",
  },
  {
    name: "Simple Signing Demo",
    category: "Signatures",
    description:
      "Complete signature workflow with drag-and-drop field placement, electronic signatures, role-based permissions, signature flattening, and digital signatures via DWS API",
    path: "/web-sdk/simple-signing-demo",
  },
  {
    name: "Text Comparison",
    category: "Document Comparison",
    description:
      "Side-by-side PDF comparison with synchronized viewing and interactive change tracking",
    path: "/web-sdk/text-comparison",
  },
  {
    name: "Text Extraction",
    category: "Content",
    description:
      "Extract text from PDF pages with current-page or full-document view, copy to clipboard, and download as plain text",
    path: "/web-sdk/text-extraction",
  },
  {
    name: "Watermark",
    category: "Document Editor",
    description:
      "Add configurable text watermarks to every page with customizable text, font size, color, opacity, and rotation",
    path: "/web-sdk/watermark",
  },
  {
    name: "Zoom Level Display",
    category: "User Interface",
    description:
      "Display the current zoom level as a percentage in a custom toolbar button with click-to-reset functionality",
    path: "/web-sdk/zoom-level-display",
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
