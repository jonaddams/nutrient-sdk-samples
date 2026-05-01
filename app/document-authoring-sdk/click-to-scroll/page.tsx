"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";
import type { DocAuthEditor, DocAuthSystem } from "../types";
import EditorPanel from "./components/editor-panel";
import OutlineSidebar from "./components/outline-sidebar";
import {
  extractOutline,
  getEditorScroller,
  type HeadingEntry,
  type MinimalDocument,
  scrollToFraction,
} from "./lib/outline";

export default function ClickToScrollPage() {
  const [docAuthSystem, setDocAuthSystem] = useState<DocAuthSystem | null>(
    null,
  );
  const [editor, setEditor] = useState<DocAuthEditor | null>(null);
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const editorContainerRef = useRef<HTMLElement | null>(null);
  const sdkInitialized = useRef(false);

  // Load DocAuth SDK from window (CDN bundle in app/layout.tsx).
  useEffect(() => {
    if (sdkInitialized.current) return;
    const init = async () => {
      let attempts = 0;
      while (!window.DocAuth && attempts < 50) {
        await new Promise((r) => setTimeout(r, 200));
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

  const handleEditorReady = useCallback(
    async (ed: DocAuthEditor, container: HTMLElement) => {
      setEditor(ed);
      editorContainerRef.current = container;
      setOutlineLoading(true);
      try {
        const doc = ed.currentDocument() as unknown as MinimalDocument;
        const found = await extractOutline(doc);
        setHeadings(found);
      } catch (error) {
        console.error("Click-to-scroll: outline extraction failed:", error);
        setHeadings([]);
      } finally {
        setOutlineLoading(false);
      }
    },
    [],
  );

  const handleSelect = useCallback(
    (index: number) => {
      const heading = headings[index];
      const container = editorContainerRef.current;
      if (!heading || !container) return;
      const scroller = getEditorScroller(container);
      if (!scroller) {
        console.warn(
          "Click-to-scroll: shadow scroll container not found — the SDK's internal DOM may have changed.",
        );
        return;
      }
      scrollToFraction(scroller, heading.fraction);
      setActiveIndex(index);
    },
    [headings],
  );

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <PageHeader
        title="Click-to-Scroll Outline"
        description="Sidebar outline that jumps to headings. Approximate — see notes in the sidebar."
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Document Authoring SDK",
            href: "/document-authoring-sdk",
          },
        ]}
      />

      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr]">
        <OutlineSidebar
          headings={headings}
          activeIndex={activeIndex}
          onSelect={handleSelect}
          isLoading={outlineLoading || !editor}
        />
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
