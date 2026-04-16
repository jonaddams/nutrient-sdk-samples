// app/web-sdk/qa-checklist-sidebar/viewer.tsx
"use client";

import type { AnnotationsUnion, Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";
import {
  CHECKLIST_CATEGORIES,
  PRE_POPULATED_COMMENTS,
  SEVERITY_CONFIG,
} from "./checklist-data";
import "./styles.css";

const DOCUMENT = "/documents/executive-business-plan-docx.pdf";

// SVG icon for toolbar button
const CHECKLIST_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m3 17 2 2 4-4"/></svg>`;

function buildSidebarDOM(instance: Instance): HTMLElement {
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
      const row = document.createElement("label");
      row.className = "qa-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "qa-item__checkbox";
      checkbox.checked = checkedState[item.id];
      checkbox.addEventListener("change", () => {
        checkedState[item.id] = checkbox.checked;
        updateProgress();
      });
      row.appendChild(checkbox);

      const textWrap = document.createElement("div");

      const label = document.createElement("span");
      label.className = "qa-item__label";
      label.textContent = item.label;
      textWrap.appendChild(label);

      if (item.pageIndex !== null) {
        const link = document.createElement("button");
        link.className = "qa-item__link";
        link.textContent = `Page ${item.pageIndex + 1}`;
        link.type = "button";
        const pageIdx = item.pageIndex;
        link.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          instance.setViewState((vs) =>
            vs.set("currentPageIndex", pageIdx),
          );
        });
        textWrap.appendChild(document.createElement("br"));
        textWrap.appendChild(link);
      }

      row.appendChild(textWrap);
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

    // Track metadata mappings for slot rendering
    const threadMeta: Record<string, { category: string; severity: string }> = {};
    const commentMeta: Record<string, { severity: string }> = {};

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
          qaChecklist: (instance: Instance | null, _id: string) => ({
            render: () => buildSidebarDOM(instance!),
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
              badge.className = "qa-thread-badge";
              badge.dataset.threadId = id;
              badge.style.color = cat.color;
              badge.style.backgroundColor = `${cat.color}22`;
              badge.textContent = cat.label;
              return badge;
            },
          }),
          footer: (_instance: Instance | null, id: string) => ({
            render: () => {
              const btn = document.createElement("button");
              btn.className = "qa-thread-resolve-btn";
              btn.type = "button";
              btn.textContent = "Mark Resolved";

              btn.addEventListener("click", () => {
                const isResolved = btn.classList.toggle(
                  "qa-thread-resolve-btn--resolved",
                );
                btn.textContent = isResolved
                  ? "✓ Resolved"
                  : "Mark Resolved";

                // Toggle strikethrough on the matching thread header badge
                const badge = container.querySelector(
                  `.qa-thread-badge[data-thread-id="${id}"]`,
                ) as HTMLElement | null;
                if (badge) {
                  badge.classList.toggle("qa-thread-badge--resolved", isResolved);
                }
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
            footer: (_instance: Instance | null, _id: string) => ({
              render: () => {
                const btn = document.createElement("button");
                btn.className = "qa-flag-btn";
                btn.type = "button";
                btn.textContent = "⚑ Flag for Review";

                btn.addEventListener("click", () => {
                  const isFlagged = btn.classList.toggle("qa-flag-btn--flagged");
                  btn.textContent = isFlagged
                    ? "⚑ Flagged"
                    : "⚑ Flag for Review";
                });

                return btn;
              },
            }),
          },
        },
      },
    }).then(async (instance: Instance) => {
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

          // Create a text annotation with a comment
          const annotation = new NutrientViewer.Annotations.CommentMarkerAnnotation({
            pageIndex: comment.pageIndex,
            boundingBox: new NutrientViewer.Geometry.Rect({
              left: 50,
              top: 50 + PRE_POPULATED_COMMENTS.indexOf(comment) * 80,
              width: 32,
              height: 32,
            }),
          });

          const createdAnnotations = await instance.create(annotation);
          const created = createdAnnotations[0] as AnnotationsUnion | undefined;

          if (created) {
            // Store thread metadata for slot rendering
            threadMeta[created.id] = {
              category: comment.threadCategory,
              severity: comment.severity,
            };

            // Add the comment text to the annotation
            const commentObj = new NutrientViewer.Comment({
              pageIndex: comment.pageIndex,
              rootId: created.id,
              text: { format: "plain", value: comment.text },
              creatorName: "QA Reviewer",
            });
            const createdComment = await instance.createComment(commentObj);

            // Store comment metadata for the comment.header slot
            if (createdComment) {
              commentMeta[createdComment.id] = {
                severity: comment.severity,
              };
            }
          }
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
