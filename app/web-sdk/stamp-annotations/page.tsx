"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { PlacedStamp } from "./viewer";
import { STAMP_TEMPLATES } from "./viewer";
import "./styles.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function StampAnnotationsPage() {
  const [creatorMode, setCreatorMode] = useState(false);
  const [draggingTemplate, setDraggingTemplate] = useState<string | null>(
    null,
  );
  const [stamps, setStamps] = useState<PlacedStamp[]>([]);
  const deleteStampRef = useRef<((groupId: string) => void) | null>(null);

  const handleStampsChanged = useCallback((newStamps: PlacedStamp[]) => {
    setStamps(newStamps);
  }, []);

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    templateId: string,
  ) => {
    if (!creatorMode) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text", templateId);
    event.dataTransfer.effectAllowed = "copy";
    setDraggingTemplate(templateId);
  };

  const handleDragEnd = () => {
    setDraggingTemplate(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Stamp Annotations"
        description="Toggle Stamp Creator Mode to drag and drop grouped stamp annotations onto a document. Each stamp contains an image background with interactive form fields. Toggle off to lock stamps in place — form fields remain interactive."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="stamp-wrapper">
            {/* Sidebar */}
            <div className="stamp-sidebar">
              {/* Creator Mode Toggle */}
              <div className="stamp-section">
                <label className="stamp-toggle-label">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={creatorMode}
                    onChange={() => setCreatorMode(!creatorMode)}
                  />
                  <div
                    className="stamp-toggle-track"
                    style={{
                      background: creatorMode
                        ? "var(--digital-pollen)"
                        : "var(--warm-gray-400)",
                    }}
                  >
                    <div
                      className="stamp-toggle-thumb"
                      style={{
                        transform: creatorMode
                          ? "translateX(1.25rem)"
                          : "translateX(0)",
                      }}
                    />
                  </div>
                  <span className="stamp-toggle-text">
                    Stamp Creator Mode
                  </span>
                </label>
              </div>

              {/* Stamp Library */}
              <div className="stamp-section">
                <div className="stamp-label">Stamp Library</div>
                <div className="stamp-templates">
                  {STAMP_TEMPLATES.map((template) => (
                    // biome-ignore lint/a11y/useSemanticElements: div required for draggable
                    <div
                      key={template.id}
                      role="button"
                      tabIndex={0}
                      className={`stamp-template-card ${
                        !creatorMode ? "stamp-template-disabled" : ""
                      } ${draggingTemplate === template.id ? "stamp-template-dragging" : ""}`}
                      draggable={creatorMode}
                      onDragStart={(e) => handleDragStart(e, template.id)}
                      onDragEnd={handleDragEnd}
                      onKeyDown={() => {}}
                    >
                      <div
                        className="stamp-template-color"
                        style={{ backgroundColor: template.color }}
                      />
                      <div className="stamp-template-info">
                        <span className="stamp-template-name">
                          {template.name}
                        </span>
                        <span className="stamp-template-desc">
                          {template.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Placed Stamps */}
              <div
                className="stamp-section"
                style={{ flex: 1, minHeight: 0 }}
              >
                <div className="stamp-label">
                  Placed Stamps ({stamps.length})
                </div>
                {stamps.length === 0 ? (
                  <div className="stamp-empty">
                    {creatorMode
                      ? "Drag a stamp from the library above and drop it onto the document"
                      : "Enable Stamp Creator Mode to place stamps on the document"}
                  </div>
                ) : (
                  <ul className="stamp-list">
                    {stamps.map((stamp) => {
                      const template = STAMP_TEMPLATES.find(
                        (t) => t.id === stamp.templateId,
                      );
                      return (
                        <li key={stamp.groupId} className="stamp-list-item">
                          <div
                            className="stamp-list-color"
                            style={{
                              backgroundColor: template?.color ?? "#999",
                            }}
                          />
                          <div className="stamp-list-info">
                            <span className="stamp-list-name">
                              {template?.name ?? stamp.templateId}
                            </span>
                            <span className="stamp-list-meta">
                              Page {stamp.pageIndex + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="stamp-delete-btn"
                            title="Delete stamp"
                            onClick={() => deleteStampRef.current?.(stamp.groupId)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <title>Delete</title>
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Info */}
              <div className="stamp-info">
                <p>
                  <strong>Creator mode on:</strong> Drag stamps onto the
                  document. Stamps can be moved and deleted as a group.
                </p>
                <p style={{ marginTop: 6 }}>
                  <strong>Creator mode off:</strong> Stamps are locked in
                  place. Form fields remain interactive for end users.
                </p>
              </div>
            </div>

            {/* Viewer */}
            <section className="stamp-viewer-container">
              <Viewer
                creatorMode={creatorMode}
                onStampsChanged={handleStampsChanged}
                deleteStampRef={deleteStampRef}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
