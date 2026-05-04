"use client";

import type { Instance, List, ViewState } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarIcon,
  InitialIcon,
  SignatureIcon,
} from "@/app/_components/icons";

type EventHandler = (event: Event) => void;

// Helper function to find closest element by class name
function closestByClass(
  el: Element | Node | null,
  className: string,
): Element | null {
  if (!el) return null;

  if (
    el instanceof Element &&
    el.classList &&
    el.classList.contains(className)
  ) {
    return el as Element;
  }

  if (
    el instanceof Element &&
    el.className &&
    typeof el.className === "string" &&
    el.className.includes(className)
  ) {
    return el as Element;
  }

  return el.parentNode ? closestByClass(el.parentNode, className) : null;
}

export default function FormDesignerViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [formCreatorMode, setFormCreatorMode] = useState(false);
  const viewerInstanceRef = useRef<Instance | null>(null);
  const nutrientViewerRef = useRef<typeof window.NutrientViewer | null>(null);
  const eventHandlersRef = useRef<{
    dragover: EventHandler;
    drop: EventHandler;
  } | null>(null);

  // Handle drag start event
  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    annotationType: string,
  ) => {
    if (!formCreatorMode) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData("text", annotationType);
    event.dataTransfer.effectAllowed = "copy";
    setDraggingItem(annotationType);
  };

  // Handle drag end event
  const handleDragEnd = () => {
    setDraggingItem(null);
  };

  // Toggle Form Creator Mode
  const toggleFormCreatorMode = () => {
    setFormCreatorMode(!formCreatorMode);
  };

  // Helper function to clean up drag and drop handlers
  const cleanupDragAndDrop = useCallback((instance: Instance) => {
    if (instance?.contentDocument && eventHandlersRef.current) {
      const { dragover, drop } = eventHandlersRef.current;
      instance.contentDocument.removeEventListener("dragover", dragover);
      instance.contentDocument.removeEventListener("drop", drop);
      eventHandlersRef.current = null;
    }
  }, []);

  // Helper function to set up drag and drop handlers
  const setupDragAndDrop = useCallback(
    (instance: Instance, enabled: boolean) => {
      const NutrientViewer = nutrientViewerRef.current;
      if (!NutrientViewer) return;
      let label = "";

      // Dragover handler
      const dragoverHandler = (event: Event): void => {
        if (!enabled) {
          return;
        }

        const dragEvent = event as DragEvent;
        let pageElement = null;

        pageElement = closestByClass(
          dragEvent.target as Element,
          "PSPDFKit-Page",
        );

        if (!pageElement) {
          pageElement = closestByClass(
            dragEvent.target as Element,
            "pspdfkit-page",
          );
        }

        if (!pageElement) {
          const target = dragEvent.target as Element;
          if (target.classList) {
            const allClasses = Array.from(target.classList);
            const pageClasses = allClasses.filter((cls) =>
              cls.toLowerCase().includes("page"),
            );
            if (pageClasses.length > 0) {
              pageElement = target;
            }
          }
        }

        if (pageElement) {
          event.preventDefault();
        }
      };

      // Drop handler
      const dropHandler = async (event: Event) => {
        if (!enabled) {
          return;
        }

        const dragEvent = event as DragEvent;
        event.preventDefault();
        event.stopPropagation();

        label = dragEvent.dataTransfer?.getData("text") || "";

        let pageElement = closestByClass(
          dragEvent.target as Element,
          "PSPDFKit-Page",
        );
        if (!pageElement) {
          pageElement = closestByClass(
            dragEvent.target as Element,
            "pspdfkit-page",
          );
        }

        if (!pageElement) {
          const target = dragEvent.target as Element;
          if (target.classList) {
            const allClasses = Array.from(target.classList);
            const pageClasses = allClasses.filter((cls) =>
              cls.toLowerCase().includes("page"),
            );
            if (pageClasses.length > 0) {
              pageElement = target;
            }
          }
        }

        let pageIndex = 0;
        if (pageElement) {
          pageIndex = parseInt(
            (pageElement as HTMLElement).dataset.pageIndex || "0",
            10,
          );
        }

        try {
          let boundingBoxDimensions = { height: 55, width: 225 };

          // Center the form field on the cursor position
          // We subtract half width/height so the field is centered where user drops
          const clientRect = new NutrientViewer.Geometry.Rect({
            left: dragEvent.clientX - boundingBoxDimensions.width / 2,
            top: dragEvent.clientY - boundingBoxDimensions.height / 2,
            width: boundingBoxDimensions.width,
            height: boundingBoxDimensions.height,
          });

          const pageRect = instance.transformContentClientToPageSpace(
            clientRect,
            pageIndex,
          );

          const uniqueId = NutrientViewer.generateInstantId();
          const formFieldName = `${label.toLowerCase()}-${uniqueId}`;

          switch (label) {
            case "Signature": {
              const widget = new NutrientViewer.Annotations.WidgetAnnotation({
                boundingBox: pageRect,
                formFieldName: formFieldName,
                id: uniqueId,
                pageIndex,
                name: "Signature",
              });

              const formField =
                new NutrientViewer.FormFields.SignatureFormField({
                  annotationIds: new (
                    NutrientViewer.Immutable.List as unknown as new (
                      items: string[],
                    ) => List<string>
                  )([uniqueId]),
                  name: formFieldName,
                });

              await instance.create([widget, formField]);
              break;
            }

            case "DateSigned": {
              boundingBoxDimensions = { height: 55, width: 225 };

              const dateClientRect = new NutrientViewer.Geometry.Rect({
                left: dragEvent.clientX - boundingBoxDimensions.width / 2,
                top: dragEvent.clientY - boundingBoxDimensions.height / 2,
                width: boundingBoxDimensions.width,
                height: boundingBoxDimensions.height,
              });
              const datePageRect = instance.transformContentClientToPageSpace(
                dateClientRect,
                pageIndex,
              );

              const dateUniqueId = NutrientViewer.generateInstantId();
              const dateFormFieldName = `date-${dateUniqueId}`;

              const widget = new NutrientViewer.Annotations.WidgetAnnotation({
                boundingBox: datePageRect,
                formFieldName: dateFormFieldName,
                id: dateUniqueId,
                pageIndex,
                name: "Date Signed",
                additionalActions: {
                  onFormat: new NutrientViewer.Actions.JavaScriptAction({
                    script: 'AFDate_FormatEx("mm/dd/yyyy")',
                  }),
                },
              });

              const formField = new NutrientViewer.FormFields.TextFormField({
                annotationIds: new (
                  NutrientViewer.Immutable.List as unknown as new (
                    items: string[],
                  ) => List<string>
                )([dateUniqueId]),
                name: dateFormFieldName,
              });

              await instance.create([widget, formField]);
              break;
            }

            case "Initials": {
              boundingBoxDimensions = { height: 50, width: 50 };

              const initialsClientRect = new NutrientViewer.Geometry.Rect({
                left: dragEvent.clientX - boundingBoxDimensions.width / 2,
                top: dragEvent.clientY - boundingBoxDimensions.height / 2,
                width: boundingBoxDimensions.width,
                height: boundingBoxDimensions.height,
              });
              const initialsPageRect =
                instance.transformContentClientToPageSpace(
                  initialsClientRect,
                  pageIndex,
                );

              const initialsUniqueId = NutrientViewer.generateInstantId();
              const initialsFormFieldName = `initials-${initialsUniqueId}`;

              const widget = new NutrientViewer.Annotations.WidgetAnnotation({
                boundingBox: initialsPageRect,
                formFieldName: initialsFormFieldName,
                id: initialsUniqueId,
                pageIndex,
                name: "Initials",
              });

              const formField =
                new NutrientViewer.FormFields.SignatureFormField({
                  annotationIds: new (
                    NutrientViewer.Immutable.List as unknown as new (
                      items: string[],
                    ) => List<string>
                  )([initialsUniqueId]),
                  name: initialsFormFieldName,
                });

              await instance.create([widget, formField]);
              break;
            }

            default:
              break;
          }
        } catch (error) {
          console.error("Error creating annotation:", error);
        }

        return false;
      };

      // Add event listeners
      if (instance?.contentDocument) {
        instance.contentDocument.addEventListener("dragover", dragoverHandler);
        instance.contentDocument.addEventListener("drop", dropHandler);

        eventHandlersRef.current = {
          dragover: dragoverHandler,
          drop: dropHandler,
        };
      }
    },
    [],
  );

  // Update interaction mode when formCreatorMode changes
  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (instance && window.NutrientViewer) {
      const interactionMode = formCreatorMode
        ? window.NutrientViewer.InteractionMode.FORM_CREATOR
        : null;

      instance.setViewState((viewState: ViewState) =>
        interactionMode
          ? viewState.set("interactionMode", interactionMode)
          : viewState.set("interactionMode", null),
      );
    }
  }, [formCreatorMode]);

  // Initialize the viewer (runs once on mount)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run on mount/unmount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!window.NutrientViewer) return;
    const { NutrientViewer } = window;

    // Store NutrientViewer reference for consistent usage
    nutrientViewerRef.current = NutrientViewer;

    // Unload any existing instance first (handles React Strict Mode double mount)
    try {
      NutrientViewer.unload(container);
    } catch {
      // Ignore errors if no instance exists
    }

    // Load viewer
    NutrientViewer.load({
      container,
      document: "/documents/service-agreement.pdf",
      allowLinearizedLoading: true,
      pageRendering: "next",
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      styleSheets: ["/form-designer.css"],
    })
      .then((instance: Instance) => {
        viewerInstanceRef.current = instance;

        const interactionMode = formCreatorMode
          ? NutrientViewer.InteractionMode.FORM_CREATOR
          : null;

        instance.setViewState((viewState: ViewState) =>
          interactionMode
            ? viewState.set("interactionMode", interactionMode)
            : viewState.set("interactionMode", null),
        );

        setupDragAndDrop(instance, formCreatorMode);
      })
      .catch((error: Error) => {
        console.error("Error loading viewer:", error);
      });

    return () => {
      const instance = viewerInstanceRef.current;
      if (instance) {
        cleanupDragAndDrop(instance);
        try {
          NutrientViewer.unload(container);
        } catch {
          // Ignore errors if already unloaded
        }
        viewerInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  // Setup drag and drop handlers whenever formCreatorMode changes
  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (instance) {
      cleanupDragAndDrop(instance);
      setupDragAndDrop(instance, formCreatorMode);
    }
  }, [formCreatorMode, cleanupDragAndDrop, setupDragAndDrop]);

  // Field-card definitions — each maps a draggable id to its label + icon.
  const fieldDefs: {
    id: "Signature" | "DateSigned" | "Initials";
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[] = [
    { id: "Signature", label: "Signature", Icon: SignatureIcon },
    { id: "DateSigned", label: "Date Signed", Icon: CalendarIcon },
    { id: "Initials", label: "Initials", Icon: InitialIcon },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className="w-80 flex flex-col overflow-y-auto"
        style={{
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div className="p-6">
          <div
            className="panel-section"
            style={{ paddingTop: 0, marginBottom: 16 }}
          >
            Form Fields
          </div>

          {/* Form Creator Mode Toggle */}
          <div
            className="mb-6 pb-6"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formCreatorMode}
                onChange={toggleFormCreatorMode}
              />
              <div
                className="relative w-11 h-6 transition-colors"
                style={{
                  background: formCreatorMode
                    ? "var(--accent)"
                    : "var(--line-strong)",
                  borderRadius: "var(--r-pill)",
                }}
              >
                <div
                  className="absolute top-[2px] start-[2px] h-5 w-5 transition-transform"
                  style={{
                    background: "var(--bg-elev)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-pill)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    transform: formCreatorMode
                      ? "translateX(1.25rem)"
                      : "translateX(0)",
                  }}
                />
              </div>
              <span
                className="ml-3 text-sm font-semibold"
                style={{ color: "var(--ink)" }}
              >
                Form Creator Mode
              </span>
            </label>
          </div>

          {/* Form Field Items */}
          <div className="space-y-3">
            {fieldDefs.map((field) => {
              const isDragging = draggingItem === field.id;
              return (
                // biome-ignore lint/a11y/useSemanticElements: div element required for draggable attribute
                <div
                  key={field.id}
                  role="button"
                  tabIndex={0}
                  className="p-4 transition-all"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--r-2)",
                    cursor: formCreatorMode ? "grab" : "not-allowed",
                    opacity: !formCreatorMode || isDragging ? 0.5 : 1,
                  }}
                  draggable={formCreatorMode}
                  onDragStart={(e) => handleDragStart(e, field.id)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={() => {}}
                  onMouseEnter={(e) => {
                    if (formCreatorMode) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.background = "var(--accent-tint)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line-strong)";
                    e.currentTarget.style.background = "var(--surface)";
                  }}
                >
                  <div className="flex items-center">
                    <div
                      className="w-8 h-8 flex items-center justify-center mr-3"
                      style={{ color: "var(--accent)" }}
                    >
                      <field.Icon width={24} height={24} />
                    </div>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--ink)" }}
                    >
                      {field.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="mt-6 text-sm leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            <p>
              Enable Form Creator Mode to drag and drop form fields. Drag and
              drop form fields onto the document to add them.
            </p>
          </div>
        </div>
      </div>

      {/* Viewer Container */}
      <div
        ref={containerRef}
        style={{ flex: 1, height: "100%", position: "relative" }}
      />
    </div>
  );
}
