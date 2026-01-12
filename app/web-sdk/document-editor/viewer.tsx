"use client";

import { useEffect, useState } from "react";
import type { Instance } from "@nutrient-sdk/viewer";
import OperationQueue from "./_components/OperationQueue";
import PageContextMenu from "./_components/PageContextMenu";

interface PageInfo {
  index: number;
  originalIndex: number;
  width: number;
  height: number;
  rotation: number;
  thumbnailUrl: string;
  isDeleted: boolean;
}

interface DocumentState {
  path: string;
  instance: Instance | null;
  pages: PageInfo[];
  selectedPageIndex: number | null;
  isLoading: boolean;
  error: string | null;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  pageIndex: number;
  documentType: "source" | "target";
}

interface QueuedOperation {
  id: string;
  type: "delete" | "rotate" | "duplicate" | "move";
  timestamp: number;
  description: string;
  sourceDoc: "source" | "target";
  targetDoc?: "source" | "target";
  pageIndexes: number[];
  rotation?: 90 | 180 | 270;
  targetPosition?: number;
}

export default function DocumentEditorViewer() {
  const [sourceDoc, setSourceDoc] = useState<DocumentState>({
    path: "/documents/text-comparison-a.pdf",
    instance: null,
    pages: [],
    selectedPageIndex: null,
    isLoading: true,
    error: null,
  });

  const [targetDoc, setTargetDoc] = useState<DocumentState>({
    path: "/documents/text-comparison-b.pdf",
    instance: null,
    pages: [],
    selectedPageIndex: null,
    isLoading: true,
    error: null,
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    pageIndex: 0,
    documentType: "source",
  });

  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [draggedPage, setDraggedPage] = useState<{
    pageIndex: number;
    sourceDoc: "source" | "target";
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  // Load documents and generate thumbnails on mount
  useEffect(() => {
    let isMounted = true;

    async function loadDocument(
      documentPath: string,
      setDocState: React.Dispatch<React.SetStateAction<DocumentState>>
    ) {
      let tempContainer: HTMLDivElement | null = null;

      try {
        if (!window.NutrientViewer) {
          throw new Error("Nutrient Viewer SDK not loaded");
        }

        const { NutrientViewer } = window;

        // Create hidden container for headless loading
        tempContainer = document.createElement("div");
        tempContainer.style.display = "none";
        document.body.appendChild(tempContainer);

        // Load document headless
        const instance = await NutrientViewer.load({
          container: tempContainer,
          document: documentPath,
          headless: true,
          allowLinearizedLoading: false,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        });

        if (!isMounted) {
          await NutrientViewer.unload(tempContainer);
          return;
        }

        // Generate thumbnails for all pages
        const pageCount = instance.totalPageCount;
        const pages: PageInfo[] = [];

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
          if (!isMounted) {
            await NutrientViewer.unload(tempContainer);
            return;
          }

          // Get page info
          const pageInfo = await instance.pageInfoForIndex(pageIndex);
          if (!pageInfo) continue;

          // Generate thumbnail at native resolution (capped at 800px width for performance)
          // This ensures good quality in the preview pane
          const thumbnailWidth = Math.min(pageInfo.width, 800);
          const thumbnailUrl = await instance.renderPageAsImageURL(
            { width: thumbnailWidth },
            pageIndex
          );

          pages.push({
            index: pageIndex,
            originalIndex: pageIndex,
            width: pageInfo.width,
            height: pageInfo.height,
            rotation: pageInfo.rotation || 0,
            thumbnailUrl,
            isDeleted: false,
          });
        }

        if (!isMounted) {
          await NutrientViewer.unload(tempContainer);
          return;
        }

        // Update state with loaded pages, select first page
        setDocState({
          path: documentPath,
          instance,
          pages,
          selectedPageIndex: 0,
          isLoading: false,
          error: null,
        });

        // Clean up headless instance
        await NutrientViewer.unload(tempContainer);
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      } catch (err) {
        console.error("Error loading document:", err);
        if (isMounted) {
          setDocState((prev) => ({
            ...prev,
            isLoading: false,
            error:
              err instanceof Error
                ? err.message
                : "Failed to load document",
          }));
        }

        // Clean up on error
        if (tempContainer && document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }
    }

    // Load both documents in parallel
    loadDocument(sourceDoc.path, setSourceDoc);
    loadDocument(targetDoc.path, setTargetDoc);

    return () => {
      isMounted = false;
    };
    // Run only once on mount - document paths are static
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render loading state
  if (sourceDoc.isLoading || targetDoc.isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 mb-4" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Loading documents...
          </h3>
          <p style={{ color: "var(--neutral)" }}>
            Generating page thumbnails
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (sourceDoc.error || targetDoc.error) {
    return (
      <div className="flex items-center justify-center h-full w-full" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--code-coral)" }}>
            <svg
              className="w-8 h-8"
              style={{ color: "var(--white)" }}
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
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Failed to Load Documents
          </h3>
          <p style={{ color: "var(--neutral)" }}>
            {sourceDoc.error || targetDoc.error}
          </p>
        </div>
      </div>
    );
  }

  const selectedSourcePage = sourceDoc.selectedPageIndex !== null
    ? sourceDoc.pages[sourceDoc.selectedPageIndex]
    : null;

  const selectedTargetPage = targetDoc.selectedPageIndex !== null
    ? targetDoc.pages[targetDoc.selectedPageIndex]
    : null;

  // Context menu handlers
  const handleContextMenu = (
    e: React.MouseEvent,
    pageIndex: number,
    documentType: "source" | "target"
  ) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      pageIndex,
      documentType,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  // Helper to add operation to queue
  const addOperation = (operation: Omit<QueuedOperation, "id" | "timestamp">) => {
    const newOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setOperations((prev) => [...prev, newOp]);
  };

  // Operation handlers
  const handleDelete = () => {
    const docType = contextMenu.documentType;
    const pageIdx = contextMenu.pageIndex;

    // Add to operation queue
    addOperation({
      type: "delete",
      description: `Delete page ${pageIdx + 1} from ${docType}`,
      sourceDoc: docType,
      pageIndexes: [pageIdx],
    });

    // Optimistically update UI - remove the page from the list
    const setDoc = docType === "source" ? setSourceDoc : setTargetDoc;
    setDoc((prev) => {
      const newPages = prev.pages.filter((p) => p.index !== pageIdx);
      // Reindex remaining pages
      const reindexedPages = newPages.map((p, idx) => ({
        ...p,
        index: idx,
      }));
      return {
        ...prev,
        pages: reindexedPages,
        selectedPageIndex: reindexedPages.length > 0 ? 0 : null,
      };
    });
  };

  const handleRotateClockwise = () => {
    const docType = contextMenu.documentType;
    const pageIdx = contextMenu.pageIndex;

    addOperation({
      type: "rotate",
      description: `Rotate page ${pageIdx + 1} clockwise in ${docType}`,
      sourceDoc: docType,
      pageIndexes: [pageIdx],
      rotation: 90,
    });

    // Optimistically update rotation in UI
    const setDoc = docType === "source" ? setSourceDoc : setTargetDoc;
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.index === pageIdx
          ? { ...p, rotation: (p.rotation + 90) % 360 }
          : p
      ),
    }));
  };

  const handleRotateCounterClockwise = () => {
    const docType = contextMenu.documentType;
    const pageIdx = contextMenu.pageIndex;

    addOperation({
      type: "rotate",
      description: `Rotate page ${pageIdx + 1} counterclockwise in ${docType}`,
      sourceDoc: docType,
      pageIndexes: [pageIdx],
      rotation: 270,
    });

    // Optimistically update rotation in UI
    const setDoc = docType === "source" ? setSourceDoc : setTargetDoc;
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.index === pageIdx
          ? { ...p, rotation: (p.rotation + 270) % 360 }
          : p
      ),
    }));
  };

  const handleDuplicate = () => {
    const docType = contextMenu.documentType;
    const pageIdx = contextMenu.pageIndex;

    addOperation({
      type: "duplicate",
      description: `Duplicate page ${pageIdx + 1} in ${docType}`,
      sourceDoc: docType,
      pageIndexes: [pageIdx],
      targetPosition: pageIdx + 1,
    });

    // Optimistically add duplicate to UI
    const setDoc = docType === "source" ? setSourceDoc : setTargetDoc;
    setDoc((prev) => {
      const pageToDuplicate = prev.pages[pageIdx];
      // Generate unique originalIndex based on timestamp to avoid key conflicts
      const uniqueOriginalIndex = Date.now() + Math.random();
      const newPages = [
        ...prev.pages.slice(0, pageIdx + 1),
        { ...pageToDuplicate, originalIndex: uniqueOriginalIndex },
        ...prev.pages.slice(pageIdx + 1),
      ];
      // Reindex
      const reindexedPages = newPages.map((p, idx) => ({ ...p, index: idx }));
      return {
        ...prev,
        pages: reindexedPages,
      };
    });
  };

  const handleMoveToTop = () => {
    const docType = contextMenu.documentType;
    const pageIdx = contextMenu.pageIndex;

    addOperation({
      type: "move",
      description: `Move page ${pageIdx + 1} to top in ${docType}`,
      sourceDoc: docType,
      pageIndexes: [pageIdx],
      targetPosition: 0,
    });

    // Optimistically move page to top in UI
    const setDoc = docType === "source" ? setSourceDoc : setTargetDoc;
    setDoc((prev) => {
      const pageToMove = prev.pages[pageIdx];
      const otherPages = prev.pages.filter((p) => p.index !== pageIdx);
      const newPages = [pageToMove, ...otherPages];
      // Reindex
      const reindexedPages = newPages.map((p, idx) => ({ ...p, index: idx }));
      return {
        ...prev,
        pages: reindexedPages,
        selectedPageIndex: 0,
      };
    });
  };

  const handleMoveToBottom = () => {
    const docType = contextMenu.documentType;
    const pageIdx = contextMenu.pageIndex;
    const doc = docType === "source" ? sourceDoc : targetDoc;

    addOperation({
      type: "move",
      description: `Move page ${pageIdx + 1} to bottom in ${docType}`,
      sourceDoc: docType,
      pageIndexes: [pageIdx],
      targetPosition: doc.pages.length - 1,
    });

    // Optimistically move page to bottom in UI
    const setDoc = docType === "source" ? setSourceDoc : setTargetDoc;
    setDoc((prev) => {
      const pageToMove = prev.pages[pageIdx];
      const otherPages = prev.pages.filter((p) => p.index !== pageIdx);
      const newPages = [...otherPages, pageToMove];
      // Reindex
      const reindexedPages = newPages.map((p, idx) => ({ ...p, index: idx }));
      return {
        ...prev,
        pages: reindexedPages,
        selectedPageIndex: reindexedPages.length - 1,
      };
    });
  };

  const handleRemoveOperation = (operationId: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== operationId));
  };

  const handleClearOperations = () => {
    setOperations([]);
  };

  const handleApplyOperations = async () => {
    console.log("Applying operations:", operations);
    // TODO: Implement actual operation application
    alert(`Applying ${operations.length} operations...`);
  };

  const handleToggleMenu = (
    e: React.MouseEvent,
    pageIndex: number,
    documentType: "source" | "target"
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    // Check if menu would overflow bottom of viewport
    const menuHeight = 300; // Approximate menu height
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldShowAbove = spaceBelow < menuHeight;

    setContextMenu({
      show: true,
      x: rect.left,
      y: shouldShowAbove ? rect.top - menuHeight : rect.bottom + 4,
      pageIndex,
      documentType,
    });
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    pageIndex: number,
    sourceDoc: "source" | "target"
  ) => {
    setDraggedPage({ pageIndex, sourceDoc });
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({ pageIndex, sourceDoc }));
  };

  const handleDragEnd = () => {
    setDraggedPage(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropTarget(targetIndex);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("application/json"));

    if (data.sourceDoc === "source") {
      // Move page from source to target (insert to target + delete from source)
      const sourcePage = sourceDoc.pages[data.pageIndex];
      const uniqueOriginalIndex = Date.now() + Math.random();

      // Add insert operation for target
      addOperation({
        type: "duplicate",
        description: `Insert page ${data.pageIndex + 1} from source to target at position ${dropIndex + 1}`,
        sourceDoc: "source",
        targetDoc: "target",
        pageIndexes: [data.pageIndex],
        targetPosition: dropIndex,
      });

      // Add delete operation for source
      addOperation({
        type: "delete",
        description: `Remove page ${data.pageIndex + 1} from source`,
        sourceDoc: "source",
        pageIndexes: [data.pageIndex],
      });

      // Optimistically add to target
      setTargetDoc((prev) => {
        const newPages = [
          ...prev.pages.slice(0, dropIndex),
          { ...sourcePage, originalIndex: uniqueOriginalIndex },
          ...prev.pages.slice(dropIndex),
        ];
        const reindexedPages = newPages.map((p, idx) => ({ ...p, index: idx }));
        return {
          ...prev,
          pages: reindexedPages,
        };
      });

      // Optimistically remove from source
      setSourceDoc((prev) => {
        const newPages = prev.pages.filter((p) => p.index !== data.pageIndex);
        const reindexedPages = newPages.map((p, idx) => ({ ...p, index: idx }));
        return {
          ...prev,
          pages: reindexedPages,
          selectedPageIndex: reindexedPages.length > 0 ? 0 : null,
        };
      });
    } else if (data.sourceDoc === "target") {
      // Reorder within target
      const pageToMove = targetDoc.pages[data.pageIndex];

      addOperation({
        type: "move",
        description: `Move page ${data.pageIndex + 1} to position ${dropIndex + 1} in target`,
        sourceDoc: "target",
        pageIndexes: [data.pageIndex],
        targetPosition: dropIndex,
      });

      // Optimistically reorder in target
      setTargetDoc((prev) => {
        const otherPages = prev.pages.filter((p) => p.index !== data.pageIndex);
        const newPages = [
          ...otherPages.slice(0, dropIndex > data.pageIndex ? dropIndex - 1 : dropIndex),
          pageToMove,
          ...otherPages.slice(dropIndex > data.pageIndex ? dropIndex - 1 : dropIndex),
        ];
        const reindexedPages = newPages.map((p, idx) => ({ ...p, index: idx }));
        return {
          ...prev,
          pages: reindexedPages,
        };
      });
    }

    setDraggedPage(null);
    setDropTarget(null);
  };

  return (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: "var(--background)" }}>
      <div className="flex-1 flex justify-center overflow-hidden">
      <div className="flex w-full max-w-[1600px]">
      {/* Source Document Section */}
      <div className="flex-1 flex border-r" style={{ borderColor: "var(--warm-gray-400)" }}>
        {/* Thumbnail List */}
        <div className="w-48 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--warm-gray-400)", backgroundColor: "var(--warm-gray-100)" }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--warm-gray-400)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Source
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral)" }}>
              {sourceDoc.pages.length} pages
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {sourceDoc.pages.map((page) => (
              <button
                key={page.originalIndex}
                type="button"
                onClick={() => setSourceDoc(prev => ({ ...prev, selectedPageIndex: page.index }))}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, page.index, "source")}
                onDragEnd={handleDragEnd}
                className="w-full relative"
                style={{
                  backgroundColor: sourceDoc.selectedPageIndex === page.index ? "var(--white)" : "transparent",
                  border: `2px solid ${sourceDoc.selectedPageIndex === page.index ? "var(--disc-pink)" : "var(--warm-gray-400)"}`,
                  borderRadius: "4px",
                  padding: "8px",
                  cursor: "grab",
                  opacity: draggedPage?.pageIndex === page.index && draggedPage?.sourceDoc === "source" ? 0.5 : 1,
                }}
              >
                {/* biome-ignore lint/performance/noImgElement: Dynamic data URL from PDF rendering */}
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.index + 1}`}
                  className="w-full"
                  style={{
                    display: "block",
                    transform: `rotate(${page.rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }}
                />
                <div className="text-center mt-1">
                  <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                    {page.index + 1}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Page Preview */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--warm-gray-200)" }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--warm-gray-400)", backgroundColor: "var(--white)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Preview
            </h3>
            {selectedSourcePage && (
              <p className="text-xs" style={{ color: "var(--neutral)" }}>
                Page {selectedSourcePage.index + 1} of {sourceDoc.pages.length}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 flex justify-center">
            {selectedSourcePage ? (
              <div className="shadow-lg" style={{ backgroundColor: "var(--white)" }}>
                {/* biome-ignore lint/performance/noImgElement: Dynamic data URL from PDF rendering */}
                <img
                  src={selectedSourcePage.thumbnailUrl}
                  alt={`Page ${selectedSourcePage.index + 1}`}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                    transform: `rotate(${selectedSourcePage.rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }}
                />
              </div>
            ) : (
              <p style={{ color: "var(--neutral)" }}>Select a page to preview</p>
            )}
          </div>
        </div>
      </div>

      {/* Target Document Section */}
      <div className="flex-1 flex">
        {/* Thumbnail List */}
        <div className="w-48 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--warm-gray-400)", backgroundColor: "var(--warm-gray-100)" }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--warm-gray-400)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Target
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral)" }}>
              {targetDoc.pages.length} pages
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {targetDoc.pages.length === 0 ? (
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => handleDragOver(e, 0)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 0)}
                onKeyDown={() => {}}
                className="h-full flex items-center justify-center border-2 border-dashed rounded-lg"
                style={{
                  borderColor: dropTarget === 0 ? "var(--data-green)" : "var(--warm-gray-400)",
                  backgroundColor: dropTarget === 0 ? "var(--data-green)" : "transparent",
                  opacity: dropTarget === 0 ? 0.2 : 0.5,
                  minHeight: "100px",
                }}
              >
                <p className="text-sm" style={{ color: "var(--neutral)" }}>
                  Drop pages here
                </p>
              </div>
            ) : (
              <>
                {targetDoc.pages.map((page, idx) => (
                  <div key={page.originalIndex}>
                    {/* Drop zone before this thumbnail */}
                    <div
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="-my-1"
                      style={{
                        height: dropTarget === idx ? "8px" : "4px",
                        backgroundColor: dropTarget === idx ? "var(--data-green)" : "transparent",
                        borderRadius: "4px",
                        transition: "all 0.2s ease",
                        margin: dropTarget === idx ? "4px 0" : "0",
                      }}
                    />

                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => setTargetDoc(prev => ({ ...prev, selectedPageIndex: page.index }))}
                        onContextMenu={(e) => handleContextMenu(e, page.index, "target")}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, page.index, "target")}
                        onDragEnd={handleDragEnd}
                        className="w-full relative"
                        style={{
                          backgroundColor: targetDoc.selectedPageIndex === page.index ? "var(--white)" : "transparent",
                          border: `2px solid ${targetDoc.selectedPageIndex === page.index ? "var(--data-green)" : "var(--warm-gray-400)"}`,
                          borderRadius: "4px",
                          padding: "8px",
                          cursor: "grab",
                          opacity: draggedPage?.pageIndex === page.index && draggedPage?.sourceDoc === "target" ? 0.5 : 1,
                        }}
                      >
                  {/* biome-ignore lint/performance/noImgElement: Dynamic data URL from PDF rendering */}
                  <img
                    src={page.thumbnailUrl}
                    alt={`Page ${page.index + 1}`}
                    className="w-full"
                    style={{
                      display: "block",
                      transform: `rotate(${page.rotation}deg)`,
                      transition: "transform 0.3s ease",
                    }}
                  />
                  <div className="text-center mt-1">
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {page.index + 1}
                    </span>
                  </div>
                </button>
                {/* Three-dot menu button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleMenu(e, page.index, "target")}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{
                    backgroundColor: "var(--white)",
                    border: "2px solid var(--warm-gray-600)",
                    borderRadius: "4px",
                    padding: "4px 6px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "var(--black)",
                    lineHeight: "1",
                  }}
                  title="More options"
                >
                  ⋮
                </button>
                    </div>

                    {/* Drop zone after last thumbnail */}
                    {idx === targetDoc.pages.length - 1 && (
                      <div
                        onDragOver={(e) => handleDragOver(e, idx + 1)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, idx + 1)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="mt-1"
                        style={{
                          height: dropTarget === idx + 1 ? "8px" : "4px",
                          backgroundColor: dropTarget === idx + 1 ? "var(--data-green)" : "transparent",
                          borderRadius: "4px",
                          transition: "all 0.2s ease",
                          margin: dropTarget === idx + 1 ? "4px 0" : "0",
                        }}
                      />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Page Preview */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--warm-gray-200)" }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--warm-gray-400)", backgroundColor: "var(--white)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Preview
            </h3>
            {selectedTargetPage && (
              <p className="text-xs" style={{ color: "var(--neutral)" }}>
                Page {selectedTargetPage.index + 1} of {targetDoc.pages.length}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 flex justify-center">
            {selectedTargetPage ? (
              <div className="shadow-lg" style={{ backgroundColor: "var(--white)" }}>
                {/* biome-ignore lint/performance/noImgElement: Dynamic data URL from PDF rendering */}
                <img
                  src={selectedTargetPage.thumbnailUrl}
                  alt={`Page ${selectedTargetPage.index + 1}`}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                    transform: `rotate(${selectedTargetPage.rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }}
                />
              </div>
            ) : (
              <p style={{ color: "var(--neutral)" }}>Select a page to preview</p>
            )}
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* Operation Queue */}
      <OperationQueue
        operations={operations}
        onRemove={handleRemoveOperation}
        onClear={handleClearOperations}
        onApply={handleApplyOperations}
      />

      {/* Context Menu */}
      {contextMenu.show && (
        <PageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          pageIndex={contextMenu.pageIndex}
          documentType={contextMenu.documentType}
          onClose={handleCloseContextMenu}
          onDelete={handleDelete}
          onRotateClockwise={handleRotateClockwise}
          onRotateCounterClockwise={handleRotateCounterClockwise}
          onDuplicate={handleDuplicate}
          onMoveToTop={handleMoveToTop}
          onMoveToBottom={handleMoveToBottom}
        />
      )}
    </div>
  );
}
