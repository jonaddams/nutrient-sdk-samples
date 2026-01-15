"use client";

/**
 * Simple Signing Demo - Nutrient Web SDK
 *
 * This demo showcases a complete document signing workflow with the following features:
 *
 * 1. ROLE-BASED ACCESS CONTROL:
 *    - Admin (Editor): Can place signature fields, manage signers, and apply digital signatures
 *    - Signers: Can only fill/sign their own assigned fields
 *
 * 2. ELECTRONIC SIGNATURES:
 *    - Drag-and-drop signature field placement by Admin
 *    - Signers electronically sign using drawing/typing/image
 *    - Custom rendering shows signer names on unsigned fields
 *
 * 3. DIGITAL SIGNATURES (DWS API):
 *    - Admin applies cryptographic digital signature to seal the document
 *    - Uses Nutrient's Document Signing Service (DWS) API
 *    - Provides tamper-evident proof and legal compliance
 *
 * 4. SIGNATURE FLATTENING:
 *    - Before digital signing, electronic signature images are flattened
 *    - Flattening makes signatures permanent (prevents removal/modification)
 *    - "By Nutrient {ID}" labels are added as TextAnnotations
 *
 * 5. ANNOTATION PERMISSIONS:
 *    - Form fields dynamically update readOnly status based on current user
 *    - Only field owners can sign their assigned fields
 *
 * 6. CERTIFICATE VALIDATION:
 *    - Fetches CA certificates from DWS API on mount
 *    - Configures trusted CAs for signature validation
 *    - Displays signature validation status banner when document is signed
 */

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import type { FieldType, Signer, User } from "./_lib/types";
import "./styles.css";

/**
 * Decodes base64-encoded certificate strings into ArrayBuffer format
 * Required for configuring trusted CA certificates in Nutrient Viewer
 *
 * @param base64 - Base64-encoded certificate string
 * @returns ArrayBuffer containing the decoded certificate data
 */
function decodeBase64String(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Default admin user - has full editing permissions
 * Role "Editor" allows placing fields and applying digital signatures
 */
const ADMIN_USER: User = {
  id: "admin",
  name: "Admin",
  email: "admin@example.com",
  role: "Editor",
};

/**
 * Default signers in the workflow
 * Each signer has a unique color for visual identification
 */
const DEFAULT_SIGNERS: Signer[] = [
  {
    id: "signer-1",
    name: "John Doe",
    email: "john@example.com",
    color: "#4A90E2", // Blue
  },
  {
    id: "signer-2",
    name: "Jane Smith",
    email: "jane@example.com",
    color: "#7B68EE", // Purple
  },
];

/**
 * Available form field types that can be dragged onto the document
 * - signature: Full signature field (larger)
 * - initial: Initial field (smaller, shows initials)
 * - date: Date field with formatted input
 */
const FIELD_TYPES: Array<{ type: FieldType; label: string; icon: string }> = [
  { type: "signature", label: "Signature", icon: "✍️" },
  { type: "initial", label: "Initial", icon: "✓" },
  { type: "date", label: "Date", icon: "📅" },
];

export default function SigningDemoViewer() {
  // ========================================
  // REFS - Persistent references across renders
  // ========================================

  /** Reference to the DOM container for Nutrient Viewer */
  const containerRef = useRef<HTMLDivElement>(null);

  /** Reference to the Nutrient Viewer instance - used for all document operations */
  const instanceRef = useRef<Instance | null>(null);

  /**
   * Reference to CA certificates for digital signature validation
   * Fetched from DWS API and used in trustedCAsCallback
   */
  const certificatesRef = useRef<{ ca_certificates: string[] } | null>(null);

  /**
   * Prevents double-loading in React strict mode
   * React strict mode mounts components twice in development
   */
  const hasLoadedRef = useRef(false);

  // ========================================
  // STATE - Dynamic UI and workflow state
  // ========================================

  /** Current active user - determines permissions and field visibility */
  const [currentUser, setCurrentUser] = useState<User>(ADMIN_USER);

  /** List of signers in the workflow - can be dynamically added/removed by Admin */
  const [signers, setSigners] = useState<Signer[]>(DEFAULT_SIGNERS);

  /** Currently selected signer for field placement (Admin only) */
  const [selectedSignerId, setSelectedSignerId] = useState<string>(
    DEFAULT_SIGNERS[0].id,
  );

  /** Tracks if user is currently dragging a field to place on document */
  const [isDragging, setIsDragging] = useState(false);

  /** Tracks if digital signature operation is in progress */
  const [isSigning, setIsSigning] = useState(false);

  /** Status message displayed to user during signing operations */
  const [signStatus, setSignStatus] = useState<string>("");

  /**
   * Tracks if CA certificates have been loaded
   * Viewer initialization waits for this to prevent race conditions
   */
  const [certificatesLoaded, setCertificatesLoaded] = useState(false);

  // ========================================
  // CERTIFICATE LOADING - DWS API Integration
  // ========================================

  /**
   * Fetches CA certificates from Document Signing Service (DWS) API
   * These certificates are used to validate digital signatures
   *
   * The trustedCAsCallback will use these certificates to determine
   * if a digital signature was signed by a trusted authority
   */
  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await fetch(
          "/api/sign-document-web-sdk-dws/api/certificates",
        );
        if (response.ok) {
          const data = await response.json();
          certificatesRef.current = data;
        } else {
          console.warn(
            "Failed to fetch certificates - signature validation may be limited",
          );
        }
      } catch (error) {
        console.warn("Error fetching certificates:", error);
      } finally {
        setCertificatesLoaded(true);
      }
    };

    fetchCertificates();
  }, []);

  // ========================================
  // CUSTOM OVERLAY MANAGEMENT
  // ========================================

  /**
   * Hides custom unsigned field overlays once signatures are electronically signed
   *
   * PROBLEM: Custom overlays showing signer names (e.g., "John Doe") are rendered
   * on top of signature fields. When a user signs, an ImageAnnotation is created,
   * but the custom overlay still shows the placeholder text over the signature image.
   *
   * SOLUTION: Use instance.getOverlappingAnnotations(field) to detect when a signature
   * field has been signed (has overlapping annotations), then remove the custom overlay
   * to reveal the actual signature image underneath.
   *
   * This function is called:
   * - On initial viewer load (to handle already-signed documents)
   * - When annotations are created (when users sign)
   * - When annotations are updated
   * - After applying digital signature
   */
  const hideSignedFieldOverlays = async () => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    try {
      // Get all form fields in the document
      const formFields = await instance.getFormFields();

      // Get all custom overlay DOM elements (created by customRenderers)
      const overlays = document.querySelectorAll(
        ".custom-signature-field[data-form-field-name]",
      );

      for (const overlay of overlays) {
        const formFieldName = overlay.getAttribute("data-form-field-name");
        if (!formFieldName) continue;

        // Find the form field that corresponds to this overlay
        const field = formFields.find((f) => f.name === formFieldName);
        if (!field) continue;

        // Only process signature/initial fields (not date fields)
        if (field instanceof NV.FormFields.SignatureFormField) {
          /**
           * KEY CONCEPT: instance.getOverlappingAnnotations(field)
           * Returns all annotations that overlap with this form field.
           * When a user electronically signs, an ImageAnnotation is created
           * that overlaps the signature WidgetAnnotation.
           * If overlapping.size > 0, the field has been signed.
           */
          const overlapping = await instance.getOverlappingAnnotations(field);

          // Field is signed - remove the custom overlay to show the signature image
          if (overlapping.size > 0) {
            // Walk up the DOM tree to find and remove any sibling overlays
            let currentElement: HTMLElement | null = overlay as HTMLElement;
            while (currentElement && currentElement !== document.body) {
              if (currentElement.parentElement) {
                const siblings = Array.from(
                  currentElement.parentElement.children,
                );
                // Remove any sibling elements that contain signer names
                siblings.forEach((sibling) => {
                  if (
                    sibling.textContent &&
                    (sibling.textContent.includes("John Doe") ||
                      sibling.textContent.includes("Jane Smith")) &&
                    sibling.classList.contains("custom-signature-field")
                  ) {
                    sibling.remove();
                  }
                });
              }
              currentElement = currentElement.parentElement;
            }

            // Remove the overlay element from DOM
            overlay.remove();
          } else {
            // Field is not signed - ensure overlay is visible
            (overlay as HTMLElement).style.display = "flex";
            (overlay as HTMLElement).style.visibility = "visible";
            (overlay as HTMLElement).style.opacity = "1";
          }
        }
      }
    } catch (error) {
      console.error("Error hiding signed field overlays:", error);
    }
  };

  // ========================================
  // VIEWER INITIALIZATION - Nutrient Web SDK Setup
  // ========================================

  /**
   * Initializes Nutrient Web SDK Viewer with custom configuration
   *
   * KEY FEATURES CONFIGURED:
   * 1. Certificate validation (trustedCAsCallback)
   * 2. Signature validation status banner
   * 3. Custom renderers for signature field overlays
   * 4. Form creator interaction mode for Admin
   * 5. Event listeners for annotation changes
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only load viewer once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    // Wait for certificates to be loaded before initializing viewer
    // This prevents race conditions where viewer loads before certificates are available
    if (!certificatesLoaded) {
      return;
    }

    // Prevent double-loading in React strict mode
    // React strict mode intentionally mounts/unmounts components twice in development
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    let isMounted = true;

    const loadViewer = async () => {
      const NV = window.NutrientViewer;
      if (!NV) return;

      try {
        // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer configuration types not fully available
        const configuration: any = {
          container,
          document: "/documents/service-agreement.pdf",
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          useCDN: true,
          styleSheets: ["/simple-signing-demo.css"],

          /**
           * SIGNATURE VALIDATION STATUS:
           * Shows a banner at the top of the document when it's digitally signed
           * Displays validation status (valid, invalid, unknown) and signer information
           * Mode.IF_SIGNED: Only show banner when document contains digital signatures
           */
          initialViewState: new NV.ViewState({
            showSignatureValidationStatus:
              NV.ShowSignatureValidationStatusMode.IF_SIGNED,
          }),

          /**
           * CUSTOM RENDERERS:
           * Customizes how annotations are displayed in the viewer
           * This allows us to add visual enhancements like signer names and branding
           */
          customRenderers: {
            /**
             * ANNOTATION CUSTOM RENDERER:
             * Customizes the visual appearance of annotations in the viewer
             *
             * TWO TYPES OF CUSTOMIZATIONS:
             * 1. Signed signatures: Add "By Nutrient {ID}" branding overlay
             * 2. Unsigned fields: Add colored overlay with signer name for identification
             */
            // biome-ignore lint/suspicious/noExplicitAny: annotation type not fully available
            Annotation: ({ annotation }: any) => {
              const NV2 = window.NutrientViewer;
              if (!NV2) return null;

              /**
               * SIGNED SIGNATURE RENDERING:
               * When a user electronically signs a field, an ImageAnnotation is created
               * with isSignature=true. We add a custom overlay with Nutrient branding.
               *
               * The overlay includes:
               * - "By Nutrient" label (positioned above signature)
               * - Truncated annotation ID for traceability
               * - Transparent background so signature shows through
               */
              if (annotation.isSignature) {
                const box = document.createElement("div");
                box.className = "signature-box-nutrient";
                const annotationId =
                  annotation.id.substring(0, 16) +
                  (annotation.id.length > 16 ? "..." : "");
                box.innerHTML = `<span class="signature-label-nutrient">By Nutrient</span><span class="signature-id-nutrient">${annotationId}</span>`;
                box.style.cssText = `
                  position: relative;
                  height: ${annotation.boundingBox.height}px;
                  width: ${annotation.boundingBox.width}px;
                `;
                box.style.setProperty(
                  "--box-height",
                  `${annotation.boundingBox.height}px`,
                );

                return {
                  node: box,
                  append: true,
                };
              }

              /**
               * UNSIGNED FIELD RENDERING:
               * For signature/initial/date fields that haven't been filled yet,
               * we render a custom overlay showing:
               * - Signer's name (or initials for initial fields)
               * - Color-coded border matching the signer's color
               * - Placeholder text to indicate which signer should fill this field
               *
               * This overlay is removed once the field is signed (see hideSignedFieldOverlays)
               */
              if (
                annotation instanceof NV2.Annotations.WidgetAnnotation &&
                annotation.customData?.type &&
                typeof annotation.customData.type === "string" &&
                ["signature", "initial", "date"].includes(
                  annotation.customData.type,
                )
              ) {
                // Extract custom data attached during field creation
                const customData = annotation.customData as {
                  signerName: string;
                  signerColor: string;
                  type: string;
                };
                const { signerName, signerColor, type } = customData;

                // Create custom DOM node
                const node = document.createElement("div");
                node.className = "custom-signature-field unsigned-field";
                // Store the form field name so we can check if it's signed later
                node.setAttribute(
                  "data-form-field-name",
                  annotation.formFieldName || "",
                );
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
                  displayText = signerName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase();
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
        };

        /**
         * CERTIFICATE TRUST CONFIGURATION:
         * Configures which Certificate Authorities (CAs) the viewer should trust
         * when validating digital signatures.
         *
         * This is critical for signature validation - without trusted CAs,
         * the viewer cannot verify that a digital signature is legitimate.
         *
         * The certificates are fetched from the DWS API and decoded from base64.
         */
        const certs = certificatesRef.current;
        if (certs?.ca_certificates && certs.ca_certificates.length > 0) {
          configuration.trustedCAsCallback = async () => {
            return certs.ca_certificates.map((cert: string) =>
              decodeBase64String(cert),
            );
          };
        }

        // Load the Nutrient Viewer instance with all configuration
        const instance = await NV.load(configuration);

        if (!isMounted) return;
        instanceRef.current = instance;

        /**
         * INTERACTION MODE - Admin vs Signer:
         * - Admin (Editor role): Uses FORM_CREATOR mode to place and edit fields
         * - Signers: Use default mode which allows filling out forms but not editing them
         */
        if (currentUser.role === "Editor") {
          instance.setViewState((viewState) =>
            viewState.set("interactionMode", NV.InteractionMode.FORM_CREATOR),
          );
        }

        /**
         * ANNOTATION CHANGE LISTENERS:
         * Listen for when signatures are created or updated, then hide the
         * custom overlays to reveal the actual signature images.
         *
         * Multiple timeouts are used to handle different timing scenarios:
         * - 100ms: Quick check for immediate updates
         * - 300ms: Handle slight DOM rendering delays
         * - 600ms+: Handle slower rendering or complex operations
         */
        instance.addEventListener("annotations.create", () => {
          setTimeout(() => hideSignedFieldOverlays(), 100);
          setTimeout(() => hideSignedFieldOverlays(), 300);
          setTimeout(() => hideSignedFieldOverlays(), 600);
        });

        instance.addEventListener("annotations.update", () => {
          setTimeout(() => hideSignedFieldOverlays(), 100);
          setTimeout(() => hideSignedFieldOverlays(), 300);
        });

        // Initial check for already-signed fields (when loading a signed document)
        setTimeout(() => hideSignedFieldOverlays(), 500);
        setTimeout(() => hideSignedFieldOverlays(), 1000);
        setTimeout(() => hideSignedFieldOverlays(), 2000);
      } catch (error) {
        console.error("Error loading viewer:", error);
        hasLoadedRef.current = false; // Reset on error
      }
    };

    loadViewer();

    return () => {
      isMounted = false;
      hasLoadedRef.current = false; // Reset for potential remount
      const NV = window.NutrientViewer;
      if (container && NV) {
        NV.unload(container);
      }
    };
  }, [certificatesLoaded]);

  // ========================================
  // DYNAMIC PERMISSION UPDATES
  // ========================================

  /**
   * Updates interaction mode when user switches roles
   *
   * This ensures that:
   * - Admin can always use FORM_CREATOR mode to place/edit fields
   * - Signers can only fill out forms, not create/edit fields
   */
  useEffect(() => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    const interactionMode =
      currentUser.role === "Editor" ? NV.InteractionMode.FORM_CREATOR : null; // Default mode for signers (allows form filling)

    instance.setViewState((viewState) =>
      interactionMode
        ? viewState.set("interactionMode", interactionMode)
        : viewState.set("interactionMode", null),
    );
  }, [currentUser.role]);

  /**
   * DYNAMIC FORM FIELD PERMISSIONS:
   * Updates readOnly status of form fields based on current user
   *
   * PERMISSION RULES:
   * - Admin (Editor): Can edit ALL fields (readOnly = false for all)
   * - Signers: Can ONLY edit their own fields (readOnly = false only for their fields)
   *
   * HOW IT WORKS:
   * 1. Get all form fields in the document
   * 2. Get all widget annotations (which have customData with signerID)
   * 3. For each field, check if current user owns it
   * 4. Update readOnly property accordingly
   *
   * This ensures signers can't accidentally (or maliciously) sign each other's fields
   */
  useEffect(() => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    const updateFieldPermissions = async () => {
      try {
        const formFields = await instance.getFormFields();
        if (formFields.size === 0) return; // No fields to update

        // Get all annotations from all pages to find widget customData
        const totalPages = await instance.totalPageCount;
        // biome-ignore lint/suspicious/noExplicitAny: annotation types not fully available
        let allAnnotations: any[] = [];
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const pageAnnotations = await instance.getAnnotations(pageIndex);
          allAnnotations = allAnnotations.concat(pageAnnotations.toArray());
        }

        for (const field of formFields) {
          // Find the widget annotation associated with this form field
          // The widget contains customData with the assigned signerID
          const widget = allAnnotations.find(
            (ann) => ann.formFieldName === field.name,
          );

          if (widget?.customData) {
            // Determine if current user can edit this field
            // Admin can edit all fields, Signers can only edit their own
            const isUserField =
              currentUser.role === "Editor" ||
              widget.customData.signerID === currentUser.id;
            const currentReadOnly = field.readOnly || false;
            const newReadOnly = !isUserField;

            // Only update if the value actually needs to change
            // This prevents unnecessary re-renders and API calls
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

  // ========================================
  // USER MANAGEMENT HANDLERS
  // ========================================

  /**
   * Switches the active user between Admin and Signers
   * Updates permissions and field access accordingly
   */
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

  /**
   * Removes a signer from the workflow
   * Also updates selected signer if the deleted one was selected
   */
  const handleDeleteSigner = (signerId: string) => {
    setSigners(signers.filter((s) => s.id !== signerId));
    if (selectedSignerId === signerId && signers.length > 0) {
      setSelectedSignerId(signers[0].id);
    }
  };

  // ========================================
  // DRAG-AND-DROP FIELD PLACEMENT
  // ========================================

  /**
   * Handles drag start for form field placement
   * Encodes signer information and field type into drag data
   *
   * Data format: "name%email%instantId%type%color"
   * This allows us to create properly configured annotations on drop
   */
  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    fieldType: FieldType,
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

  /**
   * Handles drop event to create form fields on the document
   *
   * PROCESS:
   * 1. Parse drag data to get signer info and field type
   * 2. Transform client coordinates to PDF page coordinates
   * 3. Create WidgetAnnotation and corresponding FormField
   * 4. Attach customData with signer information for permission management
   */
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    try {
      // Parse drag data
      const data = event.dataTransfer.getData("text");
      if (!data) {
        console.warn("No drag data received");
        return;
      }

      const [name, email, instantId, type, color] = data.split("%");

      // Determine field dimensions based on type
      const width = type === "signature" ? 150 : type === "initial" ? 80 : 120;
      const height = type === "signature" ? 50 : type === "initial" ? 40 : 30;

      // Try to determine page index by testing transform on each page
      const totalPages = await instance.totalPageCount;
      let pageIndex = 0;
      let boundingBox = null;

      for (let i = 0; i < totalPages; i++) {
        const clientRect = new NV.Geometry.Rect({
          left: event.clientX - width / 2,
          top: event.clientY - height / 2,
          width,
          height,
        });

        const testRect = instance.transformContentClientToPageSpace(
          clientRect,
          i,
        );

        // The transform returns a valid rect for the page containing the cursor
        // Check if the rect seems reasonable (not massively out of bounds)
        if (testRect) {
          const pageInfo = await instance.pageInfoForIndex(i);
          if (!pageInfo) continue;
          // If the transformed point is within reasonable bounds of the page
          if (
            testRect.left >= -width &&
            testRect.left <= pageInfo.width + width &&
            testRect.top >= -height &&
            testRect.top <= pageInfo.height + height
          ) {
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

      /**
       * CREATE FORM FIELDS:
       * Different field types require different annotation and form field configurations:
       * - Date fields: TextFormField with date formatting script
       * - Signature/Initial fields: SignatureFormField for electronic signing
       *
       * All fields store customData with signer information for permission management
       */
      if (type === "date") {
        // Create widget annotation for date field with date picker
        const annotation = new NV.Annotations.WidgetAnnotation({
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
          borderColor: NV.Color.fromHex(color),
          borderWidth: 2,
          additionalActions: {
            onFormat: new NV.Actions.JavaScriptAction({
              script: 'AFDate_FormatEx("mm/dd/yyyy")',
            }),
          },
        });

        // Create text form field for date
        const formField = new NV.FormFields.TextFormField({
          name: instantId,
          // @ts-expect-error - Immutable.List constructor type not available
          annotationIds: new NV.Immutable.List([instantId]),
        });

        await instance.create([annotation, formField]);
      } else {
        // Create widget annotation for signature/initial fields
        const annotation = new NV.Annotations.WidgetAnnotation({
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
        const formField = new NV.FormFields.SignatureFormField({
          name: instantId,
          // @ts-expect-error - Immutable.List constructor type not available
          annotationIds: new NV.Immutable.List([instantId]),
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

  // Helper to log current field positions (for debugging)
  const logFieldPositions = async () => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    const totalPages = await instance.totalPageCount;
    console.log(`=== Current Field Positions (${totalPages} pages) ===`);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const annotations = await instance.getAnnotations(pageIndex);
      const widgetAnnotations = annotations.filter(
        (ann) => ann instanceof NV.Annotations.WidgetAnnotation,
      );

      if (widgetAnnotations.size > 0) {
        console.log(`\n--- Page ${pageIndex + 1} ---`);
        for (const ann of widgetAnnotations) {
          const customData = ann.customData || {};
          console.log({
            page: pageIndex,
            type: customData.type,
            signer: customData.signerName,
            x: Math.round(ann.boundingBox.left),
            y: Math.round(ann.boundingBox.top),
            width: Math.round(ann.boundingBox.width),
            height: Math.round(ann.boundingBox.height),
          });
        }
      }
    }
    console.log("=== End ===");
  };

  // Expose logFieldPositions to window for easy access in console
  // biome-ignore lint/correctness/useExhaustiveDependencies: Function reference is stable
  useEffect(() => {
    if (typeof window !== "undefined") {
      // biome-ignore lint/suspicious/noExplicitAny: window global type extension
      (window as any).logFieldPositions = logFieldPositions;
    }
  }, []);

  // ========================================
  // DEFAULT FIELD LOADING
  // ========================================

  /**
   * Loads pre-configured default signature fields for both signers
   * This demonstrates a typical workflow where Admin pre-places fields
   * before sending document to signers
   *
   * Creates fields for:
   * - John Doe: Initial (page 1), Signature (page 2), Date (page 2)
   * - Jane Smith: Initial (page 1), Signature (page 2), Date (page 2)
   */
  const handleLoadDefaults = async () => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) {
      console.warn("Instance not ready");
      return;
    }

    try {
      // Clear existing form fields first
      const existingFields = await instance.getFormFields();
      for (const field of existingFields) {
        await instance.delete(field);
      }

      // Clear existing annotations from all pages
      const totalPages = await instance.totalPageCount;
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const existingAnnotations = await instance.getAnnotations(pageIndex);
        const widgetAnnotations = existingAnnotations.filter(
          (ann) => ann instanceof NV.Annotations.WidgetAnnotation,
        );
        for (const annotation of widgetAnnotations) {
          await instance.delete(annotation.id);
        }
      }

      // Default field positions for John Doe (Signer 1) - Blue
      const johnFields = [
        { type: "initial", page: 0, x: 164, y: 650, width: 64, height: 40 },
        { type: "signature", page: 1, x: 96, y: 553, width: 150, height: 50 },
        { type: "date", page: 1, x: 96, y: 636, width: 120, height: 30 },
      ];

      // Default field positions for Jane Smith (Signer 2) - Purple
      const janeFields = [
        { type: "initial", page: 0, x: 368, y: 650, width: 64, height: 40 },
        { type: "signature", page: 1, x: 318, y: 553, width: 150, height: 50 },
        { type: "date", page: 1, x: 318, y: 637, width: 120, height: 30 },
      ];

      // Create fields for John Doe
      for (const fieldConfig of johnFields) {
        const signer = signers[0]; // John Doe
        const instantId = `${fieldConfig.type}-${signer.id}-${Date.now()}-${Math.random()}`;

        const boundingBox = new NV.Geometry.Rect({
          left: fieldConfig.x,
          top: fieldConfig.y,
          width: fieldConfig.width,
          height: fieldConfig.height,
        });

        // Determine if field should be read-only based on current user
        const isReadOnly =
          currentUser.role !== "Editor" && currentUser.id !== signer.id;

        if (fieldConfig.type === "date") {
          const annotation = new NV.Annotations.WidgetAnnotation({
            id: instantId,
            pageIndex: fieldConfig.page,
            boundingBox,
            formFieldName: instantId,
            customData: {
              signerID: signer.id,
              signerEmail: signer.email,
              signerName: signer.name,
              signerColor: signer.color,
              type: fieldConfig.type,
            },
            borderColor: NV.Color.fromHex(signer.color),
            borderWidth: 2,
            additionalActions: {
              onFormat: new NV.Actions.JavaScriptAction({
                script: 'AFDate_FormatEx("mm/dd/yyyy")',
              }),
            },
          });

          const formField = new NV.FormFields.TextFormField({
            name: instantId,
            // @ts-expect-error - Immutable.List constructor type not available
            annotationIds: new NV.Immutable.List([instantId]),
            readOnly: isReadOnly,
          });

          await instance.create([annotation, formField]);
        } else {
          const annotation = new NV.Annotations.WidgetAnnotation({
            id: instantId,
            pageIndex: fieldConfig.page,
            boundingBox,
            formFieldName: instantId,
            customData: {
              signerID: signer.id,
              signerEmail: signer.email,
              signerName: signer.name,
              signerColor: signer.color,
              type: fieldConfig.type,
            },
          });

          const formField = new NV.FormFields.SignatureFormField({
            name: instantId,
            // @ts-expect-error - Immutable.List constructor type not available
            annotationIds: new NV.Immutable.List([instantId]),
            readOnly: isReadOnly,
          });

          await instance.create([annotation, formField]);
        }
      }

      // Create fields for Jane Smith
      for (const fieldConfig of janeFields) {
        const signer = signers[1]; // Jane Smith
        const instantId = `${fieldConfig.type}-${signer.id}-${Date.now()}-${Math.random()}`;

        const boundingBox = new NV.Geometry.Rect({
          left: fieldConfig.x,
          top: fieldConfig.y,
          width: fieldConfig.width,
          height: fieldConfig.height,
        });

        // Determine if field should be read-only based on current user
        const isReadOnly =
          currentUser.role !== "Editor" && currentUser.id !== signer.id;

        if (fieldConfig.type === "date") {
          const annotation = new NV.Annotations.WidgetAnnotation({
            id: instantId,
            pageIndex: fieldConfig.page,
            boundingBox,
            formFieldName: instantId,
            customData: {
              signerID: signer.id,
              signerEmail: signer.email,
              signerName: signer.name,
              signerColor: signer.color,
              type: fieldConfig.type,
            },
            borderColor: NV.Color.fromHex(signer.color),
            borderWidth: 2,
            additionalActions: {
              onFormat: new NV.Actions.JavaScriptAction({
                script: 'AFDate_FormatEx("mm/dd/yyyy")',
              }),
            },
          });

          const formField = new NV.FormFields.TextFormField({
            name: instantId,
            // @ts-expect-error - Immutable.List constructor type not available
            annotationIds: new NV.Immutable.List([instantId]),
            readOnly: isReadOnly,
          });

          await instance.create([annotation, formField]);
        } else {
          const annotation = new NV.Annotations.WidgetAnnotation({
            id: instantId,
            pageIndex: fieldConfig.page,
            boundingBox,
            formFieldName: instantId,
            customData: {
              signerID: signer.id,
              signerEmail: signer.email,
              signerName: signer.name,
              signerColor: signer.color,
              type: fieldConfig.type,
            },
          });

          const formField = new NV.FormFields.SignatureFormField({
            name: instantId,
            // @ts-expect-error - Immutable.List constructor type not available
            annotationIds: new NV.Immutable.List([instantId]),
            readOnly: isReadOnly,
          });

          await instance.create([annotation, formField]);
        }
      }
    } catch (error) {
      console.error("Error loading default fields:", error);
    }
  };

  // ========================================
  // DELETE ALL FORM FIELDS
  // ========================================

  /**
   * Deletes all form fields from the document
   * This removes all signature, initial, and date fields along with their widget annotations
   * Only available to Admin users in Editor role
   */
  const handleDeleteAllFormFields = async () => {
    const instance = instanceRef.current;
    if (!instance) {
      setSignStatus("Error: Viewer not loaded yet");
      setTimeout(() => setSignStatus(""), 3000);
      return;
    }

    try {
      setSignStatus("Deleting all form fields...");

      // Get all form fields in the document
      const formFields = await instance.getFormFields();

      // Delete each form field (this also deletes its widget annotations)
      for (const formField of formFields) {
        await instance.delete(formField);
      }

      setSignStatus(
        `Successfully deleted ${formFields.size} form field${formFields.size === 1 ? "" : "s"}`,
      );
      setTimeout(() => setSignStatus(""), 3000);
    } catch (error) {
      console.error("Error deleting form fields:", error);
      setSignStatus("Error: Failed to delete form fields");
      setTimeout(() => setSignStatus(""), 3000);
    }
  };

  // ========================================
  // DIGITAL SIGNATURE - DWS API Integration
  // ========================================

  /**
   * Applies digital signature to the document using Nutrient DWS API
   *
   * COMPLETE WORKFLOW:
   * 1. FINALIZE SIGNATURES:
   *    - Find all electronic signature ImageAnnotations
   *    - Create "By Nutrient {ID}" TextAnnotations above each signature
   *    - Flatten all annotations to make them permanent
   *
   * 2. REQUEST TOKEN:
   *    - Call DWS API to get JWT authentication token
   *    - Token authorizes the signing operation
   *
   * 3. SIGN DOCUMENT:
   *    - Use instance.signDocument() with CAdES signature type
   *    - Uses PAdES-B-LT level for long-term validation
   *    - Digital signature is cryptographic and tamper-evident
   *
   * 4. UPDATE UI:
   *    - Show signature validation status banner
   *    - Hide any remaining unsigned field overlays
   *    - Display success message
   */
  const handleApplyDigitalSignature = async () => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) {
      setSignStatus("Error: Viewer not loaded yet");
      setTimeout(() => setSignStatus(""), 3000);
      return;
    }

    if (isSigning) {
      return;
    }

    try {
      setIsSigning(true);
      setSignStatus("Finalizing signatures...");

      /**
       * STEP 1: PREPARE SIGNATURES FOR FLATTENING
       * Find all electronic signature ImageAnnotations and add branding labels
       */
      const totalPages = await instance.totalPageCount;
      const pagesWithSignatures: number[] = [];

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const annotations = await instance.getAnnotations(pageIndex);

        // Find all signature ImageAnnotations created by electronic signing
        const signatureAnnotations = annotations.filter(
          (ann) =>
            ann instanceof NV.Annotations.ImageAnnotation && ann.isSignature,
        );

        if (signatureAnnotations.size > 0) {
          pagesWithSignatures.push(pageIndex);

          // Create "By Nutrient {ID}" text annotations above each signature
          // These will be flattened along with the signatures
          for (const sigAnnotation of signatureAnnotations) {
            const sigBox = sigAnnotation.boundingBox;
            const shortId =
              sigAnnotation.id.substring(0, 16) +
              (sigAnnotation.id.length > 16 ? "..." : "");

            // Create a TextAnnotation positioned above the signature
            const labelAnnotation = new NV.Annotations.TextAnnotation({
              pageIndex,
              boundingBox: new NV.Geometry.Rect({
                left: sigBox.left,
                top: sigBox.top - 15,
                width: 150,
                height: 12,
              }),
              text: {
                format: "plain",
                value: `By Nutrient  ${shortId}`,
              },
              fontSize: 7,
              font: "Helvetica",
              color: NV.Color.fromHex("#666666"),
              backgroundColor: NV.Color.fromHex("#FFFFFF"),
              borderWidth: 0,
            });

            await instance.create(labelAnnotation);
          }
        }
      }

      /**
       * STEP 2: FLATTEN ANNOTATIONS
       * Makes all signature images and labels permanent parts of the PDF
       * After flattening, they cannot be removed or modified
       *
       * Uses instance.applyOperations with "flattenAnnotations" operation
       */
      if (pagesWithSignatures.length > 0) {
        await instance.applyOperations([
          {
            type: "flattenAnnotations",
            pageIndexes: pagesWithSignatures,
          },
        ]);
      }

      /**
       * STEP 3: GET AUTHENTICATION TOKEN
       * Request JWT token from DWS API to authorize digital signing
       */
      setSignStatus("Requesting authentication token...");

      const tokenResponse = await fetch(
        "/api/sign-document-web-sdk-dws/api/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: window.location.origin,
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new Error("Failed to get authentication token");
      }

      const { token } = await tokenResponse.json();

      /**
       * STEP 4: APPLY DIGITAL SIGNATURE
       * Signs the document using cryptographic digital signature
       *
       * Signature Type: CAdES (CMS Advanced Electronic Signatures)
       * PAdES Level: B-LT (Long Term validation)
       * - Includes timestamp for long-term validity
       * - Embeds validation information in the PDF
       */
      setSignStatus("Signing document...");

      await instance.signDocument(
        {
          signingData: {
            signatureType: NV.SignatureType.CAdES,
            padesLevel: NV.PAdESLevel.b_lt,
          },
        },
        {
          jwt: token,
        },
      );

      /**
       * STEP 5: UPDATE UI
       * Show signature validation banner and clean up overlays
       */
      const currentViewState = instance.viewState;
      await instance.setViewState(
        currentViewState.set(
          "showSignatureValidationStatus",
          NV.ShowSignatureValidationStatusMode.IF_SIGNED,
        ),
      );

      // Hide overlays for signed fields - multiple checks ensure they're hidden
      setTimeout(() => hideSignedFieldOverlays(), 300);
      setTimeout(() => hideSignedFieldOverlays(), 600);
      setTimeout(() => hideSignedFieldOverlays(), 1000);
      setTimeout(() => hideSignedFieldOverlays(), 1500);

      setSignStatus("Document signed successfully!");
      setTimeout(() => setSignStatus(""), 3000);
    } catch (error) {
      console.error("Error signing document:", error);
      setSignStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      setTimeout(() => setSignStatus(""), 5000);
    } finally {
      setIsSigning(false);
    }
  };

  // ========================================
  // RENDER UI
  // ========================================

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
                const selectedSigner = signers.find(
                  (s) => s.id === selectedSignerId,
                );
                return (
                  <button
                    key={field.type}
                    type="button"
                    className="draggable-field"
                    draggable
                    onDragStart={(e: React.DragEvent<HTMLButtonElement>) =>
                      handleDragStart(e, field.type)
                    }
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
            <div className="or-divider">OR</div>
            <button
              type="button"
              className="load-defaults-btn"
              onClick={handleLoadDefaults}
            >
              Load Default Fields
            </button>
          </div>
        )}

        {/* Admin Actions - Only for Admin */}
        {currentUser.role === "Editor" && (
          <>
            {/* Delete All Form Fields Button */}
            <div className="sidebar-section">
              <div className="sidebar-label">Field Management</div>
              <button
                type="button"
                className="delete-all-fields-btn"
                onClick={handleDeleteAllFormFields}
                disabled={isSigning}
              >
                Delete All Form Fields
              </button>
            </div>

            {/* Digital Signature Button */}
            <div className="sidebar-section digital-signature-section">
              <div className="sidebar-label">DWS API</div>
              <button
                type="button"
                className="digital-signature-btn"
                onClick={handleApplyDigitalSignature}
                disabled={isSigning}
              >
                {isSigning ? "Signing..." : "Apply Digital Signature"}
              </button>
            </div>
          </>
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

      {/* Status overlay */}
      {signStatus && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              signStatus.includes("Error")
                ? "bg-red-500 text-white"
                : signStatus.includes("success")
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
            }`}
          >
            {signStatus}
          </div>
        </div>
      )}
    </div>
  );
}
