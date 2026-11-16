// Document Authoring SDK Types
export interface DocAuthSystem {
  createEditor: (
    element: HTMLElement,
    options: { document: DocAuthDocument },
  ) => Promise<DocAuthEditor>;
  createViewer: (
    element: HTMLElement,
    options: { document: DocAuthDocument },
  ) => Promise<DocAuthViewer>;
  import: (
    blob: Blob | ArrayBuffer | Uint8Array,
    options?: { format?: "docx" | "rtf" | "odt" | "markdown" },
  ) => Promise<DocAuthDocument>;
  loadDocument: (docJson: unknown) => Promise<DocAuthDocument>;
  createDocumentFromPlaintext: (text: string) => Promise<DocAuthDocument>;
}

/** Portable document location (DocAuth >= 1.22); opaque to callers. */
export type DocAuthLocation = unknown;

type LocationResult<T = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      reason: "document-mismatch" | "invalid-location" | "unsupported-location";
    };

export interface DocAuthEditor {
  destroy: () => void;
  currentDocument: () => DocAuthDocument;
  setCurrentDocument: (doc: DocAuthDocument) => void;
  insertContentAtCursor: (options: { content: string }) => void;
  find: {
    search: (query: string) => Promise<{ location: DocAuthLocation }[]>;
  };
  navigateTo: (location: DocAuthLocation) => Promise<LocationResult>;
  addVisualHighlight: (
    location: DocAuthLocation,
    options?: { color?: string; opacity?: number },
  ) => Promise<LocationResult<{ highlight: { remove: () => void } }>>;
}

export interface DocAuthViewer {
  destroy: () => void;
  exportPDF: () => Promise<ArrayBuffer>;
}

export interface DocAuthDocument {
  export: (config: {
    format: "pdf" | "docx" | "markdown" | "rtf" | "odt";
  }) => Promise<ArrayBuffer>;
  transaction: <T = void>(
    callback: (draft: ProgrammaticDocument) => Promise<T> | T,
  ) => Promise<T>;
  saveDocumentJSONString: () => Promise<string>;
}

// PSPDFKit Types
export interface PSPDFKitViewer {
  exportPDF: () => Promise<ArrayBuffer>;
  unload: () => Promise<void>;
}

export interface PSPDFKit {
  populateDocumentTemplate: (
    options: { document: ArrayBuffer; useCDN?: boolean; licenseKey?: string },
    data: TemplateData,
  ) => Promise<ArrayBuffer>;
  unload: (container: HTMLElement | PSPDFKitViewer) => Promise<void>;
}

// CodeMirror interface for type safety
export interface CodeMirrorInstance {
  getValue(): string;
  setValue(value: string): void;
  toTextArea(): void;
  on(event: string, handler: (instance: CodeMirrorInstance) => void): void;
  refresh(): void;
  setSize(width: string | number, height: string | number): void;
}

// Template Types
export type TemplateType = "checklist" | "invoice" | "menu" | "custom";

export interface TemplateConfig {
  delimiter: {
    start: string;
    end: string;
  };
}

export interface TemplateData {
  config: TemplateConfig;
  model: Record<string, unknown>;
}

// Programmatic API types (used inside transaction() callbacks)
export interface ProgrammaticDocument {
  body: () => ProgrammaticBody;
}

// Since 1.15 the body is one flat block-level container; sections are
// marked by section-break paragraphs, and Section.content() no longer exists.
export interface ProgrammaticBody {
  content: () => ProgrammaticBlockLevelContainer;
}

export interface ProgrammaticBlockLevelContainer {
  blocklevels: () => ProgrammaticBlockLevel[];
  addParagraph: (index: number) => ProgrammaticParagraph;
  addTable: (index: number) => ProgrammaticTable;
  removeElement: (index: number) => void;
}

export interface ProgrammaticTextView {
  getPlainText: () => string;
  setText: (text: string) => ProgrammaticRange;
  setFormatting: (
    style: Partial<ProgrammaticFormatting>,
    range?: ProgrammaticRange,
  ) => void;
}

export interface ProgrammaticRange {
  start: number;
  end: number;
}

export interface ProgrammaticFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeout: boolean;
  color: string;
  highlight: string;
  font: string;
  fontSize: number;
}

export type ProgrammaticBlockLevel = ProgrammaticParagraph | ProgrammaticTable;

export interface ProgrammaticParagraph {
  type: "paragraph";
  asTextView: () => ProgrammaticTextView;
}

export interface ProgrammaticTable {
  type: "table";
  rows: () => ProgrammaticTableRow[];
  addRow: () => ProgrammaticTableRow;
  removeRow: (index: number) => void;
}

export interface ProgrammaticTableRow {
  cells: () => ProgrammaticTableCell[];
  addCell: () => ProgrammaticTableCell;
  removeCell: (index: number) => void;
}

export interface ProgrammaticTableCell {
  blocklevels: () => ProgrammaticBlockLevel[];
  addParagraph: (index: number) => ProgrammaticParagraph;
  removeElement: (index: number) => void;
}

// Global declarations for external libraries
declare global {
  interface Window {
    DocAuth: {
      createDocAuthSystem: () => Promise<DocAuthSystem>;
    };
    PSPDFKit: PSPDFKit;
    CodeMirror: {
      fromTextArea: (
        textarea: HTMLTextAreaElement,
        options: Record<string, unknown>,
      ) => CodeMirrorInstance;
    };
  }
}
