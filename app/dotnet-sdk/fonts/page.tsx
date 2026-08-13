"use client";

import { useState } from "react";
import { DotNetSampleHeader } from "../_components/DotNetSampleHeader";
import { type SampleOption, SamplePicker } from "../_components/SamplePicker";
import { fontFileFor } from "./fontFiles";

const SAMPLES: SampleOption[] = [
  {
    id: "acme-sow",
    label: "Acme statement of work (DOCX)",
    subtitle: "Requests two fonts this machine does not have installed.",
    url: "/documents/dotnet-sdk/acme-sow.docx",
  },
  {
    id: "acme-sow-pdf",
    label: "Acme statement of work (PDF)",
    subtitle: "Same document as a PDF, with fonts referenced but not embedded.",
    url: "/documents/dotnet-sdk/acme-sow.pdf",
  },
];

interface FontInfo {
  name: string;
  style: string | null;
  type: string | null;
  encoding: string | null;
  available: boolean;
  detail: string;
}

interface FontsResult {
  source: string;
  fileName: string;
  fontCount: number;
  fonts: FontInfo[];
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-3)",
  overflow: "hidden",
};

export default function FontsPage() {
  const [selectedSampleId, setSelectedSampleId] = useState(SAMPLES[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FontsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const sample =
        SAMPLES.find((s) => s.id === selectedSampleId) ?? SAMPLES[0];
      const sourceResponse = await fetch(sample.url);
      if (!sourceResponse.ok) throw new Error("Failed to load sample document");
      const sourceBlob = await sourceResponse.blob();

      const fileName = sample.url.split("/").pop() ?? "document.docx";
      const formData = new FormData();
      formData.append("file", new File([sourceBlob], fileName));

      const res = await fetch("/api/dotnet-sdk/fonts", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error(
          (await res.text()) ||
            `Server returned ${res.status} ${res.statusText}`,
        );
      }

      setResult((await res.json()) as FontsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Font listing failed");
    } finally {
      setIsRunning(false);
    }
  };

  // Only fonts we actually ship a file for can be supplied to the viewer.
  const suppliableFonts =
    result?.fonts.map((f) => f.name).filter((n) => fontFileFor(n)) ?? [];

  // Each pane is rendered in its own <iframe>, navigated to the pane route
  // below, rather than as two <Viewer> instances on this page. NutrientViewer
  // snapshots its Standalone configuration (including customFonts) on first
  // load and asserts if a later load() on the SAME page passes a different
  // one — so two same-page instances cannot be given different customFonts.
  // A separate document per pane sidesteps that entirely.
  const selectedSample =
    SAMPLES.find((s) => s.id === selectedSampleId) ?? SAMPLES[0];
  const paneUrl = (fonts: string[]) => {
    const params = new URLSearchParams({ doc: selectedSample.url });
    if (fonts.length > 0) params.set("fonts", fonts.join(","));
    return `/dotnet-sdk/fonts/pane?${params.toString()}`;
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <DotNetSampleHeader
        title="Document Fonts"
        description="List every font a document requires with the Nutrient .NET SDK, then supply those fonts to the viewer so it renders as authored."
      />

      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-7)",
          maxWidth: 1800,
        }}
      >
        <p
          className="text-sm"
          style={{ marginBottom: "var(--space-4)", color: "var(--ink-3)" }}
        >
          <a href="#sdk-calls-behind-this">
            How this works — the SDK calls behind this sample
          </a>
        </p>

        <div style={cardStyle}>
          <div className="flex">
            <div
              className="w-80 flex flex-col shrink-0 min-h-[calc(100vh-12rem)]"
              style={{
                background: "var(--surface)",
                borderRight: "1px solid var(--line)",
              }}
            >
              <div
                className="p-4"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink)" }}
                >
                  Input Document
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <SamplePicker
                  samples={SAMPLES}
                  selectedId={selectedSampleId}
                  onSelect={(id) => {
                    setSelectedSampleId(id);
                    setResult(null);
                    setError(null);
                  }}
                  disabled={isRunning}
                />

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="btn btn-sm w-full"
                >
                  {isRunning ? "Reading fonts..." : "List Fonts"}
                </button>

                {error && (
                  <div
                    className="p-3 text-xs"
                    style={{
                      background:
                        "color-mix(in srgb, var(--code-coral) 12%, var(--bg-elev))",
                      border:
                        "1px solid color-mix(in srgb, var(--code-coral) 35%, var(--line))",
                      borderRadius: "var(--r-2)",
                      color: "var(--code-coral)",
                    }}
                  >
                    {error}
                  </div>
                )}

                {result && (
                  <div
                    className="overflow-hidden"
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-2)",
                    }}
                  >
                    <table className="w-full text-xs">
                      <thead>
                        <tr
                          style={{
                            background: "var(--surface)",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          <th
                            className="text-left px-3 py-2 font-semibold"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Font
                          </th>
                          <th
                            className="text-right px-3 py-2 font-semibold"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.fonts.map((font) => (
                          <tr
                            key={`${font.name}-${font.style ?? ""}`}
                            style={{ borderBottom: "1px solid var(--line)" }}
                          >
                            <td
                              className="px-3 py-2"
                              style={{ color: "var(--ink-2)" }}
                            >
                              <div className="font-medium">{font.name}</div>
                              <div style={{ color: "var(--ink-4)" }}>
                                {[font.style, font.type, font.encoding]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </td>
                            <td
                              className="px-3 py-2 text-right font-medium"
                              style={{
                                // Colour on detail, not availability: "embedded"
                                // is a guarantee the browser will render this
                                // font, since the program travels inside the
                                // file. "installed" is only a server-side
                                // finding (this host has the family) and says
                                // nothing about the browser, which may still
                                // substitute — so it does not earn green.
                                color:
                                  font.detail === "embedded"
                                    ? "var(--data-green)"
                                    : "var(--code-coral)",
                              }}
                            >
                              {font.detail}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {result && (
                  <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                    {suppliableFonts.length} of {result.fontCount} fonts are
                    available in this app and supplied to the right-hand viewer.
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex h-[calc(100vh-12rem)]">
              {result ? (
                <>
                  <ViewerPane title="Without fonts">
                    <iframe
                      src={paneUrl([])}
                      title="Document rendered without fonts supplied"
                      style={{ width: "100%", height: "100%", border: "none" }}
                    />
                  </ViewerPane>
                  <ViewerPane title="With fonts supplied" bordered>
                    <iframe
                      src={paneUrl(suppliableFonts)}
                      title="Document rendered with fonts supplied"
                      style={{ width: "100%", height: "100%", border: "none" }}
                    />
                  </ViewerPane>
                </>
              ) : (
                <div
                  className="flex-1 flex items-center justify-center"
                  style={{ color: "var(--ink-4)" }}
                >
                  <div className="text-center space-y-2">
                    <p className="text-sm">
                      List fonts to compare the two renderings.
                    </p>
                    <p className="text-xs">
                      The same document is shown twice — once as the viewer
                      renders it alone, once with the document&apos;s fonts
                      supplied.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="callout"
          id="sdk-calls-behind-this"
          style={{ marginTop: "var(--space-5)" }}
        >
          <span className="callout-label">The SDK calls behind this</span>
          <p>
            The two formats share nothing. A PDF stores its fonts as numbered
            resources, so the SDK walks them by index; a Word file declares font
            names and the converter reports how each one resolved. Both
            normalize into the single response the table above renders.
          </p>

          <p>
            <strong>PDF</strong> — <ApiLink cls="GdPicturePDF" /> exposes a{" "}
            <strong>1-based</strong> index. Read the count, then ask for each
            font in turn:
          </p>
          <ul style={{ display: "block", listStyle: "disc" }}>
            <li>
              <ApiLink cls="GdPicturePDF" method="GetFontCount" /> — how many
              fonts the document uses. The loop runs{" "}
              <code>1..GetFontCount()</code>, not from zero.
            </li>
            <li>
              <ApiLink cls="GdPicturePDF" method="GetFontName" /> — the
              PostScript name. Subset-embedded fonts carry a six-letter prefix
              such as <code>ABCDEE+</code>.
            </li>
            <li>
              <ApiLink cls="GdPicturePDF" method="GetFontType" /> and{" "}
              <ApiLink cls="GdPicturePDF" method="GetFontEncoding" /> — e.g.{" "}
              <code>TrueType</code> and <code>WinAnsiEncoding</code>. These fill
              the second line of each row above.
            </li>
            <li>
              <ApiLink cls="GdPicturePDF" method="IsFontEmbedded" /> — whether
              the font program travels with the file. This is the one that
              decides whether a viewer can render the document faithfully on its
              own.
            </li>
          </ul>

          <p>
            <strong>DOCX</strong> —{" "}
            <ApiLink
              cls="GdPictureDocumentConverter"
              method="SaveDocumentFontsInfo"
            />{" "}
            writes a single XML report rather than exposing an index. It has
            four buckets: <code>DocumentRequestedFonts</code> is the inventory,
            and <code>EmbeddedFonts</code>, <code>SystemAvailableFonts</code>{" "}
            and <code>MissingFonts</code> classify each entry. A stream overload
            exists, so no temp file is needed.
          </p>
          <p>
            That is why a DOCX row shows a style — &quot;Regular&quot;,
            &quot;Bold&quot; — but no type or encoding. Those are PDF concepts,
            and the XML does not report them.
          </p>

          <p>
            <strong>Deliberately unused.</strong> Two more exist:{" "}
            <ApiLink cls="GdPicturePDF" method="GetFontData" />, which extracts
            an embedded font&apos;s bytes, and{" "}
            <ApiLink cls="GdPicturePDF" method="UnembedFont" />, which strips
            one. Both work, and neither is called here: this endpoint only
            reads. Worth knowing they exist if you need to repair or repackage a
            document rather than inspect it.
          </p>

          <p>
            <ApiLink cls="GdPicturePDF" /> {" · "}
            <ApiLink cls="GdPictureDocumentConverter" />
            {" · "}
            <a
              href="https://www.nutrient.io/guides/dotnet/"
              target="_blank"
              rel="noopener noreferrer"
            >
              .NET SDK guides
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Links a GdPicture class or method to its API reference page.
 *
 * The docs accept two equivalent path prefixes (`GdPicture.NET.14.API~` and
 * `GdPicture.NET.14~`); this uses the first consistently. Every URL produced
 * here was checked against the live docs — the site returns a real 404 for an
 * unknown member, so a broken name would not pass silently.
 */
function ApiLink({ cls, method }: { cls: string; method?: string }) {
  const base = "https://www.nutrient.io/api/gdpicture/GdPicture.NET.14.API~";
  const href = method
    ? `${base}GdPicture14.${cls}~${method}.html`
    : `${base}GdPicture14.${cls}.html`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <code>{method ?? cls}</code>
    </a>
  );
}

function ViewerPane({
  title,
  bordered,
  children,
}: {
  title: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={bordered ? { borderLeft: "1px solid var(--line)" } : undefined}
    >
      <div
        className="px-4 py-2.5 text-sm shrink-0"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          color: "var(--ink)",
        }}
      >
        {title}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
