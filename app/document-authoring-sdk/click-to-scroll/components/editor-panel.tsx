"use client";

import { useEffect, useRef, useState } from "react";
import type { DocAuthEditor, DocAuthSystem } from "../../types";
import { SAMPLE_DOC_JSON } from "../data/sample-doc";

interface EditorPanelProps {
  docAuthSystem: DocAuthSystem | null;
  onEditorReady: (editor: DocAuthEditor, container: HTMLElement) => void;
}

export default function EditorPanel({
  docAuthSystem,
  onEditorReady,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DocAuthEditor | null>(null);
  const isInitializing = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!docAuthSystem || !containerRef.current || isInitializing.current) {
      return;
    }
    const container = containerRef.current;

    const init = async () => {
      isInitializing.current = true;
      setIsLoading(true);
      try {
        const doc = await docAuthSystem.loadDocument(SAMPLE_DOC_JSON);

        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));

        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        container.style.position = "relative";
        container.style.overflow = "hidden";
        const rect = container.getBoundingClientRect();
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height || 600}px`;

        const editor = await docAuthSystem.createEditor(container, {
          document: doc,
        });
        editorRef.current = editor;
        onEditorReady(editor, container);
      } catch (error) {
        console.error("Click-to-scroll: editor init failed:", error);
      } finally {
        setIsLoading(false);
        isInitializing.current = false;
      }
    };

    init();

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch {
          // ignore
        }
        editorRef.current = null;
      }
    };
  }, [docAuthSystem, onEditorReady]);

  return (
    <div className="relative h-full flex flex-col bg-gray-100 dark:bg-gray-200">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading editor…</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        id="click-to-scroll-editor"
      />
    </div>
  );
}
