"use client";

import { useEffect, useState } from "react";
import TextDiff from "./TextDiff";

interface DocumentComparisonViewerProps {
  document1: string | ArrayBuffer;
  document2: string | ArrayBuffer;
}

export default function DocumentComparisonViewer({
  document1,
  document2,
}: DocumentComparisonViewerProps) {
  const [text1, setText1] = useState<string>("");
  const [text2, setText2] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    let tempContainer1: HTMLDivElement | null = null;
    let tempContainer2: HTMLDivElement | null = null;

    async function extractData() {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        // Extract text using Nutrient Viewer
        if (!isMounted) return;
        setExtractionProgress("Loading first document...");
        const { NutrientViewer } = window;

        if (!NutrientViewer) {
          throw new Error("Nutrient Viewer SDK not loaded");
        }

        // Create temporary containers for text extraction
        tempContainer1 = document.createElement("div");
        tempContainer2 = document.createElement("div");
        tempContainer1.style.display = "none";
        tempContainer2.style.display = "none";
        document.body.appendChild(tempContainer1);
        document.body.appendChild(tempContainer2);

        // Extract text from document 1
        const instance1 = await NutrientViewer.load({
          container: tempContainer1,
          document: document1,
          allowLinearizedLoading: false,
          pageRendering: "next",
          headless: true,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        });

        if (!isMounted) {
          await NutrientViewer.unload(tempContainer1);
          return;
        }

        setExtractionProgress("Extracting text from first document...");
        const pageCount1 = instance1.totalPageCount;
        let allText1 = "";

        for (let pageIndex = 0; pageIndex < pageCount1; pageIndex++) {
          if (!isMounted) {
            await NutrientViewer.unload(tempContainer1);
            return;
          }
          try {
            const textLines = await instance1.textLinesForPageIndex(pageIndex);
            const pageText = textLines.map((l: any) => l.contents).join("\n");
            allText1 = `${allText1}${pageText}\n`;
          } catch (err) {
            console.error(`Error extracting text from page ${pageIndex}:`, err);
            // Continue with other pages
          }
        }

        if (!isMounted) {
          await NutrientViewer.unload(tempContainer1);
          return;
        }
        setText1(allText1);

        // Extract text from document 2
        setExtractionProgress("Loading second document...");
        const instance2 = await NutrientViewer.load({
          container: tempContainer2,
          document: document2,
          allowLinearizedLoading: false,
          pageRendering: "next",
          headless: true,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        });

        if (!isMounted) {
          await NutrientViewer.unload(tempContainer1);
          await NutrientViewer.unload(tempContainer2);
          return;
        }

        setExtractionProgress("Extracting text from second document...");
        const pageCount2 = instance2.totalPageCount;
        let allText2 = "";

        for (let pageIndex = 0; pageIndex < pageCount2; pageIndex++) {
          if (!isMounted) {
            await NutrientViewer.unload(tempContainer1);
            await NutrientViewer.unload(tempContainer2);
            return;
          }
          try {
            const textLines = await instance2.textLinesForPageIndex(pageIndex);
            const pageText = textLines.map((l: any) => l.contents).join("\n");
            allText2 = `${allText2}${pageText}\n`;
          } catch (err) {
            console.error(`Error extracting text from page ${pageIndex}:`, err);
            // Continue with other pages
          }
        }

        if (!isMounted) {
          await NutrientViewer.unload(tempContainer1);
          await NutrientViewer.unload(tempContainer2);
          return;
        }
        setText2(allText2);

        // Cleanup
        await NutrientViewer.unload(tempContainer1);
        await NutrientViewer.unload(tempContainer2);
        if (document.body.contains(tempContainer1)) {
          document.body.removeChild(tempContainer1);
        }
        if (document.body.contains(tempContainer2)) {
          document.body.removeChild(tempContainer2);
        }

        if (!isMounted) return;
        setExtractionProgress("Comparison ready!");
        setLoading(false);
      } catch (err) {
        console.error("Error extracting data:", err);
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to extract document data",
        );
        setLoading(false);
      }
    }

    extractData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      // Cleanup containers if they still exist
      if (tempContainer1 && document.body.contains(tempContainer1)) {
        document.body.removeChild(tempContainer1);
      }
      if (tempContainer2 && document.body.contains(tempContainer2)) {
        document.body.removeChild(tempContainer2);
      }
    };
  }, [document1, document2]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {extractionProgress || "Extracting document text..."}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This may take a moment for large documents
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Text Extraction Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-3)",
      }}
    >
      {/* Header with stats — uses the same panel-head treatment as our
          dialogs so the comparison view feels consistent with the rest of
          the design system. */}
      <div
        className="px-6 py-4"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--ink)" }}
              >
                Text Comparison Results
              </h2>
              <span
                className="panel-section"
                style={{
                  color: "var(--data-green)",
                  border: "1px solid color-mix(in srgb, var(--data-green) 40%, var(--line))",
                  borderRadius: "var(--r-pill)",
                  padding: "2px 8px",
                  background:
                    "color-mix(in srgb, var(--data-green) 12%, var(--bg-elev))",
                }}
              >
                Complete
              </span>
            </div>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--ink-3)" }}
            >
              Complete text document comparison
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--ink)" }}
              >
                {text1.length.toLocaleString()}
              </div>
              <div
                className="panel-section"
                style={{ padding: 0, marginTop: 2 }}
              >
                Doc 1 chars
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--ink)" }}
              >
                {text2.length.toLocaleString()}
              </div>
              <div
                className="panel-section"
                style={{ padding: 0, marginTop: 2 }}
              >
                Doc 2 chars
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diff display */}
      <div className="flex-1 overflow-auto">
        <TextDiff text1={text1} text2={text2} />
      </div>
    </div>
  );
}
