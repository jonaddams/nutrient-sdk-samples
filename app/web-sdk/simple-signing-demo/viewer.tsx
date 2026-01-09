"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import type { FieldType, Signer, User } from "./_lib/types";
import "./styles.css";

// Default users and signers
const ADMIN_USER: User = {
  id: "admin",
  name: "Admin",
  email: "admin@example.com",
  role: "Editor",
};

const DEFAULT_SIGNERS: Signer[] = [
  {
    id: "signer-1",
    name: "John Doe",
    email: "john@example.com",
    color: "#4A90E2",
  },
  {
    id: "signer-2",
    name: "Jane Smith",
    email: "jane@example.com",
    color: "#7B68EE",
  },
];

const FIELD_TYPES: Array<{ type: FieldType; label: string; icon: string }> = [
  { type: "signature", label: "Signature", icon: "✍️" },
  { type: "initial", label: "Initial", icon: "✓" },
  { type: "date", label: "Date", icon: "📅" },
];

export default function SigningDemoViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);

  const [currentUser, setCurrentUser] = useState<User>(ADMIN_USER);
  const [signers, setSigners] = useState<Signer[]>(DEFAULT_SIGNERS);
  const [selectedSignerId, setSelectedSignerId] = useState<string>(DEFAULT_SIGNERS[0].id);
  const [isDragging, setIsDragging] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only load viewer once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    let isMounted = true;

    const loadViewer = async () => {
      try {
        const instance = await window.NutrientViewer.load({
          container,
          document: "/documents/service-agreement.pdf",
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          useCDN: true,
          styleSheets: ["/simple-signing-demo.css"],
          customRenderers: {
            Annotation: ({ annotation }) => {
              // Customize signature, initial, and date form field widgets
              if (
                annotation instanceof window.NutrientViewer.Annotations.WidgetAnnotation &&
                annotation.customData?.type &&
                ["signature", "initial", "date"].includes(annotation.customData.type)
              ) {
                const { signerName, signerColor, type } = annotation.customData;

                // Create custom DOM node
                const node = document.createElement("div");
                node.className = "custom-signature-field";
                node.style.cssText = `
                  width: 100%;
                  height: 100%;
                  border: 2px solid ${signerColor};
                  background-color: ${signerColor}15;
                  display: flex;
                  align-items: center;
                  justify-content: ${type === "date" ? "flex-start" : "center"};
                  padding-left: ${type === "date" ? "8px" : "0"};
                  font-size: 14px;
                  font-weight: 500;
                  color: ${type === "date" ? "#999" : "#333"};
                  cursor: pointer;
                  user-select: none;
                  pointer-events: none;
                `;

                // Display text based on field type
                let displayText = "";
                if (type === "initial") {
                  displayText = signerName.split(" ").map(n => n[0]).join("").toUpperCase();
                } else if (type === "date") {
                  displayText = ""; // Empty for date, let the input show through
                } else {
                  displayText = signerName;
                }

                node.textContent = displayText;

                return {
                  node,
                  append: true, // Add to the annotation UI, keep functionality
                };
              }

              return null; // Use default rendering for other annotations
            },
          },
        });

        if (!isMounted) return;
        instanceRef.current = instance;

        // Set initial interaction mode to FORM_CREATOR for Admin
        if (currentUser.role === "Editor") {
          instance.setViewState((viewState) =>
            viewState.set("interactionMode", window.NutrientViewer.InteractionMode.FORM_CREATOR)
          );
        }
      } catch (error) {
        console.error("Error loading viewer:", error);
      }
    };

    loadViewer();

    return () => {
      isMounted = false;
      if (container && window.NutrientViewer) {
        window.NutrientViewer.unload(container);
      }
    };
  }, []);

  // Update interaction mode when user changes
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !window.NutrientViewer) return;

    const interactionMode = currentUser.role === "Editor"
      ? window.NutrientViewer.InteractionMode.FORM_CREATOR
      : null; // Default mode for signers (allows form filling)

    instance.setViewState((viewState) =>
      interactionMode
        ? viewState.set("interactionMode", interactionMode)
        : viewState.set("interactionMode", null)
    );
  }, [currentUser.role]);

  // Update form field permissions when user role changes (not on every currentUser change)
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !window.NutrientViewer) return;

    const updateFieldPermissions = async () => {
      try {
        const formFields = await instance.getFormFields();
        if (formFields.size === 0) return; // No fields to update

        for (const field of formFields) {
          // Get all annotations to find widgets associated with this form field
          const annotations = await instance.getAnnotations(0);
          const widget = annotations.find(
            (ann) => ann.formFieldName === field.name
          );

          if (widget?.customData) {
            // Admin can edit all fields, Signers can only edit their own
            const isUserField = currentUser.role === "Editor" || widget.customData.signerID === currentUser.id;
            const currentReadOnly = field.readOnly || false;
            const newReadOnly = !isUserField;

            // Only update if the value actually needs to change
            if (currentReadOnly !== newReadOnly) {
              const updatedField = field.set("readOnly", newReadOnly);
              await instance.update(updatedField);
            }
          }
        }
      } catch (error) {
        console.error("Error updating field permissions:", error);
      }
    };

    // Add a small delay to ensure annotations are fully created
    const timeoutId = setTimeout(() => {
      updateFieldPermissions();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentUser.id, currentUser.role]);

  const handleUserChange = (userId: string) => {
    if (userId === "admin") {
      setCurrentUser(ADMIN_USER);
    } else {
      const signer = signers.find((s) => s.id === userId);
      if (signer) {
        setCurrentUser({
          id: signer.id,
          name: signer.name,
          email: signer.email,
          role: "Signer",
        });
      }
    }
  };

  const handleDeleteSigner = (signerId: string) => {
    setSigners(signers.filter((s) => s.id !== signerId));
    if (selectedSignerId === signerId && signers.length > 0) {
      setSelectedSignerId(signers[0].id);
    }
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    fieldType: FieldType
  ) => {
    const selectedSigner = signers.find((s) => s.id === selectedSignerId);
    if (!selectedSigner) return;

    // Encode drag data: name%email%instantId%type%color
    const instantId = `${fieldType}-${Date.now()}`;
    const data = `${selectedSigner.name}%${selectedSigner.email}%${instantId}%${fieldType}%${selectedSigner.color}`;
    event.dataTransfer.setData("text", data);
    event.dataTransfer.effectAllowed = "copy";

    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const instance = instanceRef.current;
    if (!instance || !window.NutrientViewer) return;

    try {
      // Parse drag data
      const data = event.dataTransfer.getData("text");
      if (!data) {
        console.warn("No drag data received");
        return;
      }

      const [name, email, instantId, type, color] = data.split("%");

      // Determine field dimensions
      const width = type === "signature" ? 150 : type === "initial" ? 80 : 120;
      const height = type === "signature" ? 50 : type === "initial" ? 40 : 30;

      // Try to determine page index by testing transform on each page
      const totalPages = await instance.totalPageCount;
      let pageIndex = 0;
      let boundingBox = null;

      for (let i = 0; i < totalPages; i++) {
        const clientRect = new window.NutrientViewer.Geometry.Rect({
          left: event.clientX - width / 2,
          top: event.clientY - height / 2,
          width,
          height,
        });

        const testRect = instance.transformContentClientToPageSpace(clientRect, i);

        // The transform returns a valid rect for the page containing the cursor
        // Check if the rect seems reasonable (not massively out of bounds)
        if (testRect) {
          const pageInfo = await instance.pageInfoForIndex(i);
          // If the transformed point is within reasonable bounds of the page
          if (testRect.left >= -width && testRect.left <= pageInfo.width + width &&
              testRect.top >= -height && testRect.top <= pageInfo.height + height) {
            pageIndex = i;
            boundingBox = testRect;
            break;
          }
        }
      }

      if (!boundingBox) {
        console.warn("Could not determine page for drop");
        return;
      }

      // Create annotation and form field based on type
      if (type === "date") {
        // Create widget annotation for date field with date picker
        const annotation = new window.NutrientViewer.Annotations.WidgetAnnotation({
          id: instantId,
          pageIndex,
          boundingBox,
          formFieldName: instantId,
          customData: {
            signerID: selectedSignerId,
            signerEmail: email,
            signerName: name,
            signerColor: color,
            type,
          },
          borderColor: window.NutrientViewer.Color.fromHex(color),
          borderWidth: 2,
          additionalActions: {
            onFormat: new window.NutrientViewer.Actions.JavaScriptAction({
              script: 'AFDate_FormatEx("mm/dd/yyyy")',
            }),
          },
        });

        // Create text form field for date
        const formField = new window.NutrientViewer.FormFields.TextFormField({
          name: instantId,
          annotationIds: new window.NutrientViewer.Immutable.List([instantId]),
        });

        await instance.create([annotation, formField]);
      } else {
        // Create widget annotation for signature/initial fields
        const annotation = new window.NutrientViewer.Annotations.WidgetAnnotation({
          id: instantId,
          pageIndex,
          boundingBox,
          formFieldName: instantId,
          customData: {
            signerID: selectedSignerId,
            signerEmail: email,
            signerName: name,
            signerColor: color,
            type,
          },
        });

        // Create signature form field
        const formField = new window.NutrientViewer.FormFields.SignatureFormField({
          name: instantId,
          annotationIds: new window.NutrientViewer.Immutable.List([instantId]),
        });

        await instance.create([annotation, formField]);
      }
    } catch (error) {
      console.error("Error creating annotation:", error);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  return (
    <div className="signing-demo-wrapper">
      {/* Sidebar */}
      <div className="signing-demo-sidebar">
        {/* User Selector */}
        <div className="sidebar-section">
          <label htmlFor="user-selector" className="sidebar-label">
            Current User
          </label>
          <select
            id="user-selector"
            className="user-selector"
            value={currentUser.id}
            onChange={(e) => handleUserChange(e.target.value)}
          >
            <option value="admin">Admin (Editor)</option>
            {signers.map((signer) => (
              <option key={signer.id} value={signer.id}>
                {signer.name} (Signer)
              </option>
            ))}
          </select>
        </div>

        {/* Signers List */}
        {currentUser.role === "Editor" && (
          <div className="sidebar-section">
            <div className="sidebar-label">Signers</div>
            <ul className="signers-list">
              {signers.map((signer) => (
                <li
                  key={signer.id}
                  className={`signer-item ${selectedSignerId === signer.id ? "selected" : ""}`}
                  onClick={() => setSelectedSignerId(signer.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSignerId(signer.id);
                    }
                  }}
                >
                  <div className="signer-info">
                    <div
                      className="signer-color-indicator"
                      style={{ backgroundColor: signer.color }}
                    />
                    <div className="signer-details">
                      <div className="signer-name">{signer.name}</div>
                      <div className="signer-email">{signer.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="delete-signer-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSigner(signer.id);
                    }}
                    aria-label="Delete signer"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Draggable Form Fields */}
        {currentUser.role === "Editor" && (
          <div className="sidebar-section">
            <div className="sidebar-label">Form Fields</div>
            <div className="form-fields-list">
              {FIELD_TYPES.map((field) => {
                const selectedSigner = signers.find((s) => s.id === selectedSignerId);
                return (
                  <button
                    key={field.type}
                    type="button"
                    className="draggable-field"
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.type)}
                    onDragEnd={handleDragEnd}
                    style={{
                      borderLeftColor: selectedSigner?.color || "#ccc",
                    }}
                  >
                    <span className="field-icon">{field.icon}</span>
                    <span className="field-label">{field.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="field-hint">
              Drag a field onto the document to place it
            </div>
          </div>
        )}
      </div>

      {/* Viewer */}
      <section
        ref={containerRef}
        className={`signing-demo-viewer ${isDragging ? "drop-zone-active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        aria-label="PDF Viewer"
      />
    </div>
  );
}

declare global {
  interface Window {
    NutrientViewer?: {
      load: (config: {
        container: HTMLElement;
        document: string;
        licenseKey: string | undefined;
        useCDN: boolean;
      }) => Promise<Instance>;
      unload: (container: HTMLElement) => void;
    };
  }
}
