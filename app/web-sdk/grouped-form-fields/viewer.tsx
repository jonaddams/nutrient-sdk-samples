"use client";

import type { Instance, List } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";
import "./styles.css";

const DOCUMENT = "/documents/service-agreement.pdf";

// Stamp dimensions in PDF points
const STAMP_WIDTH = 340;
const STAMP_HEIGHT = 260;

type StampTemplate = {
  id: string;
  name: string;
  description: string;
  color: string;
};

const STAMP_TEMPLATES: StampTemplate[] = [
  {
    id: "review",
    name: "Review Stamp",
    description:
      "Architecture review stamp with approval checkboxes, reviewer, and date fields",
    color: "#4A90D9",
  },
  {
    id: "approval",
    name: "Approval Stamp",
    description:
      "General approval stamp with approve/reject options and signature fields",
    color: "#2ECC71",
  },
];

type PlacedStamp = {
  groupId: string;
  templateId: string;
  pageIndex: number;
  x: number;
  y: number;
  annotationIds: string[];
};

// Generate a stamp image as a PNG Blob (rasterized from SVG via canvas)
function generateStampPng(template: StampTemplate): Promise<Blob> {
  const scale = 2;
  const font = "Helvetica, Arial, sans-serif";
  let svg: string;

  // ACME Corp logo — positioned in the top-right area of the stamp
  const logoX = STAMP_WIDTH - 100;
  const acmeLogo = `
      <g transform="translate(${logoX}, 48)">
        <rect x="0" y="0" width="85" height="56" rx="4" fill="#1a1a2e" />
        <polygon points="12,38 20,16 28,38" fill="#e94560" />
        <polygon points="20,34 28,12 36,34" fill="#e94560" opacity="0.7" />
        <circle cx="56" cy="20" r="10" fill="none" stroke="#0f3460" stroke-width="3" />
        <circle cx="56" cy="20" r="4" fill="#e94560" />
        <text x="42" y="50" fill="white" font-family="${font}" font-size="7.5" font-weight="bold" text-anchor="middle">ACME CORP</text>
      </g>`;

  if (template.id === "review") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STAMP_WIDTH}" height="${STAMP_HEIGHT}" viewBox="0 0 ${STAMP_WIDTH} ${STAMP_HEIGHT}">
      <rect x="1" y="1" width="${STAMP_WIDTH - 2}" height="${STAMP_HEIGHT - 2}" rx="4" fill="white" stroke="${template.color}" stroke-width="2"/>
      <rect x="1" y="1" width="${STAMP_WIDTH - 2}" height="40" rx="4" fill="${template.color}"/>
      <rect x="1" y="21" width="${STAMP_WIDTH - 2}" height="20" fill="${template.color}"/>
      <text x="${STAMP_WIDTH / 2}" y="28" text-anchor="middle" fill="white" font-family="${font}" font-size="16" font-weight="bold">DESIGN REVIEW</text>
      ${acmeLogo}
      <text x="38" y="60" fill="#333" font-family="${font}" font-size="11">NO EXCEPTIONS TAKEN</text>
      <text x="38" y="80" fill="#333" font-family="${font}" font-size="11">AMEND AS NOTED</text>
      <text x="38" y="100" fill="#333" font-family="${font}" font-size="11">REVISE AND RESUBMIT</text>
      <line x1="10" y1="115" x2="${STAMP_WIDTH - 10}" y2="115" stroke="#ddd" stroke-width="1"/>
      <text x="15" y="132" fill="#666" font-family="${font}" font-size="8">REVIEW IS FOR GENERAL COMPLIANCE WITH THE DESIGN CONCEPT</text>
      <text x="15" y="143" fill="#666" font-family="${font}" font-size="8">OF THE PROJECT. CONTRACTOR IS RESPONSIBLE FOR DIMENSIONS,</text>
      <text x="15" y="154" fill="#666" font-family="${font}" font-size="8">DETAILS OF CONSTRUCTION, QUANTITIES, COORDINATION WITH</text>
      <text x="15" y="165" fill="#666" font-family="${font}" font-size="8">OTHER TRADES, ERRORS &amp; OMISSIONS.</text>
      <line x1="10" y1="178" x2="${STAMP_WIDTH - 10}" y2="178" stroke="#ddd" stroke-width="1"/>
    </svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STAMP_WIDTH}" height="${STAMP_HEIGHT}" viewBox="0 0 ${STAMP_WIDTH} ${STAMP_HEIGHT}">
      <rect x="1" y="1" width="${STAMP_WIDTH - 2}" height="${STAMP_HEIGHT - 2}" rx="4" fill="white" stroke="${template.color}" stroke-width="2"/>
      <rect x="1" y="1" width="${STAMP_WIDTH - 2}" height="40" rx="4" fill="${template.color}"/>
      <rect x="1" y="21" width="${STAMP_WIDTH - 2}" height="20" fill="${template.color}"/>
      <text x="${STAMP_WIDTH / 2}" y="28" text-anchor="middle" fill="white" font-family="${font}" font-size="16" font-weight="bold">APPROVAL</text>
      ${acmeLogo}
      <text x="38" y="60" fill="#333" font-family="${font}" font-size="11">APPROVED</text>
      <text x="38" y="80" fill="#333" font-family="${font}" font-size="11">APPROVED AS NOTED</text>
      <text x="38" y="100" fill="#333" font-family="${font}" font-size="11">REJECTED</text>
      <line x1="10" y1="115" x2="${STAMP_WIDTH - 10}" y2="115" stroke="#ddd" stroke-width="1"/>
      <text x="15" y="132" fill="#666" font-family="${font}" font-size="8">THIS DOCUMENT HAS BEEN REVIEWED AND PROCESSED</text>
      <text x="15" y="143" fill="#666" font-family="${font}" font-size="8">IN ACCORDANCE WITH THE APPLICABLE STANDARDS.</text>
      <text x="15" y="154" fill="#666" font-family="${font}" font-size="8">APPROVAL DOES NOT RELIEVE THE CONTRACTOR OF</text>
      <text x="15" y="165" fill="#666" font-family="${font}" font-size="8">RESPONSIBILITY FOR ERRORS OR OMISSIONS.</text>
      <line x1="10" y1="178" x2="${STAMP_WIDTH - 10}" y2="178" stroke="#ddd" stroke-width="1"/>
    </svg>`;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = STAMP_WIDTH * scale;
    canvas.height = STAMP_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("No canvas context"));
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG load failed"));
    };
    img.src = url;
  });
}

type FieldDef = {
  type: "checkbox" | "text" | "date" | "signatureImage";
  name: string;
  label: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  imageSrc?: string;
};

function getFieldsForTemplate(templateId: string): FieldDef[] {
  if (templateId === "review") {
    return [
      {
        type: "checkbox",
        name: "no_exceptions",
        label: "No Exceptions Taken",
        offsetX: 15,
        offsetY: 48,
        width: 16,
        height: 16,
      },
      {
        type: "checkbox",
        name: "amend_as_noted",
        label: "Amend As Noted",
        offsetX: 15,
        offsetY: 68,
        width: 16,
        height: 16,
      },
      {
        type: "checkbox",
        name: "revise_resubmit",
        label: "Revise and Resubmit",
        offsetX: 15,
        offsetY: 88,
        width: 16,
        height: 16,
      },
      {
        type: "signatureImage",
        name: "reviewed_by",
        label: "BY:",
        offsetX: 10,
        offsetY: 185,
        width: 150,
        height: 55,
        imageSrc: "/john-adams-signature.png",
      },
      {
        type: "date",
        name: "review_date",
        label: "DATE:",
        offsetX: 180,
        offsetY: 195,
        width: 140,
        height: 24,
      },
    ];
  }
  return [
    {
      type: "checkbox",
      name: "approved",
      label: "Approved",
      offsetX: 15,
      offsetY: 48,
      width: 16,
      height: 16,
    },
    {
      type: "checkbox",
      name: "approved_as_noted",
      label: "Approved As Noted",
      offsetX: 15,
      offsetY: 68,
      width: 16,
      height: 16,
    },
    {
      type: "checkbox",
      name: "rejected",
      label: "Rejected",
      offsetX: 15,
      offsetY: 88,
      width: 16,
      height: 16,
    },
    {
      type: "signatureImage",
      name: "approved_by",
      label: "BY:",
      offsetX: 10,
      offsetY: 185,
      width: 150,
      height: 55,
      imageSrc: "/john-hancock-signature.png",
    },
    {
      type: "date",
      name: "approval_date",
      label: "DATE:",
      offsetX: 180,
      offsetY: 195,
      width: 140,
      height: 24,
    },
  ];
}

// Find a page element from a target element (walk up the DOM)
function findPageElement(el: Element | null): Element | null {
  while (el) {
    if (el.classList?.contains("PSPDFKit-Page")) return el;
    if (el.className?.toString().toLowerCase().includes("page")) return el;
    el = el.parentElement;
  }
  return null;
}

export default function StampAnnotationsViewer({
  creatorMode,
  onStampsChanged,
  deleteStampRef,
}: {
  creatorMode: boolean;
  onStampsChanged: (stamps: PlacedStamp[]) => void;
  deleteStampRef: React.MutableRefObject<((groupId: string) => void) | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const stampsRef = useRef<PlacedStamp[]>([]);
  const suppressGroupSyncRef = useRef(false);
  const creatorModeRef = useRef(creatorMode);
  const onStampsChangedRef = useRef(onStampsChanged);
  const dragHandlersRef = useRef<{
    dragover: (e: Event) => void;
    drop: (e: Event) => void;
  } | null>(null);

  useEffect(() => {
    creatorModeRef.current = creatorMode;
  }, [creatorMode]);
  useEffect(() => {
    onStampsChangedRef.current = onStampsChanged;
  }, [onStampsChanged]);

  const updateStamps = useCallback((newStamps: PlacedStamp[]) => {
    stampsRef.current = newStamps;
    onStampsChangedRef.current(newStamps);
  }, []);

  const deleteStampGroup = useCallback(
    async (groupId: string) => {
      const instance = instanceRef.current;
      if (!instance) return;

      const stamp = stampsRef.current.find((s) => s.groupId === groupId);
      if (!stamp) return;

      suppressGroupSyncRef.current = true;

      for (const annId of stamp.annotationIds) {
        try {
          await instance.delete(annId);
        } catch {
          /* already deleted */
        }
      }

      try {
        const formFields = await instance.getFormFields();
        for (const field of formFields.toArray()) {
          if ((field as any).name?.startsWith(`${groupId}-`)) {
            try {
              await instance.delete(field);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }

      suppressGroupSyncRef.current = false;
      updateStamps(stampsRef.current.filter((s) => s.groupId !== groupId));
    },
    [updateStamps],
  );

  // Expose deleteStampGroup to parent via ref
  useEffect(() => {
    deleteStampRef.current = deleteStampGroup;
    return () => {
      deleteStampRef.current = null;
    };
  }, [deleteStampGroup, deleteStampRef]);

  const moveStampGroup = useCallback(
    async (
      groupId: string,
      deltaX: number,
      deltaY: number,
      excludeId: string,
    ) => {
      const instance = instanceRef.current;
      const NV = window.NutrientViewer;
      if (!instance || !NV) return;

      const stamp = stampsRef.current.find((s) => s.groupId === groupId);
      if (!stamp) return;

      suppressGroupSyncRef.current = true;

      const annotations = await instance.getAnnotations(stamp.pageIndex);
      const annArray = annotations.toArray();

      const updates = stamp.annotationIds
        .filter((annId) => annId !== excludeId)
        .map((annId) => {
          const ann = annArray.find((a: any) => a.id === annId);
          if (!ann) return null;
          const bbox = (ann as any).boundingBox;
          if (!bbox) return null;
          const newBbox = new NV.Geometry.Rect({
            left: bbox.left + deltaX,
            top: bbox.top + deltaY,
            width: bbox.width,
            height: bbox.height,
          });
          return instance
            .update((ann as any).set("boundingBox", newBbox))
            .catch(() => {});
        })
        .filter(Boolean);

      await Promise.all(updates);

      updateStamps(
        stampsRef.current.map((s) =>
          s.groupId === groupId
            ? { ...s, x: s.x + Math.round(deltaX), y: s.y + Math.round(deltaY) }
            : s,
        ),
      );

      suppressGroupSyncRef.current = false;
    },
    [updateStamps],
  );

  // Place a stamp at the drop position (client coordinates)
  const placeStamp = useCallback(
    async (
      templateId: string,
      pageIndex: number,
      clientX: number,
      clientY: number,
    ) => {
      const instance = instanceRef.current;
      const NV = window.NutrientViewer;
      if (!instance || !NV) return;

      const template = STAMP_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      const groupId = `stamp-${crypto.randomUUID().slice(0, 8)}`;
      const annotationIds: string[] = [];

      const stampClientRect = new NV.Geometry.Rect({
        left: clientX - STAMP_WIDTH / 2,
        top: clientY - STAMP_HEIGHT / 2,
        width: STAMP_WIDTH,
        height: STAMP_HEIGHT,
      });
      const stampPageRect = instance.transformContentClientToPageSpace(
        stampClientRect,
        pageIndex,
      );

      // 1. Background image
      const pngBlob = await generateStampPng(template);
      const attachmentId = await instance.createAttachment(pngBlob);

      const imageId = NV.generateInstantId();
      const imageAnnotation = new NV.Annotations.ImageAnnotation({
        id: imageId,
        pageIndex,
        contentType: "image/png",
        boundingBox: stampPageRect,
        imageAttachmentId: attachmentId,
        customData: {
          groupId,
          stampTemplateId: template.id,
          role: "background",
        },
      });
      annotationIds.push(imageId);

      // 2. Form fields
      const fields = getFieldsForTemplate(template.id);
      const toCreate: any[] = [imageAnnotation];

      const makeList = (items: string[]) =>
        new (
          NV.Immutable.List as unknown as new (
            items: string[],
          ) => List<string>
        )(items);

      for (const field of fields) {
        const fieldClientRect = new NV.Geometry.Rect({
          left: clientX - STAMP_WIDTH / 2 + field.offsetX,
          top: clientY - STAMP_HEIGHT / 2 + field.offsetY,
          width: field.width,
          height: field.height,
        });
        const fieldPageRect = instance.transformContentClientToPageSpace(
          fieldClientRect,
          pageIndex,
        );

        // Signature images are static ImageAnnotations, not form fields
        if (field.type === "signatureImage" && field.imageSrc) {
          const sigResponse = await fetch(field.imageSrc);
          const sigBlob = await sigResponse.blob();
          const sigAttachmentId = await instance.createAttachment(sigBlob);
          const sigId = NV.generateInstantId();
          const sigAnnotation = new NV.Annotations.ImageAnnotation({
            id: sigId,
            pageIndex,
            contentType: "image/png",
            boundingBox: fieldPageRect,
            imageAttachmentId: sigAttachmentId,
            customData: {
              groupId,
              stampTemplateId: template.id,
              role: "signature",
            },
          });
          toCreate.push(sigAnnotation);
          annotationIds.push(sigId);
          continue;
        }

        const widgetId = NV.generateInstantId();
        const fieldName = `${groupId}-${field.name}`;

        const widgetOpts: any = {
          id: widgetId,
          pageIndex,
          boundingBox: fieldPageRect,
          formFieldName: fieldName,
          customData: {
            groupId,
            stampTemplateId: template.id,
            role: "field",
            fieldType: field.type,
            fieldLabel: field.label,
          },
        };
        if (field.type === "date") {
          widgetOpts.additionalActions = {
            onFormat: new NV.Actions.JavaScriptAction({
              script: 'AFDate_FormatEx("mm/dd/yyyy")',
            }),
          };
        }
        const widget = new NV.Annotations.WidgetAnnotation(widgetOpts);

        let formField: any;
        if (field.type === "checkbox") {
          formField = new NV.FormFields.CheckBoxFormField({
            name: fieldName,
            annotationIds: makeList([widgetId]),
            options: new (
              NV.Immutable.List as unknown as new (
                items: any[],
              ) => List<any>
            )([new NV.FormOption({ label: "Yes", value: "Yes" })]),
            defaultValues: makeList([]),
            value: [],
          });
        } else {
          formField = new NV.FormFields.TextFormField({
            name: fieldName,
            annotationIds: makeList([widgetId]),
          });
        }

        toCreate.push(widget, formField);
        annotationIds.push(widgetId);
      }

      await instance.create(toCreate);

      const centerX = stampPageRect.left + stampPageRect.width / 2;
      const centerY = stampPageRect.top + stampPageRect.height / 2;
      updateStamps([
        ...stampsRef.current,
        {
          groupId,
          templateId: template.id,
          pageIndex,
          x: Math.round(centerX),
          y: Math.round(centerY),
          annotationIds,
        },
      ]);
    },
    [updateStamps],
  );

  // Set up drag-and-drop handlers on the content document
  const setupDragDrop = useCallback(
    (instance: Instance, enabled: boolean) => {
      const dragoverHandler = (event: Event) => {
        if (!enabled) return;
        const dragEvent = event as DragEvent;
        if (findPageElement(dragEvent.target as Element)) {
          event.preventDefault();
        }
      };

      const dropHandler = async (event: Event) => {
        if (!enabled) return;
        const dragEvent = event as DragEvent;
        event.preventDefault();
        event.stopPropagation();

        const templateId = dragEvent.dataTransfer?.getData("text") || "";
        if (!templateId || !STAMP_TEMPLATES.find((t) => t.id === templateId))
          return;

        const pageElement = findPageElement(dragEvent.target as Element);
        if (!pageElement) return;

        const pageIndex = parseInt(
          (pageElement as HTMLElement).dataset.pageIndex || "0",
          10,
        );
        placeStamp(templateId, pageIndex, dragEvent.clientX, dragEvent.clientY);
      };

      if (instance?.contentDocument) {
        instance.contentDocument.addEventListener("dragover", dragoverHandler);
        instance.contentDocument.addEventListener("drop", dropHandler);
        dragHandlersRef.current = {
          dragover: dragoverHandler,
          drop: dropHandler,
        };
      }
    },
    [placeStamp],
  );

  const cleanupDragDrop = useCallback((instance: Instance) => {
    if (instance?.contentDocument && dragHandlersRef.current) {
      instance.contentDocument.removeEventListener(
        "dragover",
        dragHandlersRef.current.dragover,
      );
      instance.contentDocument.removeEventListener(
        "drop",
        dragHandlersRef.current.drop,
      );
      dragHandlersRef.current = null;
    }
  }, []);

  // Initialize viewer
  // biome-ignore lint/correctness/useExhaustiveDependencies: event handlers read from refs
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;
    const { NutrientViewer } = window;

    const prevBboxMap = new Map<string, { left: number; top: number }>();

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: [
        ...(NutrientViewer.defaultToolbarItems ?? []).filter(
          (item: { type: string }) =>
            ["pager", "zoom-out", "zoom-in", "zoom-mode", "search"].includes(
              item.type,
            ),
        ),
      ],
      // Prevent stamp background annotations from being selected/edited
      // when not in creator mode. The callback reads creatorModeRef dynamically.
      isEditableAnnotation: (annotation: any) => {
        if (!creatorModeRef.current && annotation?.customData?.groupId) {
          // In end-user mode, only widget annotations (form fields) are editable
          const role = annotation?.customData?.role;
          if (role === "background" || role === "signature") {
            return false;
          }
        }
        return true;
      },
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      // Set up initial drag-drop state
      setupDragDrop(instance, creatorModeRef.current);

      // Track annotation positions after creation
      instance.addEventListener(
        "annotations.create" as any,
        (annotations: any) => {
          const list = annotations?.toArray ? annotations.toArray() : [];
          for (const ann of list) {
            if (ann?.boundingBox && ann?.customData?.groupId) {
              prevBboxMap.set(ann.id, {
                left: ann.boundingBox.left,
                top: ann.boundingBox.top,
              });
            }
          }
        },
      );

      // Handle group move
      instance.addEventListener(
        "annotations.update" as any,
        (annotations: any) => {
          if (suppressGroupSyncRef.current) return;
          if (!creatorModeRef.current) return; // no moves when locked
          const list = annotations?.toArray ? annotations.toArray() : [];

          for (const ann of list) {
            const groupId = ann?.customData?.groupId;
            if (!groupId || !ann?.boundingBox) continue;

            const prev = prevBboxMap.get(ann.id);
            if (!prev) {
              prevBboxMap.set(ann.id, {
                left: ann.boundingBox.left,
                top: ann.boundingBox.top,
              });
              continue;
            }

            const deltaX = ann.boundingBox.left - prev.left;
            const deltaY = ann.boundingBox.top - prev.top;
            prevBboxMap.set(ann.id, {
              left: ann.boundingBox.left,
              top: ann.boundingBox.top,
            });

            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
              moveStampGroup(groupId, deltaX, deltaY, ann.id);
            }
          }
        },
      );

      // Handle group delete
      instance.addEventListener(
        "annotations.delete" as any,
        (annotations: any) => {
          if (suppressGroupSyncRef.current) return;
          if (!creatorModeRef.current) return; // no deletes when locked
          const list = annotations?.toArray ? annotations.toArray() : [];

          for (const ann of list) {
            const groupId = ann?.customData?.groupId;
            if (!groupId) continue;
            deleteStampGroup(groupId);
            break;
          }
        },
      );
    });

    return () => {
      const inst = instanceRef.current;
      if (inst) cleanupDragDrop(inst);
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  // Re-setup drag-drop and toggle interaction mode when creatorMode changes
  useEffect(() => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    cleanupDragDrop(instance);
    setupDragDrop(instance, creatorMode);

    // Creator mode ON: FORM_CREATOR allows moving/selecting annotations
    // Creator mode OFF: default mode for form filling
    instance.setViewState((viewState: any) =>
      creatorMode
        ? viewState.set("interactionMode", NV.InteractionMode.FORM_CREATOR)
        : viewState.set("interactionMode", null),
    );
  }, [creatorMode, cleanupDragDrop, setupDragDrop]);

  return <div ref={containerRef} className="stamp-viewer" />;
}

export type { PlacedStamp, StampTemplate };
export { STAMP_TEMPLATES };
