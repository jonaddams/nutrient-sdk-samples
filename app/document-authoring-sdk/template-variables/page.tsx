"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";
import type { DocAuthEditor, DocAuthSystem } from "../types";
import type { TemplateVariable } from "./data/variables";
import { SAMPLE_VALUES } from "./data/variables";
import { buildInvoiceTemplate } from "./data/invoice-template";
import EditorPanel from "./components/editor-panel";
import VariableSidebar from "./components/variable-sidebar";
import ExportBar from "./components/export-bar";

export default function TemplateVariablesPage() {
  const [docAuthSystem, setDocAuthSystem] = useState<DocAuthSystem | null>(null);
  const [editor, setEditor] = useState<DocAuthEditor | null>(null);
  const [lastInserted, setLastInserted] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const sdkInitialized = useRef(false);
  const lastInsertedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize DocAuthSystem
  useEffect(() => {
    if (sdkInitialized.current) return;

    const init = async () => {
      let attempts = 0;
      while (!window.DocAuth && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        attempts++;
      }

      if (!window.DocAuth) {
        console.error("Document Authoring SDK not loaded");
        return;
      }

      try {
        const system = await window.DocAuth.createDocAuthSystem();
        setDocAuthSystem(system);
        sdkInitialized.current = true;
      } catch (error) {
        console.error("Failed to create DocAuthSystem:", error);
      }
    };

    init();
  }, []);

  // SDK error suppression (same pattern as Document Builder)
  useEffect(() => {
    const handleSDKError = (event: ErrorEvent): boolean | undefined => {
      const filename = event.filename || "";
      const message = event.message || "";
      const stack = event.error?.stack || "";
      if (
        filename.includes("docauth-impl") ||
        filename.includes("document-authoring.cdn.nutrient.io") ||
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io") ||
        message.includes("IntersectionObserver")
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
      return true;
    };

    const handleSDKRejection = (
      event: PromiseRejectionEvent,
    ): boolean | undefined => {
      const stack = event.reason?.stack || "";
      if (
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io")
      ) {
        event.preventDefault();
        return false;
      }
      return true;
    };

    const OriginalIntersectionObserver = window.IntersectionObserver;
    if (OriginalIntersectionObserver) {
      window.IntersectionObserver = class extends OriginalIntersectionObserver {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          const safeCallback: IntersectionObserverCallback = (
            entries,
            observer,
          ) => {
            try {
              callback(entries, observer);
            } catch {
              return;
            }
          };
          super(safeCallback, options);
        }
      };
    }

    window.addEventListener("error", handleSDKError);
    window.addEventListener("unhandledrejection", handleSDKRejection);

    return () => {
      window.removeEventListener("error", handleSDKError);
      window.removeEventListener("unhandledrejection", handleSDKRejection);
      if (OriginalIntersectionObserver) {
        window.IntersectionObserver = OriginalIntersectionObserver;
      }
    };
  }, []);

  const handleEditorReady = useCallback((ed: DocAuthEditor) => {
    setEditor(ed);
  }, []);

  // Insert variable at cursor position
  const handleInsertVariable = useCallback(
    (variable: TemplateVariable) => {
      if (!editor) return;

      const token = `{{${variable.token}}}`;
      try {
        editor.insertTextAtCursor(token);
      } catch {
        // Fallback: log guidance if insertTextAtCursor isn't available
        console.warn(
          "insertTextAtCursor not available. Place cursor in editor first, then click a variable.",
        );
        return;
      }

      // Show insertion feedback for 2 seconds
      setLastInserted(variable.token);
      if (lastInsertedTimer.current) clearTimeout(lastInsertedTimer.current);
      lastInsertedTimer.current = setTimeout(() => setLastInserted(null), 2000);
    },
    [editor],
  );

  // Preview toggle: replace {{variables}} with sample values
  const handleTogglePreview = useCallback(async () => {
    if (!docAuthSystem || !editor) return;

    if (isPreviewing) {
      // Restore original template
      const templateJson = buildInvoiceTemplate();
      const doc = await docAuthSystem.loadDocument(templateJson);
      editor.setCurrentDocument(doc);
      setIsPreviewing(false);
    } else {
      // Get current document JSON, replace tokens, reload
      try {
        const jsonString = await editor.currentDocument().saveDocumentJSONString();
        let replaced = jsonString;
        for (const [token, sampleValue] of Object.entries(SAMPLE_VALUES)) {
          replaced = replaced.replaceAll(`{{${token}}}`, sampleValue);
        }
        const doc = await docAuthSystem.loadDocument(JSON.parse(replaced));
        editor.setCurrentDocument(doc);
        setIsPreviewing(true);
      } catch (error) {
        console.error("Preview failed:", error);
      }
    }
  }, [docAuthSystem, editor, isPreviewing]);

  const currentDocument = editor?.currentDocument() ?? null;

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <PageHeader
        title="Template Variables"
        description="Insert template variables from a sidebar instead of typing them manually"
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Document Authoring SDK",
            href: "/document-authoring-sdk",
          },
        ]}
      />

      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr]">
        {/* Left: Variable Sidebar */}
        <div className="bg-gray-900 border-r border-gray-700 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <VariableSidebar
              onInsert={handleInsertVariable}
              lastInserted={lastInserted}
            />
          </div>

          {/* Bottom controls */}
          <div className="p-5 space-y-3 border-t border-gray-700">
            {/* Preview toggle */}
            <button
              type="button"
              onClick={handleTogglePreview}
              disabled={!editor}
              className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isPreviewing
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600"
              }`}
            >
              {isPreviewing ? "\u2190 Back to Template" : "Preview with Sample Data"}
            </button>

            {/* Export */}
            <ExportBar document={currentDocument} />
          </div>
        </div>

        {/* Right: Editor */}
        <div className="relative overflow-hidden">
          <EditorPanel
            docAuthSystem={docAuthSystem}
            onEditorReady={handleEditorReady}
          />
        </div>
      </div>
    </div>
  );
}
