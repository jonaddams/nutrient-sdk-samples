"use client";

/**
 * Document Loading Methods Demo - Nutrient Web SDK
 *
 * This comprehensive demo showcases all supported methods for loading PDF documents
 * into the Nutrient Web SDK viewer. Understanding these loading methods is essential
 * for integrating Nutrient into various application architectures.
 *
 * ## Supported Loading Methods:
 *
 * ### 1. URL (String Path)
 * - **Use Case**: Loading documents from a web server or CDN
 * - **Benefits**: Supports progressive loading and streaming for faster initial display
 * - **Best For**: Remote documents, large files, bandwidth optimization
 * - **Example**: `document: "https://example.com/document.pdf"`
 *
 * ### 2. ArrayBuffer
 * - **Use Case**: Loading documents from binary data in memory
 * - **Benefits**: Complete control over data, works with API responses
 * - **Best For**: Documents from REST APIs, encrypted content, custom processing
 * - **Example**: `document: arrayBuffer`
 *
 * ### 3. Blob
 * - **Use Case**: Loading documents from File objects or Blob data
 * - **Benefits**: Native browser file handling, efficient memory usage
 * - **Best For**: File uploads, drag-and-drop, IndexedDB storage
 * - **Example**: `document: URL.createObjectURL(blob)`
 * - **Note**: Blobs must be converted to Object URLs before loading
 *
 * ### 4. Base64
 * - **Use Case**: Loading documents from base64-encoded strings
 * - **Benefits**: Easy embedding in JSON, simple data transfer
 * - **Best For**: Embedded documents, email attachments, legacy APIs
 * - **Example**: `document: base64ToArrayBuffer(base64String)`
 * - **Note**: Base64 strings must be decoded to ArrayBuffer before loading
 *
 * ## Features:
 * - Switch between loading methods in real-time
 * - Upload custom PDF files to test with any method
 * - View implementation code for each method
 * - Automatic memory cleanup (Object URL revocation)
 * - Comprehensive error handling
 *
 * @see https://www.nutrient.io/guides/web/open-a-document/from-remote-url/
 * @see https://www.nutrient.io/guides/web/open-a-document/from-arraybuffer/
 * @see https://www.nutrient.io/guides/web/open-a-document/from-blob/
 * @see https://www.nutrient.io/guides/web/open-a-document/from-base64-data/
 */

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";

/**
 * Available document loading methods supported by Nutrient Web SDK
 */
type LoadingMethod = "url" | "arraybuffer" | "blob" | "base64";

/**
 * Type definition for the Nutrient Viewer load configuration
 */
interface ViewerLoadConfig {
  container: HTMLElement;
  document: string | ArrayBuffer;
  allowLinearizedLoading?: boolean;
  useCDN?: boolean;
  licenseKey?: string;
}

/**
 * Type definition for the Nutrient Viewer global object
 * This is attached to the window object when the Nutrient SDK is loaded
 */
interface NutrientViewerStatic {
  load: (config: ViewerLoadConfig) => Promise<Instance>;
  unload: (container: HTMLElement) => Promise<void>;
}

/**
 * Default document to load when the demo starts
 */
const DEFAULT_DOCUMENT = "/documents/usenix-example-paper.pdf";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a base64-encoded string to an ArrayBuffer.
 *
 * This function is necessary because Nutrient Web SDK accepts either URL strings
 * or ArrayBuffer objects, but not base64 strings directly. The conversion process:
 * 1. Decode base64 to binary string using atob()
 * 2. Convert binary string to Uint8Array
 * 3. Extract the underlying ArrayBuffer
 *
 * @param base64 - Base64-encoded string (without data URI prefix)
 * @returns ArrayBuffer containing the decoded binary data
 *
 * @example
 * const base64 = "JVBERi0xLjQKJeLjz9M..."; // PDF data
 * const arrayBuffer = base64ToArrayBuffer(base64);
 * await NutrientViewer.load({ document: arrayBuffer });
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Decode base64 to binary string
  const binaryString = atob(base64);

  // Create typed array from binary string
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Return the underlying ArrayBuffer
  return bytes.buffer;
}

/**
 * Fetches a document from a URL and returns it as an ArrayBuffer.
 *
 * @param url - URL of the document to fetch
 * @returns Promise resolving to the document as ArrayBuffer
 * @throws Error if the fetch fails or returns non-OK status
 */
async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Fetches a document from a URL and returns it as a Blob.
 *
 * @param url - URL of the document to fetch
 * @returns Promise resolving to the document as Blob
 * @throws Error if the fetch fails or returns non-OK status
 */
async function fetchAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Fetches a document from a URL and returns it as a base64 string.
 *
 * This function performs the inverse operation of base64ToArrayBuffer:
 * 1. Fetch document as ArrayBuffer
 * 2. Convert to Uint8Array
 * 3. Convert to binary string
 * 4. Encode as base64 using btoa()
 *
 * @param url - URL of the document to fetch
 * @returns Promise resolving to base64-encoded string
 */
async function fetchAsBase64(url: string): Promise<string> {
  const arrayBuffer = await fetchAsArrayBuffer(url);
  const bytes = new Uint8Array(arrayBuffer);

  // Convert to binary string
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Encode as base64
  return btoa(binary);
}

/**
 * Prepares an uploaded File object for loading with the specified method.
 *
 * This function handles the conversion of uploaded files to the appropriate
 * format for each loading method:
 * - URL/Blob: Returns the File as-is (will be converted to Object URL later)
 * - ArrayBuffer/Base64: Converts to ArrayBuffer in memory
 *
 * @param file - The uploaded File object
 * @param method - The loading method to prepare for
 * @returns Object containing the prepared data
 */
async function prepareUploadedFile(
  file: File,
  method: LoadingMethod,
): Promise<{ data: File | ArrayBuffer }> {
  switch (method) {
    case "url":
    case "blob":
      // For URL and Blob methods, return the file as-is
      // It will be converted to an Object URL in loadDocument()
      return { data: file };

    case "arraybuffer":
    case "base64": {
      // For ArrayBuffer and Base64 methods, convert to ArrayBuffer
      // Base64 encoding would be wasteful since we'll decode it back to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      return { data: arrayBuffer };
    }
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function DocumentLoadingViewer() {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<LoadingMethod>("url");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showCode, setShowCode] = useState(false);

  // ============================================================================
  // Document Loading Logic
  // ============================================================================

  /**
   * Loads a document into the Nutrient viewer using the specified loading method.
   *
   * This is the core function that demonstrates all four loading methods.
   * It handles three types of input sources:
   * 1. URL strings (file paths or remote URLs)
   * 2. File/Blob objects (from file uploads)
   * 3. ArrayBuffer objects (pre-converted binary data)
   *
   * The function automatically converts the source to the appropriate format
   * based on the selected loading method and source type.
   *
   * @param method - The loading method to use
   * @param source - The document source (URL, File, Blob, or ArrayBuffer)
   */
  const loadDocument = useCallback(
    async (
      method: LoadingMethod,
      source: string | File | Blob | ArrayBuffer = DEFAULT_DOCUMENT,
    ) => {
      const container = containerRef.current;
      const NutrientViewer = (
        window as { NutrientViewer?: NutrientViewerStatic }
      ).NutrientViewer;

      // Validate prerequisites
      if (!container || !NutrientViewer) {
        setError("Nutrient Viewer not available");
        return;
      }

      setIsLoading(true);
      setError(null);

      // Track Object URLs for cleanup
      let blobObjectUrl: string | null = null;

      try {
        // Clean up previous instance
        if (instance) {
          await NutrientViewer.unload(container);
          setInstance(null);
        }

        // Ensure container is completely empty before loading
        // This is required by Nutrient SDK
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Prepare document data based on source type and loading method
        let documentData: string | ArrayBuffer;

        // ------------------------------------------------------------------------
        // Case 1: Source is a File or Blob (from file upload)
        // ------------------------------------------------------------------------
        if (source instanceof File || source instanceof Blob) {
          if (method === "url" || method === "blob") {
            // For URL and Blob methods: Create an Object URL
            // Object URLs (blob:...) allow the browser to stream the file efficiently
            blobObjectUrl = URL.createObjectURL(source);
            documentData = blobObjectUrl;
          } else {
            // For ArrayBuffer and Base64 methods: Convert to ArrayBuffer
            // This loads the entire file into memory
            documentData = await source.arrayBuffer();
          }
        }
        // ------------------------------------------------------------------------
        // Case 2: Source is already an ArrayBuffer (pre-converted data)
        // ------------------------------------------------------------------------
        else if (source instanceof ArrayBuffer) {
          documentData = source;
        }
        // ------------------------------------------------------------------------
        // Case 3: Source is a URL string (local path or remote URL)
        // ------------------------------------------------------------------------
        else if (typeof source === "string") {
          switch (method) {
            case "url":
              // Direct loading from URL
              // This is the most efficient method for remote documents
              // as it supports progressive loading and streaming
              documentData = source;
              break;

            case "arraybuffer":
              // Fetch and convert to ArrayBuffer
              // Useful when you need the entire document in memory
              documentData = await fetchAsArrayBuffer(source);
              break;

            case "blob": {
              // Fetch as Blob, then convert to Object URL
              // Demonstrates the blob workflow: fetch → blob → object URL
              const blob = await fetchAsBlob(source);
              blobObjectUrl = URL.createObjectURL(blob);
              documentData = blobObjectUrl;
              break;
            }

            case "base64": {
              // Fetch, encode as base64, then decode to ArrayBuffer
              // This demonstrates the full base64 workflow, though in practice
              // you would receive base64 data from an API rather than encoding it yourself
              const base64String = await fetchAsBase64(source);
              documentData = base64ToArrayBuffer(base64String);
              break;
            }
          }
        } else {
          throw new Error("Invalid source type");
        }

        // ------------------------------------------------------------------------
        // Load the document into Nutrient Viewer
        // ------------------------------------------------------------------------

        // Double-check container is empty immediately before load
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        const loadedInstance = await NutrientViewer.load({
          container,
          document: documentData,
          // Enable progressive loading for URL-based methods
          // This allows the viewer to display pages before the entire document is downloaded
          allowLinearizedLoading: method === "url" || method === "blob",
          useCDN: true,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        });

        // Clean up: Revoke Object URL after successful load
        // This tells the browser it can release the memory associated with the blob
        // The document is now loaded into the viewer, so we don't need the URL anymore
        if (blobObjectUrl) {
          URL.revokeObjectURL(blobObjectUrl);
        }

        setInstance(loadedInstance);
        // Expose instance to window for debugging in console
        (window as { instance?: Instance }).instance = loadedInstance;
      } catch (err) {
        console.error("Error loading document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document",
        );

        // Clean up Object URL on error
        if (blobObjectUrl) {
          URL.revokeObjectURL(blobObjectUrl);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [instance],
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handles switching between loading methods.
   * Reloads the current document (default or uploaded) using the new method.
   */
  const handleMethodChange = async (method: LoadingMethod) => {
    setLoadingMethod(method);

    if (uploadedFile) {
      // Reload uploaded file with new method
      const { data } = await prepareUploadedFile(uploadedFile, method);
      await loadDocument(method, data);
    } else {
      // Reload default document with new method
      await loadDocument(method);
    }
  };

  /**
   * Handles file upload from the file input.
   * Validates the file type and loads it with the current method.
   */
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    setUploadedFile(file);

    // Load the uploaded file with current method
    const { data } = await prepareUploadedFile(file, loadingMethod);
    await loadDocument(loadingMethod, data);
  };

  /**
   * Resets the viewer to the default document.
   */
  const resetToDefault = () => {
    setUploadedFile(null);
    loadDocument(loadingMethod, DEFAULT_DOCUMENT);
  };

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Initialize viewer with default document on mount.
   * Clean up on unmount.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadDocument is stable via useCallback, only want to run on mount
  useEffect(() => {
    const container = containerRef.current;
    const NutrientViewer = (window as { NutrientViewer?: NutrientViewerStatic })
      .NutrientViewer;

    if (container && NutrientViewer) {
      loadDocument("url");
    }

    return () => {
      const container = containerRef.current;
      const NutrientViewer = (
        window as { NutrientViewer?: NutrientViewerStatic }
      ).NutrientViewer;
      if (container && NutrientViewer) {
        NutrientViewer.unload(container);
      }
    };
  }, []); // Only run on mount

  // ============================================================================
  // Code Examples
  // ============================================================================

  /**
   * Returns the implementation code example for the current loading method.
   * These examples show production-ready code that developers can copy.
   */
  const getExampleCode = (): string => {
    switch (loadingMethod) {
      case "url":
        return `// Method 1: Load from URL (Remote or Local Path)
// This is the most common and efficient method for web applications.
// Supports progressive loading for faster initial display.

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "/documents/example.pdf",  // Local path
  // document: "https://example.com/document.pdf",  // Remote URL
  allowLinearizedLoading: true,  // Enable streaming
  licenseKey: "YOUR_LICENSE_KEY"
});`;

      case "arraybuffer":
        return `// Method 2: Load from ArrayBuffer
// Use this when you have binary data from an API, encrypted content,
// or need to process the document before loading.

// Example 1: Fetch from API
const response = await fetch("/api/documents/123");
const arrayBuffer = await response.arrayBuffer();

// Example 2: From uploaded file
const file = document.getElementById("fileInput").files[0];
const arrayBuffer = await file.arrayBuffer();

// Load into viewer
const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: arrayBuffer,
  licenseKey: "YOUR_LICENSE_KEY"
});`;

      case "blob":
        return `// Method 3: Load from Blob
// Ideal for file uploads, drag-and-drop, and native browser file handling.
// Blobs must be converted to Object URLs before loading.

// Example 1: From file input
const fileInput = document.getElementById("fileInput");
const file = fileInput.files[0];  // File extends Blob

// Example 2: From fetch
const response = await fetch("/documents/example.pdf");
const blob = await response.blob();

// Convert Blob to Object URL
const blobObjectUrl = URL.createObjectURL(blob);

// Load into viewer
const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: blobObjectUrl,
  allowLinearizedLoading: true,  // Blobs support streaming
  licenseKey: "YOUR_LICENSE_KEY"
});

// Clean up: Revoke Object URL after loading
// This frees memory and is considered best practice
URL.revokeObjectURL(blobObjectUrl);`;

      case "base64":
        return `// Method 4: Load from Base64
// Common for embedded documents, email attachments, and legacy APIs.
// Base64 strings must be decoded to ArrayBuffer before loading.

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Example: Base64 data from API
const response = await fetch("/api/documents/123");
const { base64Data } = await response.json();

// Convert to ArrayBuffer
const arrayBuffer = base64ToArrayBuffer(base64Data);

// Load into viewer
const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: arrayBuffer,
  licenseKey: "YOUR_LICENSE_KEY"
});`;
    }
  };

  /**
   * Returns a description of when to use the current loading method.
   */
  const getMethodDescription = (): string => {
    switch (loadingMethod) {
      case "url":
        return "Best for remote documents and large files. Supports progressive loading and streaming for optimal performance.";
      case "arraybuffer":
        return "Best for API responses, encrypted content, or when you need to process the document data before loading.";
      case "blob":
        return "Best for file uploads, drag-and-drop functionality, and when working with browser File APIs.";
      case "base64":
        return "Best for embedded documents in JSON responses, email attachments, or when working with legacy systems.";
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="document-loading-container">
      {/* Controls Panel */}
      <div className="controls-panel">
        {/* Loading Method Selection */}
        <div className="control-section">
          <h3>Select Loading Method</h3>
          <div className="method-buttons">
            <button
              type="button"
              onClick={() => handleMethodChange("url")}
              className={`method-button ${loadingMethod === "url" ? "active" : ""}`}
              disabled={isLoading}
              aria-label="Load from URL"
            >
              <span className="method-icon" aria-hidden="true">
                🌐
              </span>
              <span className="method-label">URL</span>
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange("arraybuffer")}
              className={`method-button ${loadingMethod === "arraybuffer" ? "active" : ""}`}
              disabled={isLoading}
              aria-label="Load from ArrayBuffer"
            >
              <span className="method-icon" aria-hidden="true">
                🔢
              </span>
              <span className="method-label">ArrayBuffer</span>
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange("blob")}
              className={`method-button ${loadingMethod === "blob" ? "active" : ""}`}
              disabled={isLoading}
              aria-label="Load from Blob"
            >
              <span className="method-icon" aria-hidden="true">
                📦
              </span>
              <span className="method-label">Blob</span>
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange("base64")}
              className={`method-button ${loadingMethod === "base64" ? "active" : ""}`}
              disabled={isLoading}
              aria-label="Load from Base64"
            >
              <span className="method-icon" aria-hidden="true">
                🔤
              </span>
              <span className="method-label">Base64</span>
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="control-section">
          <h3>Upload Custom Document</h3>
          <div className="file-controls">
            <label htmlFor="file-upload" className="file-upload-button">
              <span aria-hidden="true">📄</span>
              Upload PDF
            </label>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="file-input"
              aria-label="Upload PDF file"
            />
            {uploadedFile && (
              <div className="uploaded-file-info">
                <span className="file-name" title={uploadedFile.name}>
                  {uploadedFile.name}
                </span>
                <button
                  type="button"
                  onClick={resetToDefault}
                  className="reset-button"
                  disabled={isLoading}
                >
                  Reset to Default
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Code Example */}
        <div className="control-section">
          <div className="code-toggle-header">
            <h3>Implementation Code</h3>
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="code-toggle-button"
              aria-expanded={showCode}
            >
              {showCode ? "Hide Code" : "Show Code"}
            </button>
          </div>
          {showCode && (
            <pre className="code-example">
              <code>{getExampleCode()}</code>
            </pre>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon" aria-hidden="true">
              ⚠️
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* Method Information */}
        <div className="info-box">
          <h4>Current Method: {loadingMethod.toUpperCase()}</h4>
          <p>{getMethodDescription()}</p>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="viewer-wrapper">
        <div ref={containerRef} className="viewer-container" />
      </div>
    </div>
  );
}
