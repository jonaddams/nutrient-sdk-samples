// ============================================================================
// Nutrient SDK Configuration Constants
// ============================================================================

export const NUTRIENT_SDK = {
  VERSION: process.env.NEXT_PUBLIC_WEB_SDK_VERSION || "1.10.0",
  CDN_BASE: "https://cdn.cloud.pspdfkit.com",
  LICENSE_KEY: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || "",
} as const;

export const SDK_CDN_URL = `${NUTRIENT_SDK.CDN_BASE}/pspdfkit-web@${NUTRIENT_SDK.VERSION}/nutrient-viewer.js`;

// ============================================================================
// Container Configuration
// ============================================================================

export const VIEWER_CONTAINER = {
  HEIGHT: "100vh",
  WIDTH: "100%",
  POSITION: "relative" as const,
} as const;

// ============================================================================
// Polling Configuration
// ============================================================================

export const SDK_LOADING = {
  POLL_INTERVAL_MS: 100,
  MAX_RETRIES: 50, // 5 seconds total
} as const;

// ============================================================================
// Overlay Configuration
// ============================================================================

export const OVERLAY_STYLES = {
  BORDER_WIDTH: "2px",
  BORDER_COLOR_DEFAULT: "blue",
  BORDER_COLOR_SELECTED: "red",
  BACKGROUND_COLOR: "transparent",
  CURSOR: "pointer",
  BOX_SIZING: "border-box" as const,
  POINTER_EVENTS: "auto" as const,
  POSITION: "relative" as const,
} as const;

// ============================================================================
// Annotation Configuration
// ============================================================================

export const ANNOTATION_STYLES = {
  OPACITY: 0.5,
  HIGHLIGHT_OPACITY: 0.3,
} as const;

export const HIGHLIGHT_COLORS = {
  DELETE: "#FFC9CB",
  INSERT: "#C0D8EF",
  DELETE_RGB: { r: 255, g: 201, b: 203 },
  INSERT_RGB: { r: 192, g: 216, b: 239 },
} as const;

// ============================================================================
// Document Comparison Configuration
// ============================================================================

export const COMPARISON_CONFIG = {
  ORIGINAL_DOC: "/text-comparison/text-comparison-a.pdf",
  CHANGED_DOC: "/text-comparison/text-comparison-b.pdf",
  CONTEXT_WORDS: 100,
} as const;

// ============================================================================
// Event Names
// ============================================================================

export const VIEWER_EVENTS = {
  EDITING_STATE_CHANGE: "editingStateChange",
  SELECTED_BLOCKS_CHANGE: "selectedBlocksChange",
  CONTENT_EDITING_STATE_CHANGE: "contentEditingStateChange",
  VIEW_STATE_CHANGE: "viewState.change",
  PAGE_CHANGE: "viewState.currentPageIndex",
  ANNOTATIONS_PRESS: "annotations.press",
} as const;

// ============================================================================
// Timing Configuration
// ============================================================================

export const TIMING = {
  PDF_PREFETCH_DELAY_MS: 2000,
  EVENT_DEFER_MS: 0,
  SCROLL_SYNC_DELAY_MS: 50,
} as const;

// ============================================================================
// CSS Selectors
// ============================================================================

export const SELECTORS = {
  SCROLL_CONTAINER: ".PSPDFKit-Scroll",
} as const;

// ============================================================================
// Theme Detection
// ============================================================================

export const detectDarkMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

export const getTheme = () => {
  return detectDarkMode() ? "DARK" : "LIGHT";
};
