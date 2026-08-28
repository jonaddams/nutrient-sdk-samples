import { describe, expect, it, vi } from "vitest";
import { DOCUMENTS, documentUrl, findDocument } from "./documents";
import {
  buildLinkAnnotation,
  crossReferenceTargets,
  resolveLinkTarget,
} from "./link-navigation";

/** A stand-in for window.NutrientViewer, recording what it was constructed with. */
function fakeNV() {
  return {
    Geometry: {
      Rect: class {
        args: unknown;
        constructor(args: unknown) {
          this.args = args;
        }
      },
    },
    Color: { fromHex: (hex: string) => ({ hex }) },
    Actions: {
      URIAction: class {
        uri: string;
        constructor({ uri }: { uri: string }) {
          this.uri = uri;
        }
      },
    },
    Annotations: {
      LinkAnnotation: class {
        props: Record<string, unknown>;
        constructor(props: Record<string, unknown>) {
          this.props = props;
        }
      },
    },
  };
}

describe("crossReferenceTargets", () => {
  it("returns every document except the one currently open", () => {
    const targets = crossReferenceTargets("agreement");
    expect(targets.map((d) => d.id)).toEqual([
      "exhibit-a",
      "exhibit-b",
      "exhibit-c",
    ]);
  });

  it("never includes the current document, so a title cannot self-link", () => {
    for (const doc of DOCUMENTS) {
      const ids = crossReferenceTargets(doc.id).map((d) => d.id);
      expect(ids).not.toContain(doc.id);
    }
  });

  it("returns all documents when the current id is unknown", () => {
    expect(crossReferenceTargets("nope")).toHaveLength(DOCUMENTS.length);
  });
});

describe("resolveLinkTarget", () => {
  it("resolves a URIAction pointing at a document in the set", () => {
    const doc = DOCUMENTS[1];
    const annotation = { action: { uri: documentUrl(doc) } };
    expect(resolveLinkTarget(annotation)).toBe(doc.id);
  });

  it("resolves an absolute URL by its final path segment", () => {
    const doc = DOCUMENTS[2];
    const annotation = {
      action: { uri: `https://files.example.com/legal/${doc.fileName}` },
    };
    expect(resolveLinkTarget(annotation)).toBe(doc.id);
  });

  it("resolves a GoToRemoteAction relativePath, for PDFs that ship with /GoToR links", () => {
    const doc = DOCUMENTS[3];
    const annotation = { action: { relativePath: `./${doc.fileName}` } };
    expect(resolveLinkTarget(annotation)).toBe(doc.id);
  });

  it("returns null for a document that is not in the set", () => {
    const annotation = { action: { uri: "/documents/somewhere-else.pdf" } };
    expect(resolveLinkTarget(annotation)).toBeNull();
  });

  it("returns null for an ordinary web link, leaving it to the SDK", () => {
    const annotation = { action: { uri: "https://nutrient.io/pricing" } };
    expect(resolveLinkTarget(annotation)).toBeNull();
  });

  it("returns null for an annotation with no action at all", () => {
    expect(resolveLinkTarget({})).toBeNull();
  });

  it("ignores a query string and fragment when matching the filename", () => {
    const doc = DOCUMENTS[1];
    const annotation = {
      action: { uri: `${documentUrl(doc)}?v=2#page=3` },
    };
    expect(resolveLinkTarget(annotation)).toBe(doc.id);
  });

  it("does not match a filename that merely ends with a known filename", () => {
    const annotation = {
      action: { uri: "/documents/not-exhibit-a-statement-of-work.pdf" },
    };
    expect(resolveLinkTarget(annotation)).toBeNull();
  });
});

describe("buildLinkAnnotation", () => {
  it("puts the URIAction and the searched rect on the annotation", () => {
    const NV = fakeNV();
    const built = buildLinkAnnotation(NV, {
      pageIndex: 2,
      rect: { left: 10, top: 20, width: 80, height: 12 },
      uri: "/documents/linked-exhibits/exhibit-b-fee-schedule.pdf",
    }) as { props: Record<string, unknown> };

    expect(built.props.pageIndex).toBe(2);
    expect((built.props.action as { uri: string }).uri).toBe(
      "/documents/linked-exhibits/exhibit-b-fee-schedule.pdf",
    );
    expect((built.props.boundingBox as { args: unknown }).args).toEqual({
      left: 10,
      top: 20,
      width: 80,
      height: 12,
    });
  });

  it("gives the link a visible border, since a LinkAnnotation renders nothing on its own", () => {
    const NV = fakeNV();
    const built = buildLinkAnnotation(NV, {
      pageIndex: 0,
      rect: { left: 0, top: 0, width: 10, height: 10 },
      uri: "/x.pdf",
    }) as { props: Record<string, unknown> };

    expect(built.props.borderWidth).toBeGreaterThan(0);
    expect(built.props.borderColor).toBeDefined();
    expect(built.props.borderStyle).toBe("solid");
  });

  it("does not call Color.fromHex more than needed", () => {
    const NV = fakeNV();
    const spy = vi.spyOn(NV.Color, "fromHex");
    buildLinkAnnotation(NV, {
      pageIndex: 0,
      rect: { left: 0, top: 0, width: 1, height: 1 },
      uri: "/x.pdf",
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("findDocument", () => {
  it("finds a document by id", () => {
    expect(findDocument("exhibit-c")?.fileName).toBe(
      "exhibit-c-mutual-nda.pdf",
    );
  });

  it("returns undefined for an unknown id", () => {
    expect(findDocument("exhibit-z")).toBeUndefined();
  });
});
