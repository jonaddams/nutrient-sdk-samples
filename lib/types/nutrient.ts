import type { Instance } from "@nutrient-sdk/viewer";

// ============================================================================
// Core Nutrient SDK Types
// ============================================================================

export type NutrientInstance = Instance;

// ============================================================================
// Content Editing API Types
// ============================================================================

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Anchor {
  x: number;
  y: number;
}

// Base TextBlock from SDK (without pageIndex)
export interface SDKTextBlock {
  id: string;
  text: string;
  boundingBox: BoundingBox;
  anchor: Anchor;
  maxWidth: number;
}

// Extended TextBlock with pageIndex (used in our app)
export interface TextBlock extends SDKTextBlock {
  pageIndex: number;
}

export interface UpdatedTextBlock {
  id: string;
  text?: string;
  anchor?: { x?: number; y?: number };
  maxWidth?: number;
}

export interface ContentEditingSession {
  getTextBlocks(pageIndex: number): Promise<SDKTextBlock[]>;
  updateTextBlocks(updates: UpdatedTextBlock[]): Promise<void>;
  commit(): Promise<void>;
  discard(): Promise<void>;
}

// Viewer Interaction Modes
export enum InteractionMode {
  PAN = "PAN",
  TEXT_HIGHLIGHTER = "TEXT_HIGHLIGHTER",
  INK = "INK",
  INK_SIGNATURE = "INK_SIGNATURE",
  SIGNATURE = "SIGNATURE",
  STAMP_PICKER = "STAMP_PICKER",
  STAMP_CUSTOM = "STAMP_CUSTOM",
  SHAPE_LINE = "SHAPE_LINE",
  SHAPE_RECTANGLE = "SHAPE_RECTANGLE",
  SHAPE_ELLIPSE = "SHAPE_ELLIPSE",
  SHAPE_POLYGON = "SHAPE_POLYGON",
  SHAPE_POLYLINE = "SHAPE_POLYLINE",
  INK_ERASER = "INK_ERASER",
  NOTE = "NOTE",
  COMMENT_MARKER = "COMMENT_MARKER",
  TEXT = "TEXT",
  CALLOUT = "CALLOUT",
  LINE = "LINE",
  ARROW = "ARROW",
  RECTANGLE = "RECTANGLE",
  ELLIPSE = "ELLIPSE",
  POLYGON = "POLYGON",
  POLYLINE = "POLYLINE",
  LINK = "LINK",
  DISTANCE = "DISTANCE",
  PERIMETER = "PERIMETER",
  RECTANGLE_AREA = "RECTANGLE_AREA",
  ELLIPSE_AREA = "ELLIPSE_AREA",
  POLYGON_AREA = "POLYGON_AREA",
  CONTENT_EDITOR = "CONTENT_EDITOR",
  MULTI_ANNOTATIONS_SELECTION = "MULTI_ANNOTATIONS_SELECTION",
  DOCUMENT_CROP = "DOCUMENT_CROP",
  REDACT_TEXT_HIGHLIGHTER = "REDACT_TEXT_HIGHLIGHTER",
  REDACT_RECTANGLE = "REDACT_RECTANGLE",
  FORM_CREATOR = "FORM_CREATOR",
  BUTTON = "BUTTON",
  TEXT_FIELD = "TEXT_FIELD",
  RADIO_BUTTON = "RADIO_BUTTON",
  CHECKBOX = "CHECKBOX",
  COMBO_BOX = "COMBO_BOX",
  LIST_BOX = "LIST_BOX",
  SIGNATURE_FIELD = "SIGNATURE_FIELD",
}

export interface ViewState {
  interactionMode?: InteractionMode | string;
  currentPageIndex?: number;
  zoom?: number;
  [key: string]: unknown;
}

export type ViewStateUpdater = (prevState: ViewState) => ViewState;

// ============================================================================
// Annotation Types
// ============================================================================

export interface Annotation {
  id: string;
  pageIndex: number;
  boundingBox?: BoundingBox;
  [key: string]: unknown;
}

export type AnnotationList = Annotation[];

// ============================================================================
// Text Comparison Types
// ============================================================================

export interface ComparisonResult {
  operations: ComparisonOperation[];
}

export interface ComparisonOperation {
  type: "insert" | "delete" | "equal";
  text: string;
}

// ============================================================================
// SDK Configuration Types
// ============================================================================

export interface NutrientLoadConfig {
  container: HTMLElement | string;
  document: string;
  licenseKey?: string;
  useCDN?: boolean;
  theme?: "LIGHT" | "DARK" | "AUTO";
  toolbarItems?: unknown[];
  baseUrl?: string;
  instant?: boolean;
  instantJSON?: unknown;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
