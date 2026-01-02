"use client";

import type {
  DocumentComparison,
  Geometry,
  Instance,
} from "@nutrient-sdk/viewer";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  COMPARISON_CONFIG,
  HIGHLIGHT_COLORS,
  SELECTORS,
} from "@/lib/constants";
import { extractAnnotationId } from "@/lib/utils/typeGuards";

type Operation = DocumentComparison.Operation;

interface ChangeOperation {
  deleteText?: string;
  insertText?: string;
  del?: boolean;
  insert?: boolean;
  pageIndex?: number;
  originalRect?: Geometry.Rect;
  changedRect?: Geometry.Rect;
  annotationIds?: string[];
}

export default function TextComparisonPage() {
  const originalDoc = COMPARISON_CONFIG.ORIGINAL_DOC;
  const changedDoc = COMPARISON_CONFIG.CHANGED_DOC;
  const numberOfContextWords = COMPARISON_CONFIG.CONTEXT_WORDS;
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || "";

  // State management for tracking document changes
  const [operationsMap, setOperationsMap] = useState<
    Map<string, ChangeOperation>
  >(new Map());
  const [selectedChangeIndex, setSelectedChangeIndex] = useState<number>(0);
  const [isScrollLocked, setIsScrollLocked] = useState<boolean>(true);
  const isScrollLockedRef = useRef<boolean>(true);
  const isSyncingRef = useRef<boolean>(false);
  const originalContainerRef = useRef<HTMLDivElement>(null);
  const changedContainerRef = useRef<HTMLDivElement>(null);
  const operationsRef = useRef<Map<string, ChangeOperation>>(new Map());
  const originalInstanceRef = useRef<Instance | null>(null);
  const changedInstanceRef = useRef<Instance | null>(null);
  const selectionAnnotationIdsRef = useRef<string[]>([]);
  const annotationToChangeIndexRef = useRef<Map<string, number>>(new Map());
  const cleanupRef = useRef<{
    originalInstance: Instance;
    changedInstance: Instance;
    originalScrollElement: HTMLElement | null;
    changedScrollElement: HTMLElement | null;
    originalScrollHandler: () => void;
    changedScrollHandler: () => void;
    syncChangedToOriginal: () => void;
    syncOriginalToChanged: () => void;
    handleAnnotationClick: (event: { annotation: { id: string } }) => void;
  } | null>(null);

  // Trigger re-render by updating state
  function updateOperationsMap(existingMap: Map<string, ChangeOperation>) {
    setOperationsMap(new Map(existingMap));
  }

  // Toggle scroll lock and update both state and ref
  function toggleScrollLock() {
    const newValue = !isScrollLocked;
    setIsScrollLocked(newValue);
    isScrollLockedRef.current = newValue;
  }

  // Handle clicking on annotations in the document
  function handleAnnotationClick(event: { annotation: { id: string } }) {
    const annotationId = event.annotation.id;
    const changeIndex = annotationToChangeIndexRef.current.get(annotationId);

    if (
      changeIndex !== undefined &&
      operationsRef.current &&
      operationsRef.current.size > 0
    ) {
      const changesArray = Array.from(operationsRef.current);
      if (changeIndex < changesArray.length) {
        const [, operation] = changesArray[changeIndex];
        handleChangeClick(operation, changeIndex);
      }
    }
  }

  async function scrollToPage(
    instance: Instance,
    targetPageIndex: number,
    offsetTop = 0,
  ): Promise<void> {
    const scrollContainer = instance.contentDocument.querySelector(
      SELECTORS.SCROLL_CONTAINER,
    ) as HTMLElement | null;

    if (!scrollContainer) {
      console.warn("Scroll container not found");
      return;
    }

    let cumulativeHeight = 0;

    for (let i = 0; i < targetPageIndex; i++) {
      const pageInfo = await instance.pageInfoForIndex(i);
      if (!pageInfo) continue;

      const zoom = instance.viewState.zoom;
      const zoomValue = typeof zoom === "number" ? zoom : 1;
      cumulativeHeight += pageInfo.height * zoomValue;
      cumulativeHeight += 10;
    }

    cumulativeHeight += offsetTop;

    scrollContainer.scrollTo({
      top: cumulativeHeight,
      behavior: "smooth",
    });

    const viewState = instance.viewState;
    instance.setViewState(viewState.set("currentPageIndex", targetPageIndex));
  }

  const deleteHighlightColor = HIGHLIGHT_COLORS.DELETE_RGB;
  const insertHighlightColor = HIGHLIGHT_COLORS.INSERT_RGB;

  const compareDocumentsRef = useRef<
    ((isMounted: { current: boolean }) => Promise<void>) | null
  >(null);

  compareDocumentsRef.current = async function compareDocuments(isMounted: {
    current: boolean;
  }) {
    if (!isMounted.current || !window.NutrientViewer) {
      if (!window.NutrientViewer) {
        console.error("NutrientViewer not available on window");
      }
      return;
    }

    const originalContainer = originalContainerRef.current;
    const changedContainer = changedContainerRef.current;

    if (!isMounted.current || !originalContainer || !changedContainer) {
      console.error("Container elements not found");
      return;
    }

    const toolbarItems = [
      { type: "sidebar-thumbnails" as const },
      { type: "sidebar-document-outline" as const },
      { type: "sidebar-bookmarks" as const },
      { type: "pager" as const },
      { type: "pan" as const },
      { type: "zoom-out" as const },
      { type: "zoom-in" as const },
      { type: "zoom-mode" as const },
      { type: "linearized-download-indicator" as const },
    ];

    window.NutrientViewer.unload(originalContainer);
    window.NutrientViewer.unload(changedContainer);

    if (!isMounted.current) return;

    const loadConfig = {
      container: originalContainer,
      document: originalDoc,
      useCDN: true,
      toolbarItems: toolbarItems,
      licenseKey: licenseKey,
    };

    let originalInstance: Instance;
    try {
      originalInstance = await window.NutrientViewer.load(loadConfig);
      if (!isMounted.current) {
        await window.NutrientViewer.unload(originalContainer);
        return;
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error("Failed to load original instance:", error);
      throw error;
    }

    const changedLoadConfig = {
      container: changedContainer,
      document: changedDoc,
      useCDN: true,
      toolbarItems: toolbarItems,
      licenseKey: licenseKey,
    };

    let changedInstance: Instance;
    try {
      changedInstance = await window.NutrientViewer.load(changedLoadConfig);
      if (!isMounted.current) {
        await window.NutrientViewer.unload(originalContainer);
        await window.NutrientViewer.unload(changedContainer);
        return;
      }
    } catch (error) {
      if (!isMounted.current) {
        await window.NutrientViewer.unload(originalContainer);
        return;
      }
      console.error("Failed to load changed instance:", error);
      throw error;
    }

    originalInstanceRef.current = originalInstance;
    changedInstanceRef.current = changedInstance;

    /**
     * Generic sync function factory to synchronize view state between instances
     */
    function createSyncFunction(
      sourceInstance: Instance,
      targetInstance: Instance,
    ) {
      return function sync() {
        if (!isScrollLockedRef.current || isSyncingRef.current) return;

        isSyncingRef.current = true;

        try {
          const sourceViewState = sourceInstance.viewState;
          const targetViewState = targetInstance.viewState;
          const sourcePage = sourceViewState.currentPageIndex;
          const targetPage = targetViewState.currentPageIndex;

          if (targetViewState.zoom !== sourceViewState.zoom) {
            targetInstance.setViewState(
              targetViewState.set("zoom", sourceViewState.zoom),
            );
          }

          if (targetPage !== sourcePage) {
            targetInstance.setViewState(
              targetViewState.set("currentPageIndex", sourcePage),
            );
          } else {
            const sourceScroll = sourceInstance.contentDocument.querySelector(
              SELECTORS.SCROLL_CONTAINER,
            ) as HTMLElement | null;
            const targetScroll = targetInstance.contentDocument.querySelector(
              SELECTORS.SCROLL_CONTAINER,
            ) as HTMLElement | null;

            if (sourceScroll && targetScroll) {
              targetScroll.scrollTop = sourceScroll.scrollTop;
              targetScroll.scrollLeft = sourceScroll.scrollLeft;
            }
          }
        } finally {
          isSyncingRef.current = false;
        }
      };
    }

    const syncChangedToOriginal = createSyncFunction(
      changedInstance,
      originalInstance,
    );
    const syncOriginalToChanged = createSyncFunction(
      originalInstance,
      changedInstance,
    );

    // Add annotation click listeners
    originalInstance.addEventListener(
      "annotations.press",
      handleAnnotationClick,
    );
    changedInstance.addEventListener(
      "annotations.press",
      handleAnnotationClick,
    );

    // Setup scroll synchronization for changed document
    const changedScrollElement = changedInstance.contentDocument.querySelector(
      SELECTORS.SCROLL_CONTAINER,
    );
    let changedScrollFrame: number | null = null;

    const changedScrollHandler = () => {
      if (changedScrollFrame) return;
      changedScrollFrame = requestAnimationFrame(() => {
        syncChangedToOriginal();
        changedScrollFrame = null;
      });
    };

    changedScrollElement?.addEventListener("scroll", changedScrollHandler, {
      passive: true,
    });

    // Add view state listeners for changed document
    changedInstance.addEventListener(
      "viewState.currentPageIndex.change",
      syncChangedToOriginal,
    );
    changedInstance.addEventListener(
      "viewState.zoom.change",
      syncChangedToOriginal,
    );

    // Setup scroll synchronization for original document
    const originalScrollElement =
      originalInstance.contentDocument.querySelector(
        SELECTORS.SCROLL_CONTAINER,
      );
    let originalScrollFrame: number | null = null;

    const originalScrollHandler = () => {
      if (originalScrollFrame) return;
      originalScrollFrame = requestAnimationFrame(() => {
        syncOriginalToChanged();
        originalScrollFrame = null;
      });
    };

    originalScrollElement?.addEventListener("scroll", originalScrollHandler, {
      passive: true,
    });

    // Add view state listeners for original document
    originalInstance.addEventListener(
      "viewState.currentPageIndex.change",
      syncOriginalToChanged,
    );
    originalInstance.addEventListener(
      "viewState.zoom.change",
      syncOriginalToChanged,
    );

    // Store cleanup info in ref for use in effect cleanup
    cleanupRef.current = {
      originalInstance,
      changedInstance,
      originalScrollElement: originalScrollElement as HTMLElement | null,
      changedScrollElement: changedScrollElement as HTMLElement | null,
      originalScrollHandler,
      changedScrollHandler,
      syncChangedToOriginal,
      syncOriginalToChanged,
      handleAnnotationClick,
    };

    const totalPageCount = await originalInstance.totalPageCount;

    for (let pageIndex = 0; pageIndex < totalPageCount; pageIndex++) {
      if (!isMounted.current) {
        await window.NutrientViewer.unload(originalContainer);
        await window.NutrientViewer.unload(changedContainer);
        return;
      }

      const originalDocument = new window.NutrientViewer.DocumentDescriptor({
        filePath: originalDoc,
        pageIndexes: [pageIndex],
      });

      const changedDocument = new window.NutrientViewer.DocumentDescriptor({
        filePath: changedDoc,
        pageIndexes: [pageIndex],
      });

      const changes = new Map<string, ChangeOperation>();

      const textComparisonOperation =
        new window.NutrientViewer.ComparisonOperation(
          window.NutrientViewer.ComparisonOperationType.TEXT,
          { numberOfContextWords },
        );

      if (!isMounted.current) {
        await window.NutrientViewer.unload(originalContainer);
        await window.NutrientViewer.unload(changedContainer);
        return;
      }

      const comparisonResult = await originalInstance.compareDocuments(
        { originalDocument, changedDocument },
        textComparisonOperation,
      );

      async function processOperation(operation: Operation) {
        if (!isMounted.current || !window.NutrientViewer) return;

        switch (operation.type) {
          case "delete": {
            const rect = operation.originalTextBlocks[0].rect;
            const coordinate = `${rect[0]},${rect[1]}`;

            const originalRect = new window.NutrientViewer.Geometry.Rect({
              left: operation.originalTextBlocks[0].rect[0],
              top: operation.originalTextBlocks[0].rect[1],
              width: operation.originalTextBlocks[0].rect[2],
              height: operation.originalTextBlocks[0].rect[3],
            });

            const annotation =
              new window.NutrientViewer.Annotations.HighlightAnnotation({
                pageIndex,
                rects: window.NutrientViewer.Immutable.List([originalRect]),
                color: new window.NutrientViewer.Color(deleteHighlightColor),
              });
            const created = await originalInstance.create(annotation);
            const annotationId = extractAnnotationId(created);

            if (changes.has(coordinate)) {
              const existing = changes.get(coordinate)!;
              changes.set(coordinate, {
                ...existing,
                deleteText: operation.text,
                del: true,
                pageIndex,
                originalRect,
                annotationIds: [
                  ...(existing.annotationIds || []),
                  ...(annotationId ? [annotationId] : []),
                ],
              });
            } else {
              changes.set(coordinate, {
                deleteText: operation.text,
                del: true,
                pageIndex,
                originalRect,
                annotationIds: annotationId ? [annotationId] : [],
              });
            }
            break;
          }

          case "insert": {
            const rect = operation.changedTextBlocks[0].rect;
            const coordinate = `${rect[0]},${rect[1]}`;

            const changedRect = new window.NutrientViewer.Geometry.Rect({
              left: rect[0],
              top: rect[1],
              width: rect[2],
              height: rect[3],
            });

            const annotation =
              new window.NutrientViewer.Annotations.HighlightAnnotation({
                pageIndex,
                rects: window.NutrientViewer.Immutable.List([changedRect]),
                color: new window.NutrientViewer.Color(insertHighlightColor),
              });
            const created = await changedInstance.create(annotation);
            const annotationId = extractAnnotationId(created);

            if (changes.has(coordinate)) {
              const existing = changes.get(coordinate)!;
              changes.set(coordinate, {
                ...existing,
                insertText: operation.text,
                insert: true,
                pageIndex,
                changedRect,
                annotationIds: [
                  ...(existing.annotationIds || []),
                  ...(annotationId ? [annotationId] : []),
                ],
              });
            } else {
              changes.set(coordinate, {
                insertText: operation.text,
                insert: true,
                pageIndex,
                changedRect,
                annotationIds: annotationId ? [annotationId] : [],
              });
            }
            break;
          }
        }
      }

      if (comparisonResult && "documentComparisonResults" in comparisonResult) {
        for (const docComparison of comparisonResult.documentComparisonResults) {
          for (const result of docComparison.comparisonResults) {
            for (const hunk of result.hunks) {
              const operations = hunk.operations.filter(
                (op: Operation) => op.type !== "equal",
              );

              let i = 0;
              while (i < operations.length) {
                const currentOp = operations[i];

                if (
                  currentOp.type === "delete" &&
                  i + 1 < operations.length &&
                  operations[i + 1].type === "insert"
                ) {
                  const deleteOp = currentOp;
                  const insertOp = operations[i + 1];

                  const deleteRect = deleteOp.originalTextBlocks[0].rect;
                  const coordinate = `${deleteRect[0]},${deleteRect[1]}`;

                  const originalRect = new window.NutrientViewer.Geometry.Rect({
                    left: deleteRect[0],
                    top: deleteRect[1],
                    width: deleteRect[2],
                    height: deleteRect[3],
                  });

                  const insertRect = insertOp.changedTextBlocks[0].rect;
                  const changedRect = new window.NutrientViewer.Geometry.Rect({
                    left: insertRect[0],
                    top: insertRect[1],
                    width: insertRect[2],
                    height: insertRect[3],
                  });

                  const deleteAnnotation =
                    new window.NutrientViewer.Annotations.HighlightAnnotation({
                      pageIndex,
                      rects: window.NutrientViewer.Immutable.List([
                        originalRect,
                      ]),
                      color: new window.NutrientViewer.Color(
                        deleteHighlightColor,
                      ),
                    });
                  const createdDelete =
                    await originalInstance.create(deleteAnnotation);
                  const deleteAnnotationId =
                    createdDelete.length > 0
                      ? extractAnnotationId(createdDelete)
                      : null;

                  const insertAnnotation =
                    new window.NutrientViewer.Annotations.HighlightAnnotation({
                      pageIndex,
                      rects: window.NutrientViewer.Immutable.List([
                        changedRect,
                      ]),
                      color: new window.NutrientViewer.Color(
                        insertHighlightColor,
                      ),
                    });
                  const createdInsert =
                    await changedInstance.create(insertAnnotation);
                  const insertAnnotationId =
                    createdInsert.length > 0
                      ? extractAnnotationId(createdInsert)
                      : null;

                  changes.set(coordinate, {
                    deleteText: deleteOp.text,
                    insertText: insertOp.text,
                    del: true,
                    insert: true,
                    pageIndex,
                    originalRect,
                    changedRect,
                    annotationIds: [
                      ...(deleteAnnotationId ? [deleteAnnotationId] : []),
                      ...(insertAnnotationId ? [insertAnnotationId] : []),
                    ],
                  });

                  i += 2;
                } else {
                  await processOperation(currentOp);
                  i++;
                }
              }
            }
          }
        }
      }

      operationsRef.current = new Map([...operationsRef.current, ...changes]);
    }

    updateOperationsMap(operationsRef.current);

    const annotationMap = new Map<string, number>();
    Array.from(operationsRef.current).forEach(([, operation], index) => {
      if (operation.annotationIds) {
        operation.annotationIds.forEach((annotationId) => {
          annotationMap.set(annotationId, index);
        });
      }
    });
    annotationToChangeIndexRef.current = annotationMap;
  };

  function countWords(text: string | undefined): number {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  function plusMinusDisplayText(operation: ChangeOperation) {
    const deleteCount = operation.deleteText
      ? countWords(operation.deleteText)
      : 0;
    const insertCount = operation.insertText
      ? countWords(operation.insertText)
      : 0;

    if (operation.insert && operation.del) {
      return (
        <div className="text-xs">
          <span className="bg-[#FFC9CB] dark:bg-[#8B3A3A] px-1 rounded text-black dark:text-white">
            -{deleteCount}
          </span>
          {" | "}
          <span className="bg-[#C0D8EF] dark:bg-[#3A5A7A] px-1 rounded text-black dark:text-white">
            +{insertCount}
          </span>
        </div>
      );
    }
    if (operation.insert) {
      return (
        <div className="text-xs">
          <span className="bg-[#C0D8EF] dark:bg-[#3A5A7A] px-1 rounded text-black dark:text-white">
            +{insertCount}
          </span>
        </div>
      );
    }
    return (
      <div className="text-xs">
        <span className="bg-[#FFC9CB] dark:bg-[#8B3A3A] px-1 rounded text-black dark:text-white">
          -{deleteCount}
        </span>
      </div>
    );
  }

  async function highlightSelectedChange(operation: ChangeOperation) {
    if (
      !originalInstanceRef.current ||
      !changedInstanceRef.current ||
      !window.NutrientViewer
    )
      return;

    for (const annotationId of selectionAnnotationIdsRef.current) {
      try {
        await originalInstanceRef.current.delete(annotationId);
      } catch {
        try {
          await changedInstanceRef.current.delete(annotationId);
        } catch {
          // Annotation doesn't exist
        }
      }
    }
    selectionAnnotationIdsRef.current = [];

    const borderColor = new window.NutrientViewer.Color({
      r: 59,
      g: 130,
      b: 246,
    });

    if (
      operation.del &&
      operation.originalRect &&
      operation.pageIndex !== undefined
    ) {
      const expandedRect = new window.NutrientViewer.Geometry.Rect({
        left: operation.originalRect.left - 3,
        top: operation.originalRect.top - 3,
        width: operation.originalRect.width + 6,
        height: operation.originalRect.height + 6,
      });

      const borderAnnotation =
        new window.NutrientViewer.Annotations.RectangleAnnotation({
          pageIndex: operation.pageIndex,
          boundingBox: expandedRect,
          strokeColor: borderColor,
          strokeWidth: 2,
          fillColor: null,
        });

      const createdAnnotations =
        await originalInstanceRef.current.create(borderAnnotation);
      if (createdAnnotations.length > 0) {
        const annotationId = extractAnnotationId(createdAnnotations);
        if (annotationId) {
          selectionAnnotationIdsRef.current.push(annotationId);
        }
      }
    }

    if (
      operation.insert &&
      operation.changedRect &&
      operation.pageIndex !== undefined
    ) {
      const expandedRect = new window.NutrientViewer.Geometry.Rect({
        left: operation.changedRect.left - 3,
        top: operation.changedRect.top - 3,
        width: operation.changedRect.width + 6,
        height: operation.changedRect.height + 6,
      });

      const borderAnnotation =
        new window.NutrientViewer.Annotations.RectangleAnnotation({
          pageIndex: operation.pageIndex,
          boundingBox: expandedRect,
          strokeColor: borderColor,
          strokeWidth: 2,
          fillColor: null,
        });

      const createdAnnotations =
        await changedInstanceRef.current.create(borderAnnotation);
      if (createdAnnotations.length > 0) {
        const annotationId = extractAnnotationId(createdAnnotations);
        if (annotationId) {
          selectionAnnotationIdsRef.current.push(annotationId);
        }
      }
    }
  }

  async function handleChangeClick(operation: ChangeOperation, index: number) {
    setSelectedChangeIndex(index);
    if (
      operation.pageIndex !== undefined &&
      originalInstanceRef.current &&
      changedInstanceRef.current
    ) {
      await scrollToPage(originalInstanceRef.current, operation.pageIndex);
      await scrollToPage(changedInstanceRef.current, operation.pageIndex);
      await highlightSelectedChange(operation);
    }
  }

  async function handlePreviousChange() {
    const changesArray = Array.from(operationsMap);
    if (selectedChangeIndex > 0) {
      const newIndex = selectedChangeIndex - 1;
      setSelectedChangeIndex(newIndex);
      const [, operation] = changesArray[newIndex];
      if (
        operation.pageIndex !== undefined &&
        originalInstanceRef.current &&
        changedInstanceRef.current
      ) {
        await scrollToPage(originalInstanceRef.current, operation.pageIndex);
        await scrollToPage(changedInstanceRef.current, operation.pageIndex);
        await highlightSelectedChange(operation);
      }
    }
  }

  async function handleNextChange() {
    const changesArray = Array.from(operationsMap);
    if (selectedChangeIndex < changesArray.length - 1) {
      const newIndex = selectedChangeIndex + 1;
      setSelectedChangeIndex(newIndex);
      const [, operation] = changesArray[newIndex];
      if (
        operation.pageIndex !== undefined &&
        originalInstanceRef.current &&
        changedInstanceRef.current
      ) {
        await scrollToPage(originalInstanceRef.current, operation.pageIndex);
        await scrollToPage(changedInstanceRef.current, operation.pageIndex);
        await highlightSelectedChange(operation);
      }
    }
  }

  useEffect(() => {
    const isMounted = { current: true };

    // Wait for NutrientViewer to be available
    const initializeComparison = () => {
      if (!isMounted.current) return;
      if (!window.NutrientViewer) {
        setTimeout(initializeComparison, 100);
        return;
      }
      compareDocumentsRef.current?.(isMounted);
    };

    initializeComparison();

    // Cleanup function to remove event listeners
    return () => {
      isMounted.current = false;

      const cleanup = cleanupRef.current;
      if (!cleanup) return;

      // Remove annotation click listeners
      cleanup.originalInstance.removeEventListener(
        "annotations.press",
        cleanup.handleAnnotationClick,
      );
      cleanup.changedInstance.removeEventListener(
        "annotations.press",
        cleanup.handleAnnotationClick,
      );

      // Remove scroll listeners
      cleanup.originalScrollElement?.removeEventListener(
        "scroll",
        cleanup.originalScrollHandler,
      );
      cleanup.changedScrollElement?.removeEventListener(
        "scroll",
        cleanup.changedScrollHandler,
      );

      // Remove view state listeners from original instance
      cleanup.originalInstance.removeEventListener(
        "viewState.currentPageIndex.change",
        cleanup.syncOriginalToChanged,
      );
      cleanup.originalInstance.removeEventListener(
        "viewState.zoom.change",
        cleanup.syncOriginalToChanged,
      );

      // Remove view state listeners from changed instance
      cleanup.changedInstance.removeEventListener(
        "viewState.currentPageIndex.change",
        cleanup.syncChangedToOriginal,
      );
      cleanup.changedInstance.removeEventListener(
        "viewState.zoom.change",
        cleanup.syncChangedToOriginal,
      );

      // Unload Nutrient Viewer instances
      if (originalContainerRef.current) {
        window.NutrientViewer?.unload(originalContainerRef.current);
      }
      if (changedContainerRef.current) {
        window.NutrientViewer?.unload(changedContainerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      {/* Header */}
      <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
        <div className="max-w-full mx-auto px-6 py-4">
          <Link
            href="/web-sdk"
            className="text-sm opacity-60 hover:opacity-100 mb-2 inline-block"
          >
            ← Back to Web SDK Samples
          </Link>
          <h1 className="!mb-2">Text Comparison</h1>
          <p className="text-lg opacity-80">
            Side-by-side PDF comparison with synchronized viewing and
            interactive change tracking
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-12 h-[calc(100vh-140px)]">
        {/* Original document viewer */}
        <div className="col-span-5 border-r border-[var(--warm-gray-400)] flex flex-col">
          <div className="bg-[var(--warm-gray-100)] dark:bg-[var(--warm-gray-900)] border-b border-[var(--warm-gray-400)]">
            <p className="text-center p-3 font-medium">{originalDoc}</p>
          </div>
          <div
            id="original-document-viewer"
            ref={originalContainerRef}
            className="flex-1"
            style={{ minHeight: 0 }}
          />
        </div>

        {/* Changed document viewer */}
        <div className="col-span-5 border-r border-[var(--warm-gray-400)] flex flex-col">
          <div className="bg-[var(--warm-gray-100)] dark:bg-[var(--warm-gray-900)] border-b border-[var(--warm-gray-400)]">
            <p className="text-center p-3 font-medium">{changedDoc}</p>
          </div>
          <div
            id="changed-document-viewer"
            ref={changedContainerRef}
            className="flex-1"
            style={{ minHeight: 0 }}
          />
        </div>

        {/* Changes sidebar */}
        <div className="col-span-2 flex flex-col h-full">
          <div className="border-b border-[var(--warm-gray-400)]">
            <div className="flex justify-between items-center p-3">
              <p className="font-medium">
                {operationsMap.size} Change{operationsMap.size !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={toggleScrollLock}
                  className="p-1 px-2 border border-[var(--warm-gray-400)] rounded hover:bg-[var(--warm-gray-100)] transition-colors"
                  title={
                    isScrollLocked ? "Unlock scroll sync" : "Lock scroll sync"
                  }
                >
                  {isScrollLocked ? "🔒" : "🔓"}
                </button>
                <button
                  type="button"
                  onClick={handlePreviousChange}
                  disabled={selectedChangeIndex === 0}
                  className="p-1 px-2 border border-[var(--warm-gray-400)] rounded hover:bg-[var(--warm-gray-100)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous change"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handleNextChange}
                  disabled={selectedChangeIndex === operationsMap.size - 1}
                  className="p-1 px-2 border border-[var(--warm-gray-400)] rounded hover:bg-[var(--warm-gray-100)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next change"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(() => {
              const changesByPage = new Map<
                number,
                Array<[string, ChangeOperation, number]>
              >();
              Array.from(operationsMap).forEach(([key, value], index) => {
                const pageIndex = value.pageIndex ?? 0;
                if (!changesByPage.has(pageIndex)) {
                  changesByPage.set(pageIndex, []);
                }
                const pageChanges = changesByPage.get(pageIndex);
                if (pageChanges) {
                  pageChanges.push([key, value, index]);
                }
              });

              const sortedPages = Array.from(changesByPage.keys()).sort(
                (a, b) => a - b,
              );

              return sortedPages.map((pageIndex) => {
                const pageChanges = changesByPage.get(pageIndex);
                if (!pageChanges) return null;

                return (
                  <div key={`page-${pageIndex}`}>
                    <div className="bg-[var(--warm-gray-100)] dark:bg-[var(--warm-gray-900)] p-2 text-sm font-medium sticky top-0">
                      Page {pageIndex + 1}
                    </div>
                    {pageChanges.map(([key, value, index]) => (
                      <button
                        key={key}
                        type="button"
                        className={`p-2 border rounded mx-auto mb-2 w-11/12 cursor-pointer transition-all text-left block ${
                          selectedChangeIndex === index
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900 border-2 shadow-md"
                            : "border-[var(--warm-gray-400)] hover:bg-[var(--warm-gray-100)] dark:hover:bg-[var(--warm-gray-800)]"
                        }`}
                        onClick={() => handleChangeClick(value, index)}
                      >
                        <div className="flex justify-between p-1 pl-0">
                          <div className="opacity-60 text-xs">
                            {value.insert && value.del
                              ? "replaced"
                              : value.insert
                                ? "inserted"
                                : "deleted"}
                          </div>
                          {plusMinusDisplayText(value)}
                        </div>
                        <div>
                          {value.deleteText && (
                            <p className="text-xs mb-0.5">
                              <span className="bg-[#FFC9CB] dark:bg-[#8B3A3A] px-1 rounded text-black dark:text-white">
                                {value.deleteText}
                              </span>
                            </p>
                          )}
                          {value.insertText && (
                            <p className="text-xs">
                              <span className="bg-[#C0D8EF] dark:bg-[#3A5A7A] px-1 rounded text-black dark:text-white">
                                {value.insertText}
                              </span>
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
