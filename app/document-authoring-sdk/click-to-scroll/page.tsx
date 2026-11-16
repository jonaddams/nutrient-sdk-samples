"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SampleCanvas } from "@/app/_components/SampleCanvas";
import type { DocAuthEditor, DocAuthSystem } from "../types";
import EditorPanel from "./components/editor-panel";
import OutlineSidebar from "./components/outline-sidebar";
import {
  extractOutline,
  type HeadingEntry,
  type MinimalDocument,
} from "./lib/outline";

export default function ClickToScrollPage() {
  const [docAuthSystem, setDocAuthSystem] = useState<DocAuthSystem | null>(
    null,
  );
  const [editor, setEditor] = useState<DocAuthEditor | null>(null);
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const highlightRef = useRef<{ remove: () => void } | null>(null);
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

  const handleEditorReady = useCallback(async (ed: DocAuthEditor) => {
    setEditor(ed);
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
  }, []);

  const handleSelect = useCallback(
    async (index: number) => {
      const heading = headings[index];
      if (!heading || !editor) return;
      setActiveIndex(index);
      try {
        const matches = await editor.find.search(heading.text);
        const match = matches[heading.matchIndex] ?? matches[0];
        if (!match) return;
        const nav = await editor.navigateTo(match.location);
        if (!nav.ok) {
          console.warn("Click-to-scroll: cannot navigate:", nav.reason);
          return;
        }
        highlightRef.current?.remove();
        const hl = await editor.addVisualHighlight(match.location);
        highlightRef.current = hl.ok ? hl.highlight : null;
      } catch (error) {
        console.error("Click-to-scroll: navigation failed:", error);
      }
    },
    [headings, editor],
  );

  return (
    <SampleCanvas
      title="Click-to-Scroll Outline"
      description="Sidebar outline that jumps to headings with the Find and navigateTo APIs."
      breadcrumbs={[
        { label: "Home", href: "/" },
        {
          label: "Document Authoring SDK",
          href: "/document-authoring-sdk",
        },
      ]}
    >
      <div
        className="h-full"
        style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}
      >
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
    </SampleCanvas>
  );
}
