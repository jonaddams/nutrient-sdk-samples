"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import { createFormField } from "./_lib/fields";
import { EDITOR_COLOR, FIELD_PALETTE, ROLES } from "./_lib/roles";
import type { FieldCustomData, FieldType, RoleId } from "./_lib/types";

function closestByClass(
  el: Element | Node | null,
  className: string,
): Element | null {
  if (!el) return null;
  if (el instanceof Element && el.classList?.contains(className)) {
    return el as Element;
  }
  if (
    el instanceof Element &&
    typeof el.className === "string" &&
    el.className.includes(className)
  ) {
    return el as Element;
  }
  return el.parentNode ? closestByClass(el.parentNode, className) : null;
}

type ActiveView = "editor" | RoleId;

export default function FormFieldAnnotationsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const hasLoadedRef = useRef(false);
  const fieldCounterRef = useRef(0);
  const activeViewRef = useRef<ActiveView>("editor");

  const [activeView, setActiveView] = useState<ActiveView>("editor");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [selectedFieldData, setSelectedFieldData] =
    useState<FieldCustomData | null>(null);
  const [draggingItem, setDraggingItem] = useState<FieldType | null>(null);

  const NV = useRef<typeof window.NutrientViewer | null>(null);

  // ─── Drag and Drop ────────────────────────────────────────────────
  const eventHandlersRef = useRef<{
    dragover: (e: Event) => void;
    drop: (e: Event) => void;
  } | null>(null);

  const setupDragDrop = useCallback((instance: Instance, enabled: boolean) => {
    // Clean up previous handlers
    if (eventHandlersRef.current && instance.contentDocument) {
      instance.contentDocument.removeEventListener(
        "dragover",
        eventHandlersRef.current.dragover,
      );
      instance.contentDocument.removeEventListener(
        "drop",
        eventHandlersRef.current.drop,
      );
      eventHandlersRef.current = null;
    }

    if (!enabled) return;

    const sdk = NV.current;
    if (!sdk) return;

    const dragoverHandler = (event: Event) => {
      const dragEvent = event as DragEvent;
      const pageElement =
        closestByClass(dragEvent.target as Element, "PSPDFKit-Page") ||
        closestByClass(dragEvent.target as Element, "pspdfkit-page");
      if (pageElement) {
        event.preventDefault();
      }
    };

    const dropHandler = async (event: Event) => {
      const dragEvent = event as DragEvent;
      event.preventDefault();
      event.stopPropagation();

      const fieldType = dragEvent.dataTransfer?.getData("text") as FieldType;
      if (!fieldType) return;

      const paletteItem = FIELD_PALETTE.find((f) => f.type === fieldType);
      if (!paletteItem) return;

      const pageElement =
        closestByClass(dragEvent.target as Element, "PSPDFKit-Page") ||
        closestByClass(dragEvent.target as Element, "pspdfkit-page");
      if (!pageElement) return;

      const pageIndex = parseInt(
        (pageElement as HTMLElement).dataset.pageIndex || "0",
        10,
      );

      try {
        const { width, height } = paletteItem.defaultSize;
        const clientRect = new sdk.Geometry.Rect({
          left: dragEvent.clientX - width / 2,
          top: dragEvent.clientY - height / 2,
          width,
          height,
        });

        const pageRect = instance.transformContentClientToPageSpace(
          clientRect,
          pageIndex,
        );

        fieldCounterRef.current += 1;
        const fieldName = `${fieldType}-${fieldCounterRef.current}`;

        const customData: FieldCustomData = {
          fieldType,
          roleId: "either",
          fieldName,
          required: false,
        };

        const [widget, formField] = createFormField(
          sdk,
          pageIndex,
          pageRect,
          fieldType,
          customData,
        );

        await instance.create([widget, formField]);
      } catch (error) {
        console.error("Error creating field:", error);
      }
    };

    if (instance.contentDocument) {
      instance.contentDocument.addEventListener("dragover", dragoverHandler);
      instance.contentDocument.addEventListener("drop", dropHandler);
      eventHandlersRef.current = {
        dragover: dragoverHandler,
        drop: dropHandler,
      };
    }
  }, []);

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
      if (!NutrientViewer) return;

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
              !(annotation instanceof NV.current.Annotations.WidgetAnnotation)
            )
              return null;
            if (!annotation.customData?.roleId) return null;

            const roleId = annotation.customData.roleId as RoleId;
            const role = ROLES[roleId];
            if (!role) return null;

            const currentView = activeViewRef.current;
            const isDimmed =
              currentView !== "editor" &&
              roleId !== currentView &&
              roleId !== "either";

            const borderColor = isDimmed ? "#d1d5db" : role.color;
            const bgColor = isDimmed ? "rgba(0,0,0,0.03)" : `${role.color}15`;
            const opacity = isDimmed ? "0.5" : "1";

            const node = document.createElement("div");
            node.style.cssText = `
              width: 100%;
              height: 100%;
              border: 2px solid ${borderColor};
              background-color: ${bgColor};
              display: flex;
              align-items: center;
              gap: 6px;
              padding-left: 6px;
              pointer-events: none;
              box-sizing: border-box;
              overflow: hidden;
              opacity: ${opacity};
            `;

            if (!isDimmed) {
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
            }

            const nameSpan = document.createElement("span");
            nameSpan.textContent =
              (annotation.customData.fieldName as string) || "";
            nameSpan.style.cssText = `
              font-size: 11px;
              color: ${isDimmed ? "#999" : role.color};
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

      // Set up drag-and-drop
      setupDragDrop(instance, true);

      // Listen for annotation clicks to populate properties panel
      instance.addEventListener("annotations.press", (event: any) => {
        const annotation = event?.annotation ?? event;
        if (!annotation?.customData?.roleId) {
          setSelectedAnnotationId(null);
          setSelectedFieldData(null);
          return;
        }

        setSelectedAnnotationId(annotation.id);
        setSelectedFieldData(annotation.customData as FieldCustomData);
      });
    };

    initSDK();

    return () => {
      if (instanceRef.current) {
        setupDragDrop(instanceRef.current, false);
        instanceRef.current = null;
      }
      if (NV.current && container) {
        try {
          NV.current.unload(container);
        } catch {
          // Container may already be unmounted
        }
      }
      hasLoadedRef.current = false;
    };
  }, [setupDragDrop]);

  // ─── Role Switching ───────────────────────────────────────────────
  const switchView = useCallback(async (view: ActiveView) => {
    setActiveView(view);
    activeViewRef.current = view;
    setSelectedAnnotationId(null);
    setSelectedFieldData(null);

    const instance = instanceRef.current;
    const sdk = NV.current;
    if (!instance || !sdk) return;

    // Toggle drag-and-drop based on editor mode
    setupDragDrop(instance, view === "editor");

    // Set interaction mode
    if (view === "editor") {
      instance.setViewState((viewState) =>
        viewState.set("interactionMode", sdk.InteractionMode.FORM_CREATOR),
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

    // Force re-render of custom overlays by touching each annotation
    try {
      const totalPages2 = await instance.totalPageCount;
      for (let pageIndex = 0; pageIndex < totalPages2; pageIndex++) {
        const annotations = await instance.getAnnotations(pageIndex);
        for (const annotation of annotations) {
          if ((annotation as any).customData?.roleId) {
            await instance.update(annotation);
          }
        }
      }
    } catch (error) {
      console.error("Error re-rendering annotations:", error);
    }
  }, [setupDragDrop]);

  // ─── Property Updates ───────────────────────────────────────────
  const updateFieldProperty = useCallback(
    async (updates: Partial<FieldCustomData>) => {
      const instance = instanceRef.current;
      if (!instance || !selectedAnnotationId) return;

      const newData = { ...selectedFieldData, ...updates } as FieldCustomData;
      setSelectedFieldData(newData);

      try {
        const totalPages = await instance.totalPageCount;
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const annotations = await instance.getAnnotations(pageIndex);
          const annotation = annotations.find(
            (a: any) => a.id === selectedAnnotationId,
          );
          if (annotation) {
            const updatedAnnotation = annotation.set(
              "customData",
              newData as unknown as Record<string, unknown>,
            );
            await instance.update(updatedAnnotation);
            break;
          }
        }
      } catch (error) {
        console.error("Error updating field property:", error);
      }
    },
    [selectedAnnotationId, selectedFieldData],
  );

  const deleteSelectedField = useCallback(async () => {
    const instance = instanceRef.current;
    if (!instance || !selectedAnnotationId) return;

    try {
      const totalPages = await instance.totalPageCount;
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const annotations = await instance.getAnnotations(pageIndex);
        const annotation = annotations.find(
          (a: any) => a.id === selectedAnnotationId,
        );
        if (annotation) {
          const formFields = await instance.getFormFields();
          const formField = formFields.find(
            (f: any) => f.name === (annotation as any).formFieldName,
          );
          if (formField) {
            await instance.delete(formField);
          }
          await instance.delete(annotation);
          break;
        }
      }
      setSelectedAnnotationId(null);
      setSelectedFieldData(null);
    } catch (error) {
      console.error("Error deleting field:", error);
    }
  }, [selectedAnnotationId]);

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

        {isEditor && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Add Fields
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Drag onto document
            </div>
            <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
              {FIELD_PALETTE.map((item) => (
                <li
                  key={item.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text", item.type);
                    setDraggingItem(item.type);
                  }}
                  onDragEnd={() => setDraggingItem(null)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
                    draggingItem === item.type
                      ? "opacity-50 border-gray-300 dark:border-gray-600"
                      : "border-gray-200 dark:border-gray-700 hover:border-[var(--digital-pollen)] hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="text-lg w-6 text-center flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isEditor && (
          <div className="p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Field Properties
            </div>
            {selectedFieldData ? (
              <div className="flex flex-col gap-3">
                {/* Field Name */}
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Field Name
                  </span>
                  <input
                    type="text"
                    value={selectedFieldData.fieldName}
                    onChange={(e) =>
                      updateFieldProperty({ fieldName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </label>

                {/* Required */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFieldData.required}
                    onChange={(e) =>
                      updateFieldProperty({ required: e.target.checked })
                    }
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Required
                  </span>
                </label>

                {/* Role Assignment */}
                <fieldset>
                  <legend className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    Assign to Role
                  </legend>
                  <div className="flex flex-col gap-1">
                    {Object.values(ROLES).map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 py-1 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="field-role"
                          checked={selectedFieldData.roleId === role.id}
                          onChange={() =>
                            updateFieldProperty({ roleId: role.id })
                          }
                          style={{ accentColor: role.color }}
                        />
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {role.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Delete */}
                <button
                  type="button"
                  onClick={deleteSelectedField}
                  className="w-full mt-1 px-3 py-2 text-sm text-red-500 border border-red-200 dark:border-red-900/30 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  Delete Field
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">
                Select a field on the document to edit its properties
              </div>
            )}
          </div>
        )}
      </div>

      {/* Viewer Container */}
      <div ref={containerRef} className="flex-1 h-full" />
    </div>
  );
}
