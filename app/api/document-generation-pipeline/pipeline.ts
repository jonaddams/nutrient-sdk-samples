import { SIGNERS } from "./contract-template";

export interface Bbox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StructuredWord {
  value: string;
  bbox: Bbox;
}

export interface JsonContentPage {
  plainText?: string;
  structuredText?: { words?: StructuredWord[] };
}

export interface JsonContent {
  pages?: JsonContentPage[];
}

export interface LocatedAnchor {
  pageIndex: number;
  fieldName: string;
  label: string;
  bbox: Bbox;
}

export type InstantBbox = [number, number, number, number];

export interface InstantJson {
  format: string;
  annotations: Record<string, unknown>[];
  formFields: Record<string, unknown>[];
}

/**
 * Scan extracted structuredText words for signer anchor tokens and record the
 * bounding box of each match. DWS exposes no search endpoint; word-level
 * json-content extraction is the search primitive.
 */
export function locateAnchors(content: JsonContent): LocatedAnchor[] {
  const byToken = new Map(SIGNERS.map((s) => [s.token, s]));
  const anchors: LocatedAnchor[] = [];
  content.pages?.forEach((page, pageIndex) => {
    page.structuredText?.words?.forEach((word) => {
      const signer = byToken.get(word.value.toUpperCase());
      if (signer) {
        anchors.push({
          pageIndex,
          fieldName: signer.fieldName,
          label: signer.label,
          bbox: word.bbox,
        });
      }
    });
  });
  return anchors;
}

/** Expand a text bbox (top-left origin) into a usable signature signing area. */
export function signatureFieldBbox(bbox: Bbox): InstantBbox {
  return [
    bbox.left,
    bbox.top,
    Math.max(bbox.width, 220),
    Math.max(bbox.height * 4, 40),
  ];
}

/** Build Instant JSON with one widget annotation + signature form field per anchor. */
export function buildInstantJson(anchors: LocatedAnchor[]): InstantJson {
  return {
    format: "https://pspdfkit.com/instant-json/v1",
    annotations: anchors.map((anchor, i) => ({
      v: 2,
      type: "pspdfkit/widget",
      id: `widget-${i}`,
      pageIndex: anchor.pageIndex,
      bbox: signatureFieldBbox(anchor.bbox),
      formFieldName: anchor.fieldName,
      opacity: 1,
    })),
    formFields: anchors.map((anchor, i) => ({
      v: 1,
      type: "pspdfkit/form-field/signature",
      id: `field-${i}`,
      name: anchor.fieldName,
      label: anchor.label,
      annotationIds: [`widget-${i}`],
    })),
  };
}
