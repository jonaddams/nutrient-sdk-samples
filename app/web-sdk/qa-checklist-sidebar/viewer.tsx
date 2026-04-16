// app/web-sdk/qa-checklist-sidebar/viewer.tsx
"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";
import {
  CHECKLIST_CATEGORIES,
  PRE_POPULATED_COMMENTS,
  SEVERITY_CONFIG,
} from "./checklist-data";
const DOCUMENT = "/documents/executive-business-plan-docx.pdf";

// Styles injected into the shadow root (CSS classes don't cross shadow boundaries)
const QA_STYLES = `
.qa-sidebar { display:flex; flex-direction:column; height:100%; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; font-size:13px; color:#1a1a2e; background:#f8f8fa; overflow-y:auto; }
.qa-sidebar__header { padding:16px; border-bottom:1px solid rgba(0,0,0,0.08); }
.qa-sidebar__title { font-size:15px; font-weight:600; margin:0 0 10px; }
.qa-sidebar__progress-bar { background:rgba(0,0,0,0.08); border-radius:4px; height:8px; overflow:hidden; margin-bottom:6px; }
.qa-sidebar__progress-fill { background:#16a34a; height:100%; border-radius:4px; transition:width 0.3s ease; }
.qa-sidebar__progress-text { font-size:11px; color:rgba(0,0,0,0.45); margin:0; }
.qa-category { padding:12px 16px 4px; border-top:1px solid rgba(0,0,0,0.06); }
.qa-category:first-of-type { border-top:none; }
.qa-category__title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:rgba(0,0,0,0.4); margin:0 0 8px; }
.qa-item { padding:6px 0; }
.qa-item__checkbox { margin-top:2px; accent-color:#16a34a; cursor:pointer; }
.qa-item__label { cursor:pointer; display:flex; align-items:flex-start; gap:8px; }
.qa-item__link { font-size:11px; color:#6366f1; background:none; border:none; padding:0; margin-left:25px; cursor:pointer; text-decoration:none; }
.qa-item__link:hover { color:#4f46e5; text-decoration:underline; }
.qa-thread-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; margin:4px 8px; }
.qa-thread-badge--resolved { text-decoration:line-through; opacity:0.5; }
.qa-thread-resolve-btn { display:block; width:calc(100% - 16px); margin:4px 8px 8px; padding:6px 12px; background:rgba(0,0,0,0.04); color:rgba(0,0,0,0.6); border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:12px; cursor:pointer; transition:background 0.15s; }
.qa-thread-resolve-btn:hover { background:rgba(0,0,0,0.08); }
.qa-thread-resolve-btn--resolved { color:#16a34a; }
.qa-severity-badge { display:inline-block; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; margin:4px 8px; }
.qa-flag-btn { display:block; margin:2px 8px 6px; padding:4px 10px; background:none; color:rgba(0,0,0,0.45); border:1px solid rgba(0,0,0,0.1); border-radius:4px; font-size:11px; cursor:pointer; transition:all 0.15s; }
.qa-flag-btn:hover { background:rgba(0,0,0,0.04); color:rgba(0,0,0,0.65); }
.qa-flag-btn--flagged { background:rgba(239,68,68,0.1); color:#dc2626; border-color:rgba(239,68,68,0.3); }
`;

const QA_STYLE_ID = "qa-checklist-styles";

function injectStyles(container: HTMLElement) {
  const root = container.querySelector(".PSPDFKit-Container")?.shadowRoot ?? container;
  if (root.querySelector(`#${QA_STYLE_ID}`)) return;
  const style = document.createElement("style");
  style.id = QA_STYLE_ID;
  style.textContent = QA_STYLES;
  root.appendChild(style);
}

// SVG icon for toolbar button
const CHECKLIST_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m3 17 2 2 4-4"/></svg>`;

function buildSidebarDOM(instanceRef: { current: Instance | null }): HTMLElement {
  // Clone initial checked state so we can mutate it
  const checkedState: Record<string, boolean> = {};
  for (const cat of CHECKLIST_CATEGORIES) {
    for (const item of cat.items) {
      checkedState[item.id] = item.checked;
    }
  }

  const totalItems = CHECKLIST_CATEGORIES.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );

  const root = document.createElement("div");
  root.className = "qa-sidebar";

  // --- Header ---
  const header = document.createElement("div");
  header.className = "qa-sidebar__header";

  const title = document.createElement("h3");
  title.className = "qa-sidebar__title";
  title.textContent = "Document QA";
  header.appendChild(title);

  const progressBar = document.createElement("div");
  progressBar.className = "qa-sidebar__progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "qa-sidebar__progress-fill";
  progressBar.appendChild(progressFill);
  header.appendChild(progressBar);

  const progressText = document.createElement("p");
  progressText.className = "qa-sidebar__progress-text";
  header.appendChild(progressText);

  root.appendChild(header);

  function updateProgress() {
    const checked = Object.values(checkedState).filter(Boolean).length;
    progressFill.style.width = `${(checked / totalItems) * 100}%`;
    progressText.textContent = `${checked} of ${totalItems} items checked`;
  }
  updateProgress();

  // --- Categories ---
  for (const cat of CHECKLIST_CATEGORIES) {
    const section = document.createElement("div");
    section.className = "qa-category";

    const catTitle = document.createElement("h4");
    catTitle.className = "qa-category__title";
    catTitle.textContent = cat.label;
    section.appendChild(catTitle);

    for (const item of cat.items) {
      const row = document.createElement("div");
      row.className = "qa-item";

      // Wrap checkbox + label text in a <label> for click-to-toggle
      const labelEl = document.createElement("label");
      labelEl.style.display = "flex";
      labelEl.style.alignItems = "flex-start";
      labelEl.style.gap = "8px";
      labelEl.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "qa-item__checkbox";
      checkbox.checked = checkedState[item.id];
      checkbox.addEventListener("change", () => {
        checkedState[item.id] = checkbox.checked;
        updateProgress();
      });
      labelEl.appendChild(checkbox);

      const labelText = document.createElement("span");
      labelText.className = "qa-item__label";
      labelText.textContent = item.label;
      labelEl.appendChild(labelText);

      row.appendChild(labelEl);
      section.appendChild(row);
    }

    root.appendChild(section);
  }

  return root;
}

export default function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    // Track metadata and UI state for slot rendering (persists across slot recreation)
    const threadMeta: Record<string, { category: string; severity: string }> = {};
    const commentMeta: Record<string, { severity: string }> = {};
    const threadResolved: Record<string, boolean> = {};
    const commentFlagged: Record<string, boolean> = {};

    // Mutable ref for the instance — slot callbacks may fire before .then() resolves,
    // but click handlers fire later when the instance is guaranteed available.
    const instanceRef: { current: Instance | null } = { current: null };

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      initialViewState: new NutrientViewer.ViewState({
        sidebarMode: "qaChecklist" as never,
      }),
      ui: {
        sidebar: {
          qaChecklist: (_instance: Instance | null, _id: string) => ({
            render: () => buildSidebarDOM(instanceRef),
          }),
        },
        commentThread: {
          header: (_instance: Instance | null, id: string) => ({
            render: () => {
              const meta = threadMeta[id];
              if (!meta) return null;
              const cat = CHECKLIST_CATEGORIES.find(
                (c) => c.id === meta.category,
              );
              if (!cat) return null;

              const badge = document.createElement("span");
              badge.className = `qa-thread-badge${threadResolved[id] ? " qa-thread-badge--resolved" : ""}`;
              badge.dataset.threadId = id;
              badge.style.color = cat.color;
              badge.style.backgroundColor = `${cat.color}22`;
              badge.textContent = cat.label;
              return badge;
            },
          }),
          footer: (_instance: Instance | null, id: string) => ({
            render: () => {
              const resolved = !!threadResolved[id];
              const btn = document.createElement("button");
              btn.className = `qa-thread-resolve-btn${resolved ? " qa-thread-resolve-btn--resolved" : ""}`;
              btn.type = "button";
              btn.textContent = resolved ? "✓ Resolved" : "Mark Resolved";

              btn.addEventListener("click", () => {
                threadResolved[id] = !threadResolved[id];
                btn.classList.toggle("qa-thread-resolve-btn--resolved", threadResolved[id]);
                btn.textContent = threadResolved[id] ? "✓ Resolved" : "Mark Resolved";
              });

              return btn;
            },
          }),
          comment: {
            header: (_instance: Instance | null, id: string) => ({
              render: () => {
                const meta = commentMeta[id];
                if (!meta) return null;

                const sevKey = meta.severity as keyof typeof SEVERITY_CONFIG;
                const sev = SEVERITY_CONFIG[sevKey];
                if (!sev) return null;

                const badge = document.createElement("span");
                badge.className = "qa-severity-badge";
                badge.style.color = sev.color;
                badge.style.backgroundColor = sev.bg;
                badge.textContent = sev.label;
                return badge;
              },
            }),
            footer: (_instance: Instance | null, id: string) => ({
              render: () => {
                const flagged = !!commentFlagged[id];
                const btn = document.createElement("button");
                btn.className = `qa-flag-btn${flagged ? " qa-flag-btn--flagged" : ""}`;
                btn.type = "button";
                btn.textContent = flagged ? "⚑ Flagged" : "⚑ Flag for Review";

                btn.addEventListener("click", () => {
                  commentFlagged[id] = !commentFlagged[id];
                  btn.classList.toggle("qa-flag-btn--flagged", commentFlagged[id]);
                  btn.textContent = commentFlagged[id] ? "⚑ Flagged" : "⚑ Flag for Review";
                });

                return btn;
              },
            }),
          },
        },
      },
    }).then(async (instance: Instance) => {
      instanceRef.current = instance;
      injectStyles(container);

      // Add custom toolbar button to toggle the QA sidebar
      const toolbarItem = {
        type: "custom" as const,
        id: "qa-checklist-toggle",
        title: "QA Checklist",
        icon: CHECKLIST_ICON,
        dropdownGroup: "sidebar",
        onPress: () => {
          instance.setViewState((viewState) =>
            viewState.set(
              "sidebarMode",
              (viewState as any).sidebarMode === "qaChecklist"
                ? null
                : ("qaChecklist" as never),
            ),
          );
        },
      };

      instance.setToolbarItems([
        ...(NutrientViewer.defaultToolbarItems ?? []),
        { type: "spacer" },
        toolbarItem,
      ]);

      // Track toolbar selected state
      instance.addEventListener("viewState.change", (viewState: any) => {
        instance.setToolbarItems((items: any[]) =>
          items.map((item) =>
            item.id === "qa-checklist-toggle"
              ? {
                  ...item,
                  selected: viewState.sidebarMode === "qaChecklist",
                }
              : item,
          ),
        );
      });

      // Create pre-populated comment annotations
      for (const comment of PRE_POPULATED_COMMENTS) {
        try {
          const pageInfo = instance.pageInfoForIndex(comment.pageIndex);
          if (!pageInfo) continue;

          // Generate IDs for the marker and comment
          const markerId = NutrientViewer.generateInstantId();
          const commentId = NutrientViewer.generateInstantId();

          // Create the marker annotation
          const marker = new NutrientViewer.Annotations.CommentMarkerAnnotation({
            id: markerId,
            pageIndex: comment.pageIndex,
            boundingBox: new NutrientViewer.Geometry.Rect({
              left: 50,
              top: 50 + PRE_POPULATED_COMMENTS.indexOf(comment) * 80,
              width: 20,
              height: 20,
            }),
          });

          // Create the comment text
          const commentObj = new NutrientViewer.Comment({
            id: commentId,
            pageIndex: comment.pageIndex,
            rootId: markerId,
            text: { format: "plain", value: comment.text },
            creatorName: "QA Reviewer",
          });

          // Create both together in a single call
          await instance.create([marker, commentObj]);

          // Store metadata for slot rendering
          threadMeta[markerId] = {
            category: comment.threadCategory,
            severity: comment.severity,
          };
          commentMeta[commentId] = {
            severity: comment.severity,
          };
        } catch (err) {
          console.warn("Failed to create pre-populated comment:", err);
        }
      }
    });

    return () => {
      NutrientViewer.unload(container);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
