"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";
import type { DocAuthEditor, DocAuthSystem } from "../types";
import DocumentPreview from "./components/document-preview";
import ReportForm from "./components/report-form";
import {
  DEFAULT_FORM_STATE,
  type ReportFormState,
  useDocumentBuilder,
} from "./hooks/use-document-builder";

export default function DocumentBuilderPage() {
  const [docAuthSystem, setDocAuthSystem] = useState<DocAuthSystem | null>(
    null,
  );
  const [editor, setEditor] = useState<DocAuthEditor | null>(null);
  const [formState, setFormState] =
    useState<ReportFormState>(DEFAULT_FORM_STATE);
  const sdkInitialized = useRef(false);

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
        console.error("❌ Document Authoring SDK not loaded");
        return;
      }

      try {
        const system = await window.DocAuth.createDocAuthSystem();
        setDocAuthSystem(system);
        sdkInitialized.current = true;
      } catch (error) {
        console.error("❌ Failed to create DocAuthSystem:", error);
      }
    };

    init();
  }, []);

  // SDK error suppression (same pattern as Document Generator)
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

  // Hook that rebuilds the document on form state changes
  useDocumentBuilder(docAuthSystem, editor, formState);

  // Get the current document from the editor for exports
  const currentDocument = editor?.currentDocument() ?? null;

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <PageHeader
        title="Document Builder"
        description="Build documents programmatically using the transaction API"
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Document Authoring SDK",
            href: "/document-authoring-sdk",
          },
        ]}
      />

      <div className="flex-1 min-h-0 grid grid-cols-[38%_1fr]">
        {/* Left: Form Panel */}
        <div className="bg-gray-900 border-r border-gray-700 overflow-hidden">
          <ReportForm
            formState={formState}
            onChange={setFormState}
            document={currentDocument}
          />
        </div>

        {/* Right: Document Preview */}
        <div className="relative overflow-hidden">
          <DocumentPreview
            docAuthSystem={docAuthSystem}
            onEditorReady={handleEditorReady}
          />
        </div>
      </div>
    </div>
  );
}
