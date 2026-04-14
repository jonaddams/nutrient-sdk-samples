"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";

const SOURCE_DOCUMENT = "/documents/text-comparison-a.pdf";
const TARGET_DOCUMENT = "/documents/Drawing1.pdf";

interface PageInfo {
  uid: string;
  index: number;
  width: number;
  height: number;
  rotation: number;
  thumbnailUrl: string;
}

interface DocState {
  pages: PageInfo[];
  selectedIndexes: Set<number>;
  isLoading: boolean;
  fileName: string;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  pageIndex: number;
  panel: "source" | "target";
}

type DragData = {
  panel: "source" | "target";
  pageIndexes: number[];
};

function generateUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse multi-select input like "1, 3, 5-10" into zero-based indexes */
function parsePageSelection(input: string, totalPages: number): number[] {
  const indexes = new Set<number>();
  for (const part of input.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.split("-").map((s) => Number.parseInt(s.trim(), 10));
    if (range.length === 1 && !Number.isNaN(range[0])) {
      const idx = range[0] - 1;
      if (idx >= 0 && idx < totalPages) indexes.add(idx);
    } else if (
      range.length === 2 &&
      !Number.isNaN(range[0]) &&
      !Number.isNaN(range[1])
    ) {
      const start = Math.max(0, range[0] - 1);
      const end = Math.min(totalPages - 1, range[1] - 1);
      for (let i = start; i <= end; i++) indexes.add(i);
    }
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

async function loadDocumentThumbnails(
  documentSource: string | ArrayBuffer,
  fileName: string,
): Promise<PageInfo[]> {
  const { NutrientViewer } = window;
  if (!NutrientViewer) throw new Error("Nutrient Viewer SDK not loaded");

  const tempContainer = document.createElement("div");
  tempContainer.style.display = "none";
  document.body.appendChild(tempContainer);

  try {
    const instance = await NutrientViewer.load({
      container: tempContainer,
      document: documentSource,
      headless: true,
      pageRendering: "next",
      allowLinearizedLoading: false,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    });

    const pageCount = instance.totalPageCount;
    const pages: PageInfo[] = [];

    for (let i = 0; i < pageCount; i++) {
      const info = await instance.pageInfoForIndex(i);
      if (!info) continue;
      const thumbWidth = Math.min(info.width, 600);
      const thumbnailUrl = await instance.renderPageAsImageURL(
        { width: thumbWidth },
        i,
      );
      pages.push({
        uid: generateUid(),
        index: i,
        width: info.width,
        height: info.height,
        rotation: info.rotation || 0,
        thumbnailUrl,
      });
    }

    await NutrientViewer.unload(tempContainer);
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }

    return pages;
  } catch (err) {
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
    throw err;
  }
}

export default function DocumentAssemblyViewer() {
  const [sourceDoc, setSourceDoc] = useState<DocState>({
    pages: [],
    selectedIndexes: new Set(),
    isLoading: true,
    fileName: "text-comparison-a.pdf",
  });

  const [targetDoc, setTargetDoc] = useState<DocState>({
    pages: [],
    selectedIndexes: new Set(),
    isLoading: true,
    fileName: "Drawing1.pdf",
  });

  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    show: false,
    x: 0,
    y: 0,
    pageIndex: 0,
    panel: "source",
  });

  const [dragData, setDragData] = useState<DragData | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    panel: "source" | "target";
    index: number;
  } | null>(null);
  const [sourceSelectInput, setSourceSelectInput] = useState("");
  const [targetSelectInput, setTargetSelectInput] = useState("");

  // Load initial documents
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const [sourcePages, targetPages] = await Promise.all([
          loadDocumentThumbnails(SOURCE_DOCUMENT, "text-comparison-a.pdf"),
          loadDocumentThumbnails(TARGET_DOCUMENT, "Drawing1.pdf"),
        ]);
        if (!mounted) return;
        setSourceDoc((prev) => ({
          ...prev,
          pages: sourcePages,
          isLoading: false,
        }));
        setTargetDoc((prev) => ({
          ...prev,
          pages: targetPages,
          isLoading: false,
        }));
      } catch (err) {
        console.error("Failed to load documents:", err);
        if (mounted) {
          setSourceDoc((prev) => ({ ...prev, isLoading: false }));
          setTargetDoc((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu.show) return;
    const handler = () => setContextMenu((prev) => ({ ...prev, show: false }));
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu.show]);

  // --- Selection ---
  const handleThumbClick = useCallback(
    (panel: "source" | "target", index: number, e: React.MouseEvent) => {
      const setDoc = panel === "source" ? setSourceDoc : setTargetDoc;
      setDoc((prev) => {
        const newSet = new Set(prev.selectedIndexes);
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          if (newSet.has(index)) newSet.delete(index);
          else newSet.add(index);
        } else {
          newSet.clear();
          newSet.add(index);
        }
        return { ...prev, selectedIndexes: newSet };
      });
    },
    [],
  );

  const handleSelectFromInput = useCallback(
    (panel: "source" | "target") => {
      const input = panel === "source" ? sourceSelectInput : targetSelectInput;
      const doc = panel === "source" ? sourceDoc : targetDoc;
      const setDoc = panel === "source" ? setSourceDoc : setTargetDoc;
      const indexes = parsePageSelection(input, doc.pages.length);
      setDoc((prev) => ({ ...prev, selectedIndexes: new Set(indexes) }));
    },
    [
      sourceSelectInput,
      targetSelectInput,
      sourceDoc.pages.length,
      targetDoc.pages.length,
    ],
  );

  // --- Drag and Drop ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, panel: "source" | "target", pageIndex: number) => {
      const doc = panel === "source" ? sourceDoc : targetDoc;
      // If dragging a selected page, drag all selected; otherwise just this one
      const pageIndexes = doc.selectedIndexes.has(pageIndex)
        ? Array.from(doc.selectedIndexes).sort((a, b) => a - b)
        : [pageIndex];

      const data: DragData = { panel, pageIndexes };
      setDragData(data);
      e.dataTransfer.effectAllowed = "copyMove";
      e.dataTransfer.setData("text/plain", JSON.stringify(data));
    },
    [sourceDoc.selectedIndexes, targetDoc.selectedIndexes],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, panel: "source" | "target", index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropTarget({ panel, index });
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragData(null);
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (
      e: React.DragEvent,
      targetPanel: "source" | "target",
      dropIndex: number,
    ) => {
      e.preventDefault();
      let data: DragData;
      try {
        data = JSON.parse(e.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }

      const fromPanel = data.panel;
      const pageIndexes = data.pageIndexes;
      const getDoc = (p: "source" | "target") =>
        p === "source" ? sourceDoc : targetDoc;
      const setFrom = fromPanel === "source" ? setSourceDoc : setTargetDoc;
      const setTo = targetPanel === "source" ? setSourceDoc : setTargetDoc;

      if (fromPanel === targetPanel) {
        // Reorder within same panel
        setTo((prev) => {
          const moving = pageIndexes.map((i) => prev.pages[i]).filter(Boolean);
          const remaining = prev.pages.filter(
            (_, i) => !pageIndexes.includes(i),
          );
          // Adjust drop index for removed items before it
          const adjustedDrop =
            dropIndex - pageIndexes.filter((i) => i < dropIndex).length;
          const newPages = [
            ...remaining.slice(0, adjustedDrop),
            ...moving,
            ...remaining.slice(adjustedDrop),
          ].map((p, idx) => ({ ...p, index: idx }));
          return { ...prev, pages: newPages, selectedIndexes: new Set() };
        });
      } else {
        // Move pages from one panel to another
        const fromDoc = getDoc(fromPanel);
        const movingPages = pageIndexes
          .map((i) => fromDoc.pages[i])
          .filter(Boolean)
          .map((p) => ({ ...p, uid: generateUid() }));

        // Add to target at drop position
        setTo((prev) => {
          const newPages = [
            ...prev.pages.slice(0, dropIndex),
            ...movingPages,
            ...prev.pages.slice(dropIndex),
          ].map((p, idx) => ({ ...p, index: idx }));
          return { ...prev, pages: newPages, selectedIndexes: new Set() };
        });

        // Remove from source
        setFrom((prev) => {
          const newPages = prev.pages
            .filter((_, i) => !pageIndexes.includes(i))
            .map((p, idx) => ({ ...p, index: idx }));
          return { ...prev, pages: newPages, selectedIndexes: new Set() };
        });
      }

      setDragData(null);
      setDropTarget(null);
    },
    [sourceDoc, targetDoc],
  );

  // --- Context Menu ---
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, panel: "source" | "target", pageIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        pageIndex,
        panel,
      });
    },
    [],
  );

  const handleContextAction = useCallback(
    (action: string) => {
      const { panel, pageIndex } = contextMenu;
      const setDoc = panel === "source" ? setSourceDoc : setTargetDoc;

      switch (action) {
        case "delete":
          setDoc((prev) => {
            const newPages = prev.pages
              .filter((_, i) => i !== pageIndex)
              .map((p, idx) => ({ ...p, index: idx }));
            return { ...prev, pages: newPages, selectedIndexes: new Set() };
          });
          break;

        case "duplicate":
          setDoc((prev) => {
            const page = prev.pages[pageIndex];
            if (!page) return prev;
            const dup = { ...page, uid: generateUid() };
            const newPages = [
              ...prev.pages.slice(0, pageIndex + 1),
              dup,
              ...prev.pages.slice(pageIndex + 1),
            ].map((p, idx) => ({ ...p, index: idx }));
            return { ...prev, pages: newPages };
          });
          break;

        case "rotateCW":
          setDoc((prev) => ({
            ...prev,
            pages: prev.pages.map((p, i) =>
              i === pageIndex ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
            ),
          }));
          break;

        case "rotateCCW":
          setDoc((prev) => ({
            ...prev,
            pages: prev.pages.map((p, i) =>
              i === pageIndex
                ? { ...p, rotation: (p.rotation + 270) % 360 }
                : p,
            ),
          }));
          break;

        case "moveToTop":
          setDoc((prev) => {
            const page = prev.pages[pageIndex];
            if (!page) return prev;
            const rest = prev.pages.filter((_, i) => i !== pageIndex);
            const newPages = [page, ...rest].map((p, idx) => ({
              ...p,
              index: idx,
            }));
            return { ...prev, pages: newPages };
          });
          break;

        case "moveToBottom":
          setDoc((prev) => {
            const page = prev.pages[pageIndex];
            if (!page) return prev;
            const rest = prev.pages.filter((_, i) => i !== pageIndex);
            const newPages = [...rest, page].map((p, idx) => ({
              ...p,
              index: idx,
            }));
            return { ...prev, pages: newPages };
          });
          break;
      }

      setContextMenu((prev) => ({ ...prev, show: false }));
    },
    [contextMenu],
  );

  // --- File Upload ---
  const handleFileUpload = useCallback(
    async (panel: "source" | "target", file: File) => {
      const setDoc = panel === "source" ? setSourceDoc : setTargetDoc;
      setDoc((prev) => ({ ...prev, isLoading: true }));

      try {
        const buffer = await file.arrayBuffer();
        const pages = await loadDocumentThumbnails(buffer, file.name);
        setDoc({
          pages,
          selectedIndexes: new Set(),
          isLoading: false,
          fileName: file.name,
        });
      } catch (err) {
        console.error("Failed to load uploaded file:", err);
        setDoc((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [],
  );

  // --- Try Merging ---
  const handleTryMerging = useCallback(() => {
    if (sourceDoc.pages.length === 0) return;
    const movingPages = sourceDoc.pages.map((p) => ({
      ...p,
      uid: generateUid(),
    }));
    setTargetDoc((prev) => {
      const newPages = [...prev.pages, ...movingPages].map((p, idx) => ({
        ...p,
        index: idx,
      }));
      return { ...prev, pages: newPages };
    });
    setSourceDoc((prev) => ({
      ...prev,
      pages: [],
      selectedIndexes: new Set(),
    }));
  }, [sourceDoc.pages]);

  // --- Export ---
  const handleExport = useCallback(
    async (panel: "source" | "target") => {
      const doc = panel === "source" ? sourceDoc : targetDoc;
      if (doc.pages.length === 0) return;

      // We need to reconstruct the document from the page thumbnails.
      // For a real implementation, we would track the original document
      // blobs and use exportPDFWithOperations. For this demo, we show
      // the concept by alerting with the page order.
      const pageOrder = doc.pages.map((p) => p.index + 1).join(", ");
      alert(
        `Export would produce a PDF with ${doc.pages.length} pages.\n` +
          `Page order: ${pageOrder}\n\n` +
          `In production, this would use instance.exportPDFWithOperations() ` +
          `with importDocument and keepPages operations to produce the final PDF.`,
      );
    },
    [sourceDoc, targetDoc],
  );

  // --- Delete selected ---
  const handleDeleteSelected = useCallback(
    (panel: "source" | "target") => {
      const setDoc = panel === "source" ? setSourceDoc : setTargetDoc;
      const doc = panel === "source" ? sourceDoc : targetDoc;
      if (doc.selectedIndexes.size === 0) return;
      setDoc((prev) => {
        const newPages = prev.pages
          .filter((_, i) => !prev.selectedIndexes.has(i))
          .map((p, idx) => ({ ...p, index: idx }));
        return { ...prev, pages: newPages, selectedIndexes: new Set() };
      });
    },
    [sourceDoc.selectedIndexes, targetDoc.selectedIndexes],
  );

  // --- Render ---
  if (sourceDoc.isLoading || targetDoc.isLoading) {
    return (
      <div className="assembly-loading">
        <div className="assembly-loading-inner">
          <div className="assembly-loading-spinner" />
          <div className="assembly-loading-text">Loading documents...</div>
          <div className="assembly-loading-subtext">
            Generating page thumbnails
          </div>
        </div>
      </div>
    );
  }

  const renderPanel = (panel: "source" | "target") => {
    const doc = panel === "source" ? sourceDoc : targetDoc;
    const selectInput =
      panel === "source" ? sourceSelectInput : targetSelectInput;
    const setSelectInput =
      panel === "source" ? setSourceSelectInput : setTargetSelectInput;

    return (
      <div className="assembly-panel">
        <div className="assembly-panel-header">
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="assembly-panel-title">
              {panel === "source" ? "Source" : "Target"}
            </span>
            <span className="assembly-panel-subtitle">
              {doc.fileName} — {doc.pages.length} pages
            </span>
          </div>
          <div className="assembly-toolbar-group">
            <label className="assembly-upload-label">
              Upload
              <input
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(panel, file);
                  e.target.value = "";
                }}
              />
            </label>
            {panel === "target" && (
              <button
                type="button"
                className="assembly-btn assembly-btn-primary"
                onClick={() => handleExport(panel)}
                disabled={doc.pages.length === 0}
              >
                Export PDF
              </button>
            )}
          </div>
        </div>

        {doc.pages.length === 0 ? (
          <div
            className={`assembly-empty-drop ${
              dropTarget?.panel === panel ? "active" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, panel, 0)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, panel, 0)}
          >
            <p>Drag pages here or upload a PDF</p>
          </div>
        ) : (
          <div
            className="assembly-thumbnails"
            onDragOver={(e) => {
              // Allow dropping after last page when hovering the empty space
              e.preventDefault();
              if (!(e.target as HTMLElement).closest(".assembly-thumb")) {
                setDropTarget({ panel, index: doc.pages.length });
              }
            }}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              if (!(e.target as HTMLElement).closest(".assembly-thumb")) {
                handleDrop(e, panel, doc.pages.length);
              }
            }}
          >
            {doc.pages.map((page, idx) => {
              const isSelected = doc.selectedIndexes.has(idx);
              const isDragging =
                dragData?.panel === panel && dragData.pageIndexes.includes(idx);
              const isDropBefore =
                dropTarget?.panel === panel && dropTarget.index === idx;
              const isDropAfter =
                idx === doc.pages.length - 1 &&
                dropTarget?.panel === panel &&
                dropTarget.index === doc.pages.length;

              return (
                <div
                  key={page.uid}
                  style={{ display: "flex", alignItems: "stretch" }}
                >
                  {/* Drop indicator before */}
                  <div
                    className={`assembly-drop-indicator ${isDropBefore ? "active" : ""}`}
                    onDragOver={(e) => handleDragOver(e, panel, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, panel, idx)}
                  />

                  <button
                    type="button"
                    className={`assembly-thumb ${isSelected ? (doc.selectedIndexes.size > 1 ? "selected-multi" : "selected") : ""} ${isDragging ? "dragging" : ""}`}
                    onClick={(e) => handleThumbClick(panel, idx, e)}
                    onContextMenu={(e) => handleContextMenu(e, panel, idx)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, panel, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Determine if dropping on left or right half of thumbnail
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const midX = rect.left + rect.width / 2;
                      const insertIdx = e.clientX < midX ? idx : idx + 1;
                      setDropTarget({ panel, index: insertIdx });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const midX = rect.left + rect.width / 2;
                      const insertIdx = e.clientX < midX ? idx : idx + 1;
                      handleDrop(e, panel, insertIdx);
                    }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: Dynamic data URL from PDF rendering */}
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${idx + 1}`}
                      style={{
                        transform: `rotate(${page.rotation}deg)`,
                        transition: "transform 0.3s ease",
                      }}
                    />
                    <div className="assembly-thumb-label">{idx + 1}</div>
                    <span
                      className="assembly-thumb-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        setContextMenu({
                          show: true,
                          x: rect.left,
                          y: rect.bottom + 4,
                          pageIndex: idx,
                          panel,
                        });
                      }}
                      onKeyDown={() => {}}
                      role="button"
                      tabIndex={-1}
                    >
                      ⋮
                    </span>
                  </button>

                  {/* Drop indicator after last */}
                  {isDropAfter && (
                    <div
                      className="assembly-drop-indicator active"
                      onDragOver={(e) =>
                        handleDragOver(e, panel, doc.pages.length)
                      }
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, panel, doc.pages.length)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with multi-select and delete */}
        <div className="assembly-panel-footer">
          <input
            type="text"
            className="assembly-multiselect-input"
            placeholder="e.g. 1, 3, 5-10"
            value={selectInput}
            onChange={(e) => setSelectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSelectFromInput(panel);
            }}
          />
          <button
            type="button"
            className="assembly-btn assembly-btn-secondary"
            onClick={() => handleSelectFromInput(panel)}
          >
            Select
          </button>
          <button
            type="button"
            className="assembly-btn assembly-btn-danger"
            onClick={() => handleDeleteSelected(panel)}
            disabled={doc.selectedIndexes.size === 0}
          >
            Delete ({doc.selectedIndexes.size})
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="assembly-wrapper">
      {/* Top toolbar */}
      <div className="assembly-toolbar">
        <div className="assembly-toolbar-group">
          <span className="assembly-toolbar-title">
            Drag pages between panels to assemble your document
          </span>
        </div>
        <div className="assembly-toolbar-group">
          <button
            type="button"
            className="assembly-btn assembly-btn-success"
            onClick={handleTryMerging}
            disabled={sourceDoc.pages.length === 0}
          >
            Try Merging →
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="assembly-panels">
        {renderPanel("source")}
        <div className="assembly-divider" />
        {renderPanel("target")}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="assembly-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={() => {}}
          role="menu"
          tabIndex={-1}
        >
          <button
            type="button"
            className="assembly-context-item"
            onClick={() => handleContextAction("duplicate")}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="assembly-context-item"
            onClick={() => handleContextAction("rotateCW")}
          >
            Rotate Clockwise
          </button>
          <button
            type="button"
            className="assembly-context-item"
            onClick={() => handleContextAction("rotateCCW")}
          >
            Rotate Counter-Clockwise
          </button>
          <div className="assembly-context-separator" />
          <button
            type="button"
            className="assembly-context-item"
            onClick={() => handleContextAction("moveToTop")}
          >
            Move to Top
          </button>
          <button
            type="button"
            className="assembly-context-item"
            onClick={() => handleContextAction("moveToBottom")}
          >
            Move to Bottom
          </button>
          <div className="assembly-context-separator" />
          <button
            type="button"
            className="assembly-context-item danger"
            onClick={() => handleContextAction("delete")}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
