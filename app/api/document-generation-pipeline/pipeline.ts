import { type FieldType, FORM_FIELDS } from "./contract-template";

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
  type: FieldType;
  bbox: Bbox;
}

export type InstantBbox = [number, number, number, number];

export interface InstantJson {
  format: string;
  annotations: Record<string, unknown>[];
  formFields: Record<string, unknown>[];
  formFieldValues: Record<string, unknown>[];
}

/**
 * Scan extracted structuredText words for signer anchor tokens and record the
 * bounding box of each match. DWS exposes no search endpoint; word-level
 * json-content extraction is the search primitive.
 */
export function locateAnchors(content: JsonContent): LocatedAnchor[] {
  const byToken = new Map(FORM_FIELDS.map((f) => [f.token, f]));
  const anchors: LocatedAnchor[] = [];
  content.pages?.forEach((page, pageIndex) => {
    page.structuredText?.words?.forEach((word) => {
      const spec = byToken.get(word.value.toUpperCase());
      if (spec) {
        anchors.push({
          pageIndex,
          fieldName: spec.fieldName,
          label: spec.label,
          type: spec.type,
          bbox: word.bbox,
        });
      }
    });
  });
  return anchors;
}

/**
 * Expand a text bbox (top-left origin) into a usable field area. Date and
 * signature fields share the same dimensions so they line up visually.
 */
export function fieldBbox(bbox: Bbox): InstantBbox {
  return [
    bbox.left,
    bbox.top,
    Math.max(bbox.width, 220),
    Math.max(bbox.height * 4, 40),
  ];
}

/**
 * Build Instant JSON with one widget annotation + form field per anchor.
 * `textValue` pre-fills every text field (e.g. "date signed" with today's date).
 */
export function buildInstantJson(
  anchors: LocatedAnchor[],
  options: { textValue?: string } = {},
): InstantJson {
  const formFieldType = (type: FieldType) =>
    type === "text"
      ? "pspdfkit/form-field/text"
      : "pspdfkit/form-field/signature";
  return {
    format: "https://pspdfkit.com/instant-json/v1",
    annotations: anchors.map((anchor, i) => {
      const widget: Record<string, unknown> = {
        v: 2,
        type: "pspdfkit/widget",
        id: `widget-${i}`,
        pageIndex: anchor.pageIndex,
        bbox: fieldBbox(anchor.bbox),
        formFieldName: anchor.fieldName,
        opacity: 1,
      };
      // A fixed font size keeps the pre-filled date readable instead of
      // auto-sizing to fill the whole field height.
      if (anchor.type === "text") widget.fontSize = 14;
      return widget;
    }),
    formFields: anchors.map((anchor, i) => ({
      v: 1,
      type: formFieldType(anchor.type),
      id: `field-${i}`,
      name: anchor.fieldName,
      label: anchor.label,
      annotationIds: [`widget-${i}`],
    })),
    // Form-field values live in their own collection (a `value` on the field
    // itself is ignored). Pre-fill each text field with the supplied value.
    formFieldValues: anchors
      .filter((anchor) => anchor.type === "text" && options.textValue)
      .map((anchor) => ({
        v: 1,
        type: "pspdfkit/form-field-value",
        name: anchor.fieldName,
        value: options.textValue,
      })),
  };
}
