import { describe, expect, it } from "vitest";
import { buildInstantJson, fieldBbox, locateAnchors } from "../pipeline";

const content = {
  pages: [
    {
      structuredText: {
        words: [
          {
            value: "Agreement",
            bbox: { left: 10, top: 10, width: 40, height: 8 },
          },
          {
            value: "DATECLIENT",
            bbox: { left: 64, top: 560, width: 80, height: 9 },
          },
          {
            value: "SIGNATURECLIENT",
            bbox: { left: 64, top: 600, width: 100, height: 9 },
          },
          {
            value: "signatureprovider",
            bbox: { left: 300, top: 600, width: 110, height: 9 },
          },
        ],
      },
    },
  ],
};

describe("locateAnchors", () => {
  it("matches tokens (case-insensitive) and maps to field metadata incl. type", () => {
    const anchors = locateAnchors(content);
    expect(anchors).toHaveLength(3);
    expect(anchors[0]).toMatchObject({
      pageIndex: 0,
      fieldName: "dateClient",
      label: "Date signed",
      type: "text",
    });
    expect(anchors[1]).toMatchObject({
      pageIndex: 0,
      fieldName: "signatureClient",
      label: "Client Signature",
      type: "signature",
    });
    expect(anchors[2]).toMatchObject({
      pageIndex: 0,
      fieldName: "signatureProvider",
      type: "signature",
    });
    expect(anchors[1].bbox).toEqual({
      left: 64,
      top: 600,
      width: 100,
      height: 9,
    });
  });

  it("ignores non-anchor words", () => {
    const anchors = locateAnchors(content);
    expect(
      anchors.every((a) =>
        ["dateClient", "signatureClient", "signatureProvider"].includes(
          a.fieldName,
        ),
      ),
    ).toBe(true);
  });

  it("returns [] when pages or structuredText are missing", () => {
    expect(locateAnchors({})).toEqual([]);
    expect(locateAnchors({ pages: [{}] })).toEqual([]);
  });
});

describe("fieldBbox", () => {
  it("expands a box to a usable field area with floors (same size for all types)", () => {
    expect(fieldBbox({ left: 64, top: 600, width: 100, height: 9 })).toEqual([
      64, 600, 220, 40,
    ]);
    expect(fieldBbox({ left: 5, top: 5, width: 300, height: 20 })).toEqual([
      5, 5, 300, 80,
    ]);
  });
});

describe("buildInstantJson", () => {
  it("produces a linked widget + correctly-typed form field per anchor", () => {
    const anchors = locateAnchors(content);
    const ij = buildInstantJson(anchors, { textValue: "June 29, 2026" });
    expect(ij.format).toBe("https://pspdfkit.com/instant-json/v1");
    expect(ij.annotations).toHaveLength(3);
    expect(ij.formFields).toHaveLength(3);

    // Date anchor -> text form field, pre-filled, same box size as signature.
    expect(ij.annotations[0]).toMatchObject({
      type: "pspdfkit/widget",
      id: "widget-0",
      formFieldName: "dateClient",
    });
    expect(ij.annotations[0].bbox).toEqual([64, 560, 220, 40]);
    expect(ij.formFields[0]).toMatchObject({
      type: "pspdfkit/form-field/text",
      id: "field-0",
      name: "dateClient",
      annotationIds: ["widget-0"],
    });
    // The value lives in formFieldValues, not on the field itself.
    expect(ij.formFieldValues).toEqual([
      {
        v: 1,
        type: "pspdfkit/form-field-value",
        name: "dateClient",
        value: "June 29, 2026",
      },
    ]);

    // Signature anchor -> signature form field, same box size.
    expect(ij.annotations[1].bbox).toEqual([64, 600, 220, 40]);
    expect(ij.formFields[1]).toMatchObject({
      type: "pspdfkit/form-field/signature",
      id: "field-1",
      name: "signatureClient",
      annotationIds: ["widget-1"],
    });
    expect(ij.formFields[2]).toMatchObject({
      type: "pspdfkit/form-field/signature",
      id: "field-2",
      name: "signatureProvider",
      annotationIds: ["widget-2"],
    });
  });
});
