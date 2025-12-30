"use client";

export default function StyleGuide() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-16">
        <h1 className="!mb-4">Nutrient Design System</h1>
        <p className="text-xl !mb-6">
          Official design tokens, typography, colors, and components used
          throughout Nutrient products.
        </p>

        {/* Navigation Links */}
        <nav className="flex flex-wrap gap-4 p-6 bg-white dark:bg-[#1a1414] rounded-lg border border-[var(--warm-gray-400)]">
          <a href="#colors" className="hover:opacity-70 transition-opacity">
            Colors
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#typography" className="hover:opacity-70 transition-opacity">
            Typography
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#buttons" className="hover:opacity-70 transition-opacity">
            Buttons
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#spacing" className="hover:opacity-70 transition-opacity">
            Spacing
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#radius" className="hover:opacity-70 transition-opacity">
            Border Radius
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#lists" className="hover:opacity-70 transition-opacity">
            Lists
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#tables" className="hover:opacity-70 transition-opacity">
            Tables
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#badges" className="hover:opacity-70 transition-opacity">
            Badges
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#tags" className="hover:opacity-70 transition-opacity">
            Tags
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#alerts" className="hover:opacity-70 transition-opacity">
            Alerts
          </a>
          <span className="text-[var(--warm-gray-400)]">•</span>
          <a href="#code" className="hover:opacity-70 transition-opacity">
            Code
          </a>
        </nav>
      </div>

      {/* Colors Section */}
      <section id="colors" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Colors
        </h2>

        <div className="space-y-12">
          {/* Brand Colors */}
          <div>
            <h3 className="mb-6">Brand Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: "var(--disc-pink)" }}
                ></div>
                <p className="font-semibold">Disc Pink</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(317, 50%, 74%, 1)
                </p>
              </div>
              <div>
                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: "var(--code-coral)" }}
                ></div>
                <p className="font-semibold">Code Coral</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(9, 87%, 61%, 1)
                </p>
              </div>
              <div>
                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: "var(--data-green)" }}
                ></div>
                <p className="font-semibold">Data Green</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(129, 32%, 57%, 1)
                </p>
              </div>
              <div>
                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: "var(--digital-pollen)" }}
                ></div>
                <p className="font-semibold">Digital Pollen</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(43, 82%, 67%, 1)
                </p>
              </div>
            </div>
          </div>

          {/* Neutral Colors */}
          <div>
            <h3 className="mb-6">Neutral Colors (Warm Gray Scale)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div
                  className="h-24 rounded-lg mb-3 border border-[var(--warm-gray-400)]"
                  style={{ backgroundColor: "var(--black)" }}
                ></div>
                <p className="font-semibold">Black</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(0, 13%, 9%, 1)
                </p>
              </div>
              <div>
                <div
                  className="h-24 rounded-lg mb-3 border border-[var(--warm-gray-400)]"
                  style={{ backgroundColor: "var(--warm-gray-100)" }}
                ></div>
                <p className="font-semibold">Warm Gray 100</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(30, 20%, 92%, 1)
                </p>
              </div>
              <div>
                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: "var(--warm-gray-400)" }}
                ></div>
                <p className="font-semibold">Warm Gray 400</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(30, 14%, 72%, 1)
                </p>
              </div>
              <div>
                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: "var(--warm-gray-800)" }}
                ></div>
                <p className="font-semibold">Warm Gray 800</p>
                <p className="text-sm font-mono opacity-60">
                  hsla(30, 16%, 35%, 1)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section id="typography" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Typography
        </h2>

        <div className="space-y-12">
          {/* Font Families */}
          <div>
            <h3 className="mb-6">Font Families</h3>
            <div className="space-y-4">
              <div>
                <p className="text-2xl mb-2">ABC Monument Grotesk</p>
                <p className="text-sm font-mono opacity-60">
                  Primary sans-serif font for headings and body text
                </p>
              </div>
              <div>
                <p className="text-2xl mb-2 font-mono">
                  ABC Monument Grotesk Mono
                </p>
                <p className="text-sm font-mono opacity-60">
                  Monospace font for code, labels, and UI elements
                </p>
              </div>
            </div>
          </div>

          {/* Headings */}
          <div>
            <h3 className="mb-6">Headings</h3>
            <div className="space-y-6">
              <div>
                <h1>Heading 1</h1>
                <p className="text-sm font-mono opacity-60 mt-2">
                  2.5rem (40px) | font-weight: 700
                </p>
              </div>
              <div>
                <h2>Heading 2</h2>
                <p className="text-sm font-mono opacity-60 mt-2">
                  2rem (32px) | font-weight: 700
                </p>
              </div>
              <div>
                <h3>Heading 3</h3>
                <p className="text-sm font-mono opacity-60 mt-2">
                  1.5rem (24px) | font-weight: 600
                </p>
              </div>
              <div>
                <h4>Heading 4</h4>
                <p className="text-sm font-mono opacity-60 mt-2">
                  1.25rem (20px) | font-weight: 600
                </p>
              </div>
              <div>
                <h5>Heading 5</h5>
                <p className="text-sm font-mono opacity-60 mt-2">
                  1.125rem (18px) | font-weight: 600
                </p>
              </div>
              <div>
                <h6>Heading 6</h6>
                <p className="text-sm font-mono opacity-60 mt-2">
                  1rem (16px) | font-weight: 600
                </p>
              </div>
            </div>
          </div>

          {/* Body Text */}
          <div>
            <h3 className="mb-6">Body Text</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xl">
                  Large body text - Used for lead paragraphs and introductions.
                </p>
                <p className="text-sm font-mono opacity-60 mt-2">
                  1.25rem (20px) | line-height: 1.75
                </p>
              </div>
              <div>
                <p>
                  Regular body text - The standard paragraph text used
                  throughout the site for optimal readability.
                </p>
                <p className="text-sm font-mono opacity-60 mt-2">
                  1rem (16px) | line-height: 1.75
                </p>
              </div>
              <div>
                <p className="text-sm">
                  Small text - Used for captions, footnotes, and supplementary
                  information.
                </p>
                <p className="text-sm font-mono opacity-60 mt-2">
                  0.875rem (14px) | line-height: 1.5
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section id="buttons" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Buttons
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="!mb-4">SDK Page Buttons (Digital Pollen)</h3>
            <div className="flex flex-wrap gap-4 mb-8">
              <button type="button" className="btn btn-yellow-outline">
                Try For Free
              </button>
              <button type="button" className="btn btn-yellow">
                Contact Sales
              </button>
            </div>
          </div>

          <div>
            <h3 className="!mb-4">Other Button Styles</h3>
            <div className="flex flex-wrap gap-4 mb-8">
              <button type="button" className="btn btn-gray">
                Gray
              </button>
              <button type="button" className="btn btn-green">
                Green
              </button>
              <button type="button" className="btn btn-primary">
                Black (Primary)
              </button>
              <button type="button" className="btn btn-secondary">
                Black Outline
              </button>
            </div>
          </div>

          <div>
            <h3 className="!mb-6">Button Specifications</h3>
            <ul className="space-y-2 font-mono text-sm list-disc pl-6">
              <li>Font: ABC Monument Grotesk Mono</li>
              <li>Size: 0.75rem (12px)</li>
              <li>Weight: 400</li>
              <li>Transform: Uppercase</li>
              <li>Letter Spacing: 0.24px</li>
              <li>Padding: 0.75rem 1.5rem (12px 24px)</li>
              <li>Min Height: 2.5rem (40px)</li>
              <li>Border Radius: 0.5rem (8px)</li>
              <li>Hover: opacity 0.7</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Spacing Section */}
      <section id="spacing" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Spacing Scale
        </h2>

        <div className="space-y-4">
          {[
            { name: "4xs", value: "0.125rem", px: "2px" },
            { name: "3xs", value: "0.25rem", px: "4px" },
            { name: "2xs", value: "0.5rem", px: "8px" },
            { name: "xs", value: "0.75rem", px: "12px" },
            { name: "sm", value: "1rem", px: "16px" },
            { name: "md", value: "1.25rem", px: "20px" },
            { name: "lg", value: "1.5rem", px: "24px" },
            { name: "xl", value: "2rem", px: "32px" },
            { name: "2xl", value: "2.5rem", px: "40px" },
            { name: "3xl", value: "3rem", px: "48px" },
          ].map((spacing) => (
            <div key={spacing.name} className="flex items-center gap-4">
              <div className="w-32 text-sm font-mono">
                {spacing.name} ({spacing.px})
              </div>
              <div
                className="h-8 bg-[var(--black)] border border-[var(--warm-gray-400)]"
                style={{ width: spacing.value }}
              ></div>
            </div>
          ))}
        </div>
      </section>

      {/* Border Radius Section */}
      <section id="radius" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Border Radius Scale
        </h2>

        <div className="flex flex-wrap gap-8">
          {[
            { name: "xxs", value: "0.25rem", px: "4px" },
            { name: "xs", value: "0.5rem", px: "8px" },
            { name: "sm", value: "0.75rem", px: "12px" },
            { name: "md", value: "1rem", px: "16px" },
            { name: "lg", value: "1.25rem", px: "20px" },
            { name: "xl", value: "1.5rem", px: "24px" },
            { name: "2xl", value: "2rem", px: "32px" },
          ].map((radius) => (
            <div key={radius.name} className="text-center">
              <div
                className="w-24 h-24 bg-[var(--black)] mb-3 border border-[var(--warm-gray-400)]"
                style={{ borderRadius: radius.value }}
              ></div>
              <p className="text-sm font-mono">
                {radius.name} ({radius.px})
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Lists Section */}
      <section id="lists" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Lists
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="mb-4">Unordered List</h3>
            <ul className="list-disc">
              <li>Document processing and manipulation</li>
              <li>PDF viewing and annotation</li>
              <li>Digital signatures and forms</li>
              <li>Cloud-based document services</li>
              <li>Cross-platform SDK support</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4">Ordered List</h3>
            <ol className="list-decimal">
              <li>Initialize the SDK in your application</li>
              <li>Configure your license key</li>
              <li>Load a document into the viewer</li>
              <li>Customize UI and functionality</li>
              <li>Deploy to production</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Tables Section */}
      <section id="tables" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Tables
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="mb-4">Basic Table</h3>
            <p className="!mb-6 text-sm opacity-60">
              Tables display structured data in rows and columns with clean
              typography and subtle hover states. Based on the official Nutrient
              website design.
            </p>
            <div className="nutrient-table-container">
              <table className="nutrient-table">
                <thead>
                  <tr>
                    <th className="nutrient-th nutrient-th-title">Name</th>
                    <th className="nutrient-th nutrient-th-title">Category</th>
                    <th className="nutrient-th nutrient-th-title">Status</th>
                    <th className="nutrient-th nutrient-th-title">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="nutrient-td nutrient-td-bold">
                      Custom Toolbar
                    </td>
                    <td className="nutrient-td">User Interface</td>
                    <td className="nutrient-td">Available</td>
                    <td className="nutrient-td">
                      Demonstrates how to customize the toolbar with custom
                      buttons
                    </td>
                  </tr>
                  <tr>
                    <td className="nutrient-td nutrient-td-bold">
                      Highlight Annotations
                    </td>
                    <td className="nutrient-td">Annotations</td>
                    <td className="nutrient-td">Available</td>
                    <td className="nutrient-td">
                      Shows how to add and manage highlight annotations
                    </td>
                  </tr>
                  <tr>
                    <td className="nutrient-td nutrient-td-bold">
                      Form Filling
                    </td>
                    <td className="nutrient-td">Forms</td>
                    <td className="nutrient-td">Available</td>
                    <td className="nutrient-td">
                      Example of programmatically filling form fields
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="!mb-6">Table Specifications</h3>
            <ul className="space-y-2 font-mono text-sm list-disc pl-6">
              <li>Container: Full width with overflow-x-auto</li>
              <li>Min Width: 768px (responsive scrolling)</li>
              <li>Border Collapse: collapse</li>
              <li>Cell Padding: var(--spacing-xs) (0.75rem/12px)</li>
              <li>Header Background: Transparent</li>
              <li>Header Font: var(--font-mono)</li>
              <li>Header Font Size: 0.75rem (12px)</li>
              <li>Header Font Weight: 400</li>
              <li>Header Text Transform: Uppercase</li>
              <li>Header Letter Spacing: 0.24px</li>
              <li>
                Row Hover Background: var(--warm-gray-100) / dark:
                var(--warm-gray-950)
              </li>
              <li>Cell Border Bottom: 1px solid var(--warm-gray-400)</li>
              <li>Cell Font Size: 0.875rem (14px)</li>
              <li>Bold Cells: font-weight 600 for emphasis</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section id="badges" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Badges
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="mb-4">Badge Examples</h3>
            <p className="mb-6 text-sm opacity-60">
              Badges display small pieces of information like statuses, categories, or counts.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="nutrient-badge nutrient-badge-neutral">Neutral</span>
              <span className="nutrient-badge nutrient-badge-accent">Accent</span>
              <span className="nutrient-badge nutrient-badge-success">Success</span>
              <span className="nutrient-badge nutrient-badge-pink">Pink</span>
              <span className="nutrient-badge nutrient-badge-coral">Coral</span>
            </div>
          </div>

          <div>
            <h3 className="!mb-6">Badge Specifications</h3>
            <ul className="space-y-2 font-mono text-sm list-disc pl-6">
              <li>Font: var(--font-mono)</li>
              <li>Font Size: 0.75rem (12px)</li>
              <li>Font Weight: 400</li>
              <li>Text Transform: Uppercase</li>
              <li>Letter Spacing: 0.24px</li>
              <li>Padding: 0 var(--spacing-2xs)</li>
              <li>Min Height: 2rem (32px)</li>
              <li>Border Radius: var(--radius-xs) (0.5rem/8px)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tags Section */}
      <section id="tags" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Tags
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="mb-4">Tag Examples</h3>
            <p className="mb-6 text-sm opacity-60">
              Tags are used for labeling and categorization with rounded pill shapes.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="nutrient-tag">JavaScript</span>
              <span className="nutrient-tag">TypeScript</span>
              <span className="nutrient-tag">React</span>
              <span className="nutrient-tag">Next.js</span>
            </div>
          </div>

          <div>
            <h3 className="!mb-6">Tag Specifications</h3>
            <ul className="space-y-2 font-mono text-sm list-disc pl-6">
              <li>Font: var(--font-mono)</li>
              <li>Font Size: 0.75rem (12px)</li>
              <li>Font Weight: 400</li>
              <li>Text Transform: Uppercase</li>
              <li>Letter Spacing: 0.24px</li>
              <li>Padding: 0.25rem 0.75rem (4px 12px)</li>
              <li>Border Radius: 9999px (full rounded)</li>
              <li>Hover: opacity 0.8</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      <section id="alerts" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Alerts
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="mb-4">Alert Examples</h3>
            <p className="mb-6 text-sm opacity-60">
              Alerts provide important messages and notifications to users.
            </p>
            <div className="space-y-4">
              <div className="nutrient-alert nutrient-alert-neutral">
                <div className="nutrient-alert-icon">ℹ</div>
                <div className="nutrient-alert-content">
                  This is a neutral informational alert
                </div>
              </div>
              <div className="nutrient-alert nutrient-alert-success">
                <div className="nutrient-alert-icon">✓</div>
                <div className="nutrient-alert-content">
                  This is a success alert
                </div>
              </div>
              <div className="nutrient-alert nutrient-alert-warning">
                <div className="nutrient-alert-icon">⚠</div>
                <div className="nutrient-alert-content">
                  This is a warning alert
                </div>
              </div>
              <div className="nutrient-alert nutrient-alert-error">
                <div className="nutrient-alert-icon">✕</div>
                <div className="nutrient-alert-content">
                  This is an error alert
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="!mb-6">Alert Specifications</h3>
            <ul className="space-y-2 font-mono text-sm list-disc pl-6">
              <li>Display: flex (horizontal layout)</li>
              <li>Gap: 0.75rem (12px)</li>
              <li>Padding: 0.75rem (12px)</li>
              <li>Border Radius: var(--radius-xs) (0.5rem/8px)</li>
              <li>Icon Size: 2.5rem × 2.5rem (40px × 40px)</li>
              <li>Icon Border Radius: var(--radius-xs)</li>
              <li>Content Line Height: 160%</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Code Section */}
      <section id="code" className="mb-16 scroll-mt-8">
        <h2 className="!pb-2 !mb-8 border-b-2 border-[var(--warm-gray-400)]">
          Code
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="mb-4">Inline Code</h3>
            <p>
              Use <code>inline code</code> for variable names, function names,
              and short code snippets within paragraphs.
            </p>
          </div>

          <div>
            <h3 className="!mb-6">Code Blocks</h3>
            <div className="code-block">
              <figure>
                <figcaption>example.tsx</figcaption>
                <pre>
                  <code>{`import { useState } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}`}</code>
                </pre>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
