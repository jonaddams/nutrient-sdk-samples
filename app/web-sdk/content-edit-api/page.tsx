"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import { EditingSidebar } from "./_components/EditingSidebar";
import { ViewerErrorBoundary } from "@/app/web-sdk/_components/ViewerErrorBoundary";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { ViewerProvider } from "@/lib/context/ViewerContext";
import { addViewerEventListener } from "@/lib/events/viewerEvents";
import { VIEWER_EVENTS, TIMING } from "@/lib/constants";

const Viewer = dynamic(() => import("@/app/web-sdk/content-edit-api/viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

function ContentEditAPIContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isContentEditing, setIsContentEditing] = useState(false);

  // Prefetch PDF after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = "/sample-doc-with-google-fonts.pdf";
      document.head.appendChild(link);
    }, TIMING.PDF_PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Listen for editing state changes from the viewer
  useEffect(() => {
    const cleanupEditingState = addViewerEventListener(
      VIEWER_EVENTS.EDITING_STATE_CHANGE,
      ({ isEditing }) => {
        setIsEditing(isEditing);
        if (!isEditing) {
          setSelectedCount(0);
        }
      },
    );

    const cleanupSelectedBlocks = addViewerEventListener(
      VIEWER_EVENTS.SELECTED_BLOCKS_CHANGE,
      ({ selectedCount }) => {
        setSelectedCount(selectedCount);
      },
    );

    const cleanupContentEditing = addViewerEventListener(
      VIEWER_EVENTS.CONTENT_EDITING_STATE_CHANGE,
      ({ isContentEditing }) => {
        setIsContentEditing(isContentEditing);
      },
    );

    return () => {
      cleanupEditingState();
      cleanupSelectedBlocks();
      cleanupContentEditing();
    };
  }, []);

  // Note: Still using window.viewerInstance for backward compatibility
  // Will be replaced with useViewer() hook in viewer.tsx
  const handleDetectText = () => {
    if (!isContentEditing) {
      window.viewerInstance?.detectText?.();
    }
  };

  const handleFindReplace = () => {
    if (isEditing && !isContentEditing) {
      window.viewerInstance?.toggleFindReplace?.();
    }
  };

  const handleReword = () => {
    if (isEditing && selectedCount > 0 && !isContentEditing) {
      window.viewerInstance?.triggerAIReplace?.();
    }
  };

  const handleContentEdit = () => {
    if (!isEditing) {
      window.viewerInstance?.toggleContentEditor?.();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Content Editing API"
        description="Advanced content editing with text detection, find & replace, and AI text generation"
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <ViewerErrorBoundary>
            <Viewer document="/sample-doc-with-google-fonts.pdf" />
          </ViewerErrorBoundary>
        </main>

        <EditingSidebar
          isEditing={isEditing}
          selectedCount={selectedCount}
          isContentEditing={isContentEditing}
          onDetectTextClick={handleDetectText}
          onFindReplaceClick={handleFindReplace}
          onRewordClick={handleReword}
          onContentEditClick={handleContentEdit}
        />
      </div>
    </div>
  );
}

export default function ContentEditAPIPage() {
  return (
    <ViewerProvider>
      <ContentEditAPIContent />
    </ViewerProvider>
  );
}
