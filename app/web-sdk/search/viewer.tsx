"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";

interface ViewerProps {
  document: string | ArrayBuffer;
}

interface SearchResult {
  pageIndex: number;
  contextSnippet: string;
  fullPreviewText: string;
  locationInPreview: number;
  lengthInPreview: number;
  rects: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
}

export default function SearchViewer({ document }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState<number | null>(
    null,
  );
  const [currentAnnotation, setCurrentAnnotation] = useState<any | null>(null);
  const [currentAnnotationPage, setCurrentAnnotationPage] = useState<
    number | null
  >(null);

  useEffect(() => {
    const container = containerRef.current;

    const { NutrientViewer } = window as any;
    if (container && NutrientViewer) {
      NutrientViewer.load({
        container,
        document: document,
        allowLinearizedLoading: true,
        useCDN: true,
        licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      }).then(async (loadedInstance: Instance) => {
        // Instance loaded successfully
        (window as any).instance = loadedInstance;
        setInstance(loadedInstance);
      });
    }

    return () => {
      if (instance) {
        NutrientViewer?.unload(container);
      }
    };
  }, [document, instance]);

  const performSearch = async () => {
    if (!instance || !searchTerm.trim()) {
      return;
    }

    // Remove previous highlight annotation if it exists
    if (currentAnnotation) {
      try {
        await instance.delete(currentAnnotation);
        console.log("Removed previous annotation");
      } catch (error) {
        console.error("Error removing previous annotation:", error);
      }
      setCurrentAnnotation(null);
    }

    setIsSearching(true);
    setSearchResults([]);
    setCurrentResultIndex(null);

    try {
      const results: SearchResult[] = [];

      // Use the search API to find all matches
      const searchResultsIterable = await instance.search(searchTerm);

      // Iterate through all search results
      searchResultsIterable.forEach((result: any) => {
        const obj = result.toObject();
        const {
          pageIndex,
          previewText,
          locationInPreview,
          lengthInPreview,
          rectsOnPage,
        } = obj;

        if (locationInPreview == null || lengthInPreview == null) {
          return;
        }

        // Extract context around the search term (125 characters before and after)
        const start = Math.max(0, locationInPreview - 125);
        const end = Math.min(
          previewText.length,
          locationInPreview + lengthInPreview + 125,
        );

        const contextSnippet = previewText.slice(start, end);

        // Calculate the relative position of the search term within the context snippet
        const relativeLocation = locationInPreview - start;

        // Convert Immutable.js List to regular array
        const rectsArray = rectsOnPage ? rectsOnPage.toArray() : [];

        results.push({
          pageIndex,
          contextSnippet,
          fullPreviewText: previewText,
          locationInPreview: relativeLocation,
          lengthInPreview,
          rects: rectsArray.map((rect: any) => ({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          })),
        });
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const jumpToResult = async (index: number) => {
    if (!instance || !searchResults[index]) {
      return;
    }

    const result = searchResults[index];
    setCurrentResultIndex(index);

    const { NutrientViewer } = window as any;

    // Always try to remove ALL highlight annotations before creating new one
    try {
      // Check both current page and the page we're navigating to
      const pagesToCheck = new Set([
        result.pageIndex,
        ...(currentAnnotationPage !== null ? [currentAnnotationPage] : []),
      ]);

      console.log("Checking pages for highlights:", Array.from(pagesToCheck));

      for (const pageIdx of pagesToCheck) {
        const annotations = await instance.getAnnotations(pageIdx);

        if (NutrientViewer) {
          const highlightAnnotations = annotations.filter(
            (ann: any) =>
              ann instanceof NutrientViewer.Annotations.HighlightAnnotation,
          );

          console.log(
            `Page ${pageIdx}: Found ${highlightAnnotations.size} highlights`,
          );

          if (highlightAnnotations.size > 0) {
            for (const highlight of highlightAnnotations.toArray()) {
              console.log("Deleting highlight:", highlight.id);
              await instance.delete(highlight);
            }
          }
        }
      }
      console.log("Finished deleting highlights");
    } catch (error) {
      console.error("Error removing annotations:", error);
    }

    // Navigate to the page containing the search result
    await instance.setViewState((viewState: any) =>
      viewState.set("currentPageIndex", result.pageIndex),
    );

    // Create highlight annotation using the rects from the search result
    if (NutrientViewer && result.rects.length > 0) {
      const rects = NutrientViewer.Immutable.List(
        result.rects.map(
          (rect: any) =>
            new NutrientViewer.Geometry.Rect({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }),
        ),
      );

      const annotation = new NutrientViewer.Annotations.HighlightAnnotation({
        pageIndex: result.pageIndex,
        rects: rects,
        boundingBox: NutrientViewer.Geometry.Rect.union(rects),
      });

      try {
        // Create the annotation and get the created annotation list back
        const createdAnnotations = await instance.create(annotation);
        console.log("Created new annotation on page", result.pageIndex);

        // The create method returns a list of annotations
        if (createdAnnotations && createdAnnotations.length > 0) {
          const createdAnnotation = createdAnnotations[0];
          setCurrentAnnotation(createdAnnotation);
          setCurrentAnnotationPage(result.pageIndex);
        }
      } catch (error) {
        console.error("Error creating annotation:", error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const highlightSearchTerm = (text: string, start: number, length: number) => {
    const before = text.slice(0, start);
    const match = text.slice(start, start + length);
    const after = text.slice(start + length);

    return (
      <>
        {before}
        <span className="bg-[var(--digital-pollen)] text-[var(--black)] font-semibold px-0.5 rounded">
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <div className="flex h-full">
      {/* Sidebar for search */}
      <div className="w-96 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col">
        {/* Search Input */}
        <div className="p-4 border-b border-[var(--warm-gray-400)]">
          <div className="mb-4">
            <label
              htmlFor="search-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Search in Document
            </label>
            <div className="flex gap-2">
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter search term..."
                className="flex-1 px-3 py-2 border border-[var(--warm-gray-400)] rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)] focus:border-[var(--digital-pollen)]"
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={performSearch}
                disabled={isSearching || !searchTerm.trim()}
                className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  background:
                    isSearching || !searchTerm.trim()
                      ? "var(--warm-gray-400)"
                      : "var(--digital-pollen)",
                  color: "var(--black)",
                }}
              >
                {isSearching ? (
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <title>Searching...</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <title>Search</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Found {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 && !isSearching && searchTerm && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-500">
              No results found for "{searchTerm}"
            </div>
          )}

          {searchResults.map((result, index) => (
            <button
              key={`${result.pageIndex}-${index}`}
              type="button"
              onClick={() => jumpToResult(index)}
              className={`w-full text-left p-4 border-b border-[var(--warm-gray-400)] hover:bg-[var(--warm-gray-200)] dark:hover:bg-[#3a3030] transition-colors ${
                currentResultIndex === index
                  ? "bg-[var(--warm-gray-200)] dark:bg-[#3a3030]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{ color: "var(--digital-pollen)" }}
                >
                  Page {result.pageIndex + 1}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Result {index + 1} of {searchResults.length}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {highlightSearchTerm(
                  result.contextSnippet,
                  result.locationInPreview,
                  result.lengthInPreview,
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Viewer Container */}
      <div
        ref={containerRef}
        style={{ flex: 1, height: "100%", position: "relative" }}
      />
    </div>
  );
}
