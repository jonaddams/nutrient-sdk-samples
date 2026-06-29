import { describe, expect, it } from "vitest";
import {
  buildInstantJson,
  locateAnchors,
  signatureFieldBbox,
} from "../pipeline";

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
  it("matches signer tokens (case-insensitive) and maps to field metadata", () => {
    const anchors = locateAnchors(content);
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toMatchObject({
      pageIndex: 0,
      fieldName: "signatureClient",
      label: "Client Signature",
    });
    expect(anchors[1]).toMatchObject({
      pageIndex: 0,
      fieldName: "signatureProvider",
      label: "Provider Signature",
    });
    expect(anchors[0].bbox).toEqual({
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
        ["signatureClient", "signatureProvider"].includes(a.fieldName),
      ),
    ).toBe(true);
  });

  it("returns [] when pages or structuredText are missing", () => {
    expect(locateAnchors({})).toEqual([]);
    expect(locateAnchors({ pages: [{}] })).toEqual([]);
  });
});

describe("signatureFieldBbox", () => {
  it("expands the text box to a usable signing area with floors", () => {
    expect(
      signatureFieldBbox({ left: 64, top: 600, width: 100, height: 9 }),
    ).toEqual([64, 600, 220, 40]);
    expect(
      signatureFieldBbox({ left: 5, top: 5, width: 300, height: 20 }),
    ).toEqual([5, 5, 300, 80]);
  });
});

describe("buildInstantJson", () => {
  it("produces one linked widget + signature form field per anchor", () => {
    const anchors = locateAnchors(content);
    const ij = buildInstantJson(anchors);
    expect(ij.format).toBe("https://pspdfkit.com/instant-json/v1");
    expect(ij.annotations).toHaveLength(2);
    expect(ij.formFields).toHaveLength(2);
    expect(ij.annotations[0]).toMatchObject({
      type: "pspdfkit/widget",
      id: "widget-0",
      pageIndex: 0,
      formFieldName: "signatureClient",
    });
    expect(ij.annotations[0].bbox).toEqual([64, 600, 220, 40]);
    expect(ij.formFields[0]).toMatchObject({
      type: "pspdfkit/form-field/signature",
      id: "field-0",
      name: "signatureClient",
      annotationIds: ["widget-0"],
    });
    expect(ij.annotations[1]).toMatchObject({
      type: "pspdfkit/widget",
      id: "widget-1",
      pageIndex: 0,
      formFieldName: "signatureProvider",
    });
    expect(ij.formFields[1]).toMatchObject({
      type: "pspdfkit/form-field/signature",
      id: "field-1",
      name: "signatureProvider",
      annotationIds: ["widget-1"],
    });
  });
});
