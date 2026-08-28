import { describe, expect, it, vi } from "vitest";
import {
  CROSS_REFERENCES,
  DOCUMENTS,
  documentUrl,
  findDocument,
} from "./documents";
import {
  buildLinkAnnotation,
  crossReferencesFrom,
  linkUri,
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

describe("CROSS_REFERENCES invariants", () => {
  // Guards the bug this prevents: searching "Exhibit A" would also match
  // inside a longer phrase containing it, stacking two overlapping links on
  // the same words with different target pages.
  it("has no phrase that is a substring of another phrase", () => {
    const offenders: string[] = [];
    for (const a of CROSS_REFERENCES) {
      for (const b of CROSS_REFERENCES) {
        if (a === b) continue;
        if (b.phrase.includes(a.phrase)) {
          offenders.push(`"${a.phrase}" is inside "${b.phrase}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("targets a document that exists", () => {
    for (const ref of CROSS_REFERENCES) {
      expect(findDocument(ref.targetId), ref.phrase).toBeDefined();
    }
  });

  it("never targets a page beyond the target document's page count", () => {
    for (const ref of CROSS_REFERENCES) {
      const doc = findDocument(ref.targetId);
      expect(
        ref.page,
        `${ref.phrase} → ${ref.targetId}`,
      ).toBeGreaterThanOrEqual(1);
      expect(ref.page, `${ref.phrase} → ${ref.targetId}`).toBeLessThanOrEqual(
        doc?.pageCount ?? 0,
      );
    }
  });

  it("includes at least one deep link past page 1, or the feature is untested by the demo", () => {
    expect(CROSS_REFERENCES.some((r) => r.page > 1)).toBe(true);
  });
});

describe("linkUri", () => {
  it("puts the target page on the URI as a #page= fragment", () => {
    const doc = findDocument("exhibit-b");
    if (!doc) throw new Error("fixture missing");
    expect(linkUri(doc, 2)).toBe(
      "/documents/linked-exhibits/exhibit-b-fee-schedule.pdf#page=2",
    );
  });

  it("uses a 1-based page number, matching the open-parameter convention", () => {
    const doc = findDocument("agreement");
    if (!doc) throw new Error("fixture missing");
    expect(linkUri(doc, 1)).toMatch(/#page=1$/);
  });
});

describe("crossReferencesFrom", () => {
  it("excludes references pointing at the document currently open", () => {
    const refs = crossReferencesFrom("exhibit-a");
    expect(refs.map((r) => r.targetId)).not.toContain("exhibit-a");
  });

  it("drops every self-reference for every document, so a title cannot self-link", () => {
    for (const doc of DOCUMENTS) {
      const ids = crossReferencesFrom(doc.id).map((r) => r.targetId);
      expect(ids, doc.id).not.toContain(doc.id);
    }
  });

  it("keeps the deep links to other documents", () => {
    const phrases = crossReferencesFrom("agreement").map((r) => r.phrase);
    expect(phrases).toContain("Section A.2");
    expect(phrases).toContain("Section B.1");
    expect(phrases).toContain("Section C.4");
    expect(phrases).not.toContain("Master Services Agreement");
  });

  it("returns everything when the current id is unknown", () => {
    expect(crossReferencesFrom("nope")).toHaveLength(CROSS_REFERENCES.length);
  });
});

describe("resolveLinkTarget", () => {
  it("resolves a document id and hands back the fragment for the SDK to parse", () => {
    const doc = findDocument("exhibit-a");
    if (!doc) throw new Error("fixture missing");
    expect(resolveLinkTarget({ action: { uri: linkUri(doc, 2) } })).toEqual({
      id: "exhibit-a",
      hash: "#page=2",
    });
  });

  it("returns a null hash when the URI carries no fragment", () => {
    const doc = findDocument("exhibit-c");
    if (!doc) throw new Error("fixture missing");
    expect(resolveLinkTarget({ action: { uri: documentUrl(doc) } })).toEqual({
      id: "exhibit-c",
      hash: null,
    });
  });

  it("resolves an absolute URL by its final path segment, fragment included", () => {
    expect(
      resolveLinkTarget({
        action: {
          uri: "https://files.example.com/legal/exhibit-b-fee-schedule.pdf#page=2",
        },
      }),
    ).toEqual({ id: "exhibit-b", hash: "#page=2" });
  });

  it("resolves a GoToRemoteAction relativePath, for PDFs that ship with /GoToR links", () => {
    expect(
      resolveLinkTarget({
        action: { relativePath: "./exhibit-c-mutual-nda.pdf" },
      }),
    ).toEqual({ id: "exhibit-c", hash: null });
  });

  it("ignores a query string when matching the filename but keeps the fragment", () => {
    expect(
      resolveLinkTarget({
        action: {
          uri: "/documents/linked-exhibits/exhibit-a-statement-of-work.pdf?v=2#page=3",
        },
      }),
    ).toEqual({ id: "exhibit-a", hash: "#page=3" });
  });

  it("returns null for a document that is not in the set", () => {
    expect(
      resolveLinkTarget({ action: { uri: "/documents/somewhere-else.pdf" } }),
    ).toBeNull();
  });

  it("returns null for an ordinary web link, leaving it to the SDK", () => {
    expect(
      resolveLinkTarget({ action: { uri: "https://nutrient.io/pricing" } }),
    ).toBeNull();
  });

  it("returns null for an annotation with no action at all", () => {
    expect(resolveLinkTarget({})).toBeNull();
  });

  it("does not match a filename that merely ends with a known filename", () => {
    expect(
      resolveLinkTarget({
        action: { uri: "/documents/not-exhibit-a-statement-of-work.pdf" },
      }),
    ).toBeNull();
  });

  it("round-trips every cross-reference: the URI it builds resolves back to the same target", () => {
    for (const ref of CROSS_REFERENCES) {
      const doc = findDocument(ref.targetId);
      if (!doc) throw new Error(`no document for ${ref.targetId}`);
      const resolved = resolveLinkTarget({
        action: { uri: linkUri(doc, ref.page) },
      });
      expect(resolved, ref.phrase).toEqual({
        id: ref.targetId,
        hash: `#page=${ref.page}`,
      });
    }
  });
});

describe("buildLinkAnnotation", () => {
  it("puts the URIAction and the searched rect on the annotation", () => {
    const NV = fakeNV();
    const built = buildLinkAnnotation(NV, {
      pageIndex: 2,
      rect: { left: 10, top: 20, width: 80, height: 12 },
      uri: "/documents/linked-exhibits/exhibit-b-fee-schedule.pdf#page=2",
    }) as { props: Record<string, unknown> };

    expect(built.props.pageIndex).toBe(2);
    expect((built.props.action as { uri: string }).uri).toBe(
      "/documents/linked-exhibits/exhibit-b-fee-schedule.pdf#page=2",
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
