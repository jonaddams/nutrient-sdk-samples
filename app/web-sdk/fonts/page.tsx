"use client";

import { useState } from "react";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
import { fontFileFor } from "./fontFiles";

/**
 * The Web SDK half of the fonts story.
 *
 * The .NET SDK sample at /dotnet-sdk/fonts covers the same document from the
 * server's point of view — which fonts it asks for, and whether the server has
 * them. This one is about what the BROWSER does with that answer: a viewer can
 * only draw a font it has been given, so a document whose fonts are neither
 * embedded nor supplied gets substituted, silently.
 */

interface SampleDocument {
  id: string;
  label: string;
  subtitle: string;
  url: string;
}

const DOCUMENTS: SampleDocument[] = [
  {
    id: "acme-sow-docx",
    label: "Statement of work (DOCX)",
    subtitle:
      "Office conversion. Requests two fonts that are not installed anywhere.",
    url: "/documents/dotnet-sdk/acme-sow.docx",
  },
  {
    id: "acme-sow-pdf",
    label: "Statement of work (PDF)",
    subtitle: "A PDF that references a font without embedding it.",
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

export default function WebSdkFontsPage() {
  const [selectedId, setSelectedId] = useState(DOCUMENTS[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FontsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = DOCUMENTS.find((d) => d.id === selectedId) ?? DOCUMENTS[0];

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const sourceResponse = await fetch(selected.url);
      if (!sourceResponse.ok) throw new Error("Failed to load sample document");
      const sourceBlob = await sourceResponse.blob();

      const fileName = selected.url.split("/").pop() ?? "document";
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

  // Only fonts this app ships a file for can be handed to the viewer.
  const suppliableFonts =
    result?.fonts.map((f) => f.name).filter((n) => fontFileFor(n)) ?? [];

  // Each pane gets its own <iframe>. NutrientViewer snapshots its Standalone
  // configuration — customFonts included — on the first load() call on a page,
  // and asserts if a later load() passes a different one. Two viewers in one
  // document therefore cannot hold different customFonts; separate documents
  // can. This is the single most surprising thing about supplying fonts.
  const paneUrl = (fonts: string[]) => {
    const params = new URLSearchParams({ doc: selected.url });
    if (fonts.length > 0) params.set("fonts", fonts.join(","));
    return `/web-sdk/fonts/pane?${params.toString()}`;
  };

  const intro = (
    <div className="callout">
      <span className="callout-label">customFonts</span>
      <p>
        A viewer can only draw a font it has been given. If a font is neither
        embedded in the document nor installed where the document was converted,
        the renderer substitutes something else — the text still appears, so
        nothing looks broken, but weights, widths and line breaks all shift.
      </p>
      <p>Supply the fonts explicitly and the document renders as authored:</p>
      <div className="code-block" style={{ margin: 0 }}>
        <figure>
          <figcaption>NutrientViewer.load()</figcaption>
          <pre>
            <code>{`const customFonts = ["AlfaSlabOne-Regular.ttf"].map(
  (file) =>
    new NutrientViewer.Font({
      name: file, // the FILE's name, not the family name
      callback: () => fetch(\`/fonts/\${file}\`).then((r) => r.blob()),
    }),
);

NutrientViewer.load({ container, document, customFonts });`}</code>
          </pre>
        </figure>
      </div>
      <p>
        Two things catch people out. <code>Font({"{ name }"})</code> wants the
        font <strong>file&apos;s</strong> name, with its extension — pass the
        family name (<code>&quot;Alfa Slab One&quot;</code>) and the SDK rejects
        it and silently substitutes. And the configuration is snapshotted{" "}
        <strong>per page</strong>, not per viewer, so two viewers on one page
        cannot be given different <code>customFonts</code>; that is why the
        comparison below runs each pane in its own iframe.
      </p>
      <p>
        The font list here comes from a server-side SDK, not from the viewer —{" "}
        <a href="#how-the-font-list-is-determined">
          how the font list is determined
        </a>{" "}
        explains why the Web SDK cannot produce it.
      </p>
    </div>
  );

  const sidebar = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Input Document
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          {DOCUMENTS.map((doc) => {
            const isSelected = doc.id === selectedId;
            return (
              <button
                key={doc.id}
                type="button"
                disabled={isRunning}
                onClick={() => {
                  setSelectedId(doc.id);
                  setResult(null);
                  setError(null);
                }}
                className={
                  "w-full text-left px-3 py-2.5 transition-colors " +
                  (isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer")
                }
                style={{
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--line)"}`,
                  background: isSelected ? "var(--accent-tint)" : "transparent",
                  borderRadius: "var(--r-2)",
                }}
              >
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {doc.label}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: "var(--ink-3)" }}
                >
                  {doc.subtitle}
                </div>
              </button>
            );
          })}
        </div>

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
                    In the document
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.fonts.map((font) => (
                  <tr
                    key={`${font.name}-${font.style ?? ""}`}
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
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
            {suppliableFonts.length} of {result.fontCount} fonts ship with this
            app and are passed to the right-hand viewer as{" "}
            <code>customFonts</code>. Anything not embedded and not supplied is
            substituted.
          </p>
        )}
      </div>
    </div>
  );

  const footer = (
    <div className="callout" id="how-the-font-list-is-determined">
      <span className="callout-label">How the font list is determined</span>
      <p>
        The list on the left does not come from the Web SDK. It comes from a{" "}
        <a href="/dotnet-sdk/fonts">Nutrient .NET SDK endpoint</a> that opens
        the document server-side and reports every font it references, along
        with whether the font travels with the file.
      </p>
      <p>
        That split is deliberate, because the Web SDK has no API that enumerates
        a document&apos;s fonts. It is a renderer: it resolves each font as it
        draws, and substitutes whatever it cannot resolve. Three font-related
        APIs exist and none of them answers &quot;what does this document ask
        for?&quot;:
      </p>
      {/* globals.css sets `ul { display: flex }`, which suppresses list
          markers; this is the app's only <ul>, so restore normal list
          rendering here rather than leave it looking like a broken list. */}
      <ul style={{ display: "block", listStyle: "disc" }}>
        <li>
          <code>contentEditingFontMatcher</code> fires when the SDK picks a
          substitute during content editing. Its <code>FontInfo</code> carries
          the font name <em>as declared in the document</em> — the closest the
          Web SDK gets — but reactively, one match at a time, and only while
          content editing. Never as a list, and never before you render.
        </li>
        <li>
          The content editor&apos;s <code>getAvailableFonts()</code> returns the
          fonts available <em>to the editor</em>, which is the opposite
          question.
        </li>
        <li>
          <code>TextAnnotationFonts</code> describes the annotation font picker,
          not the document.
        </li>
      </ul>
      <p>
        So if you need to know what a document requires <em>before</em> you
        render it — to fetch the right fonts, or to warn that a file will not
        render faithfully — that answer has to come from a server-side SDK. The
        viewer can tell you what it substituted; it cannot tell you what was
        asked for.
      </p>
      <div className="code-block" style={{ margin: 0 }}>
        <figure>
          <figcaption>
            contentEditingFontMatcher — observing a substitution
          </figcaption>
          <pre>
            <code>{`NutrientViewer.load({
  container,
  document,
  contentEditingFontMatcher: (match, fontInfo, availableFonts) => {
    // fontInfo.name          -> "AlfaSlabOne-Regular" (as declared)
    // fontInfo.subsetInfo    -> { originalName: "ABCDEF+AlfaSlabOne-Regular",
    //                             demangledName: "AlfaSlabOne-Regular" }
    console.log("substituting", fontInfo.name, "->", match);
    return undefined; // accept the SDK's choice
  },
});`}</code>
          </pre>
        </figure>
      </div>
      <p>
        Worth noting: <code>subsetInfo.demangledName</code> strips the
        six-letter subset prefix a PDF adds to embedded fonts. This sample does
        the same normalisation when matching an inventory name to a font file,
        so the two ends agree.
      </p>
      <p>
        <a
          href="https://www.nutrient.io/api/web/NutrientViewer.Font.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Font API reference
        </a>
        {" · "}
        <a
          href="https://www.nutrient.io/api/web/NutrientViewer.Configuration.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Configuration (customFonts, fontSubstitutions)
        </a>
        {" · "}
        <a
          href="https://www.nutrient.io/guides/web/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Web SDK guides
        </a>
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
  );

  return (
    <SampleFrame
      title="Fonts in the Viewer"
      description="Why a document renders with the wrong type, and how customFonts fixes it — the same document rendered without its fonts and with them."
      intro={intro}
      sidebar={sidebar}
      footer={footer}
      wide
    >
      {result ? (
        <div className="flex h-full">
          <ViewerPane title="Without fonts supplied">
            <iframe
              key={paneUrl([])}
              src={paneUrl([])}
              title="Document rendered without fonts supplied"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </ViewerPane>
          <ViewerPane title="With customFonts" bordered>
            <iframe
              key={paneUrl(suppliableFonts)}
              src={paneUrl(suppliableFonts)}
              title="Document rendered with fonts supplied"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </ViewerPane>
        </div>
      ) : (
        <div
          className="flex h-full items-center justify-center"
          style={{ color: "var(--ink-4)" }}
        >
          <div className="text-center space-y-2">
            <p className="text-sm">List fonts to compare the two renderings.</p>
            <p className="text-xs">
              The same document is shown twice — once as the viewer renders it
              alone, once with the document&apos;s fonts supplied.
            </p>
          </div>
        </div>
      )}
    </SampleFrame>
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
