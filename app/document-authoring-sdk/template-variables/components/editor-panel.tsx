"use client";

import { useEffect, useRef, useState } from "react";
import type { DocAuthEditor, DocAuthSystem } from "../../types";
import { buildInvoiceTemplate } from "../data/invoice-template";

interface EditorPanelProps {
  docAuthSystem: DocAuthSystem | null;
  onEditorReady: (editor: DocAuthEditor) => void;
}

export default function EditorPanel({
  docAuthSystem,
  onEditorReady,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DocAuthEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (!docAuthSystem || !containerRef.current || isInitializing.current) {
      return;
    }

    const container = containerRef.current;

    const init = async () => {
      isInitializing.current = true;
      setIsLoading(true);

      try {
        // Load the invoice template
        const templateJson = buildInvoiceTemplate();
        const doc = await docAuthSystem.loadDocument(templateJson);

        // Wait for DOM to settle
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Set explicit dimensions required by SDK
        container.style.position = "relative";
        container.style.overflow = "hidden";
        const rect = container.getBoundingClientRect();
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height || 600}px`;

        // Create editor
        const editor = await docAuthSystem.createEditor(container, {
          document: doc,
        });
        editorRef.current = editor;
        onEditorReady(editor);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing editor:", error);
        setIsLoading(false);
      } finally {
        isInitializing.current = false;
      }
    };

    init();

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch {
          // Editor cleanup can fail silently
        }
        editorRef.current = null;
      }
    };
  }, [docAuthSystem, onEditorReady]);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-200">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading editor...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        id="template-variables-editor"
      />
    </div>
  );
}
