"use client";

import type { Instance, List } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldType, FieldCustomData, RoleId } from "./_lib/types";
import { ROLES, EDITOR_COLOR, FIELD_PALETTE } from "./_lib/roles";
import { createFormField } from "./_lib/fields";

type ActiveView = "editor" | RoleId;

export default function FormFieldAnnotationsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const hasLoadedRef = useRef(false);
  const fieldCounterRef = useRef(0);

  const [activeView, setActiveView] = useState<ActiveView>("editor");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [selectedFieldData, setSelectedFieldData] =
    useState<FieldCustomData | null>(null);
  const [draggingItem, setDraggingItem] = useState<FieldType | null>(null);

  const NV = useRef<typeof window.NutrientViewer | null>(null);

  // ─── SDK Initialization ───────────────────────────────────────────
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const container = containerRef.current;
    if (!container) return;

    const initSDK = async () => {
      const waitForSDK = (): Promise<typeof window.NutrientViewer> =>
        new Promise((resolve) => {
          const check = () => {
            if (window.NutrientViewer) resolve(window.NutrientViewer);
            else setTimeout(check, 100);
          };
          check();
        });

      const NutrientViewer = await waitForSDK();
      NV.current = NutrientViewer;

      const instance = await NutrientViewer.load({
        container,
        document: "/documents/service-agreement.pdf",
        licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        useCDN: true,
        styleSheets: ["/form-field-annotations.css"],
        customRenderers: {
          Annotation: ({ annotation }: any) => {
            if (!NV.current) return null;
            if (
              !(
                annotation instanceof
                NV.current.Annotations.WidgetAnnotation
              )
            )
              return null;
            if (!annotation.customData?.roleId) return null;

            const roleId = annotation.customData.roleId as RoleId;
            const role = ROLES[roleId];
            if (!role) return null;

            const node = document.createElement("div");
            node.style.cssText = `
              width: 100%;
              height: 100%;
              border: 2px solid ${role.color};
              background-color: ${role.color}15;
              display: flex;
              align-items: center;
              gap: 6px;
              padding-left: 6px;
              pointer-events: none;
              box-sizing: border-box;
              overflow: hidden;
            `;

            const badge = document.createElement("span");
            badge.textContent = role.label;
            badge.style.cssText = `
              background: ${role.color};
              color: white;
              font-size: 9px;
              padding: 1px 5px;
              border-radius: 3px;
              font-weight: 600;
              white-space: nowrap;
              flex-shrink: 0;
            `;
            node.appendChild(badge);

            const nameSpan = document.createElement("span");
            nameSpan.textContent = annotation.customData.fieldName || "";
            nameSpan.style.cssText = `
              font-size: 11px;
              color: ${role.color};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `;
            node.appendChild(nameSpan);

            return { node, append: true };
          },
        },
      });

      instanceRef.current = instance;

      // Set initial interaction mode to FORM_CREATOR
      instance.setViewState((viewState) =>
        viewState.set(
          "interactionMode",
          NutrientViewer.InteractionMode.FORM_CREATOR,
        ),
      );
    };

    initSDK();

    return () => {
      if (instanceRef.current) {
        instanceRef.current.unload();
        instanceRef.current = null;
      }
    };
  }, []);

  // ─── Role Switching ───────────────────────────────────────────────
  const switchView = useCallback(async (view: ActiveView) => {
    setActiveView(view);
    setSelectedAnnotationId(null);
    setSelectedFieldData(null);

    const instance = instanceRef.current;
    const sdk = NV.current;
    if (!instance || !sdk) return;

    // Set interaction mode
    if (view === "editor") {
      instance.setViewState((viewState) =>
        viewState.set(
          "interactionMode",
          sdk.InteractionMode.FORM_CREATOR,
        ),
      );
    } else {
      instance.setViewState((viewState) =>
        viewState.set("interactionMode", null),
      );
    }

    // Update field permissions
    try {
      const formFields = await instance.getFormFields();
      const totalPages = await instance.totalPageCount;
      let allAnnotations: any[] = [];
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const pageAnnotations = await instance.getAnnotations(pageIndex);
        allAnnotations = allAnnotations.concat(pageAnnotations.toArray());
      }

      for (const field of formFields) {
        const widget = allAnnotations.find(
          (ann: any) => ann.formFieldName === field.name,
        );
        if (!widget?.customData?.roleId) continue;

        const fieldRoleId = widget.customData.roleId as RoleId;
        let isEditable: boolean;

        if (view === "editor") {
          isEditable = true;
        } else {
          isEditable = fieldRoleId === view || fieldRoleId === "either";
        }

        const currentReadOnly = field.readOnly || false;
        const newReadOnly = !isEditable;

        if (currentReadOnly !== newReadOnly) {
          const updatedField = field.set("readOnly", newReadOnly);
          await instance.update(updatedField);
        }
      }
    } catch (error) {
      console.error("Error updating field permissions:", error);
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────
  const isEditor = activeView === "editor";

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-[#1a1414]">
        {/* Role Switcher */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Current View
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Editor button */}
            <button
              type="button"
              onClick={() => switchView("editor")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                activeView === "editor"
                  ? "border-2 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              style={
                activeView === "editor"
                  ? { borderColor: EDITOR_COLOR }
                  : undefined
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: EDITOR_COLOR }}
              />
              Editor
            </button>

            {/* Role buttons */}
            {Object.values(ROLES)
              .filter((role) => role.id !== "either")
              .map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => switchView(role.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                    activeView === role.id
                      ? "border-2 font-medium"
                      : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  style={
                    activeView === role.id
                      ? {
                          borderColor: role.color,
                          backgroundColor: `${role.color}10`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  {role.label}
                </button>
              ))}
          </div>
        </div>

        {/* Field Palette — placeholder for Task 7 */}
        {isEditor && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Add Fields
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Drag onto document
            </div>
            <div className="text-sm text-gray-400 italic text-center py-4">
              Field palette loading...
            </div>
          </div>
        )}

        {/* Properties Panel — placeholder for Task 8 */}
        {isEditor && (
          <div className="p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Field Properties
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">
              Select a field on the document to edit its properties
            </div>
          </div>
        )}
      </div>

      {/* Viewer Container */}
      <div ref={containerRef} className="flex-1 h-full" />
    </div>
  );
}
