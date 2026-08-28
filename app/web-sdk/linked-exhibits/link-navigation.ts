import {
  CROSS_REFERENCES,
  type CrossReference,
  DOCUMENTS,
  documentUrl,
  findDocument as findById,
  type LinkedDocument,
} from "./documents";

/**
 * The shape this module needs from a pressed annotation. Deliberately minimal
 * and structural rather than an SDK type, so the logic is testable with plain
 * objects and tolerant of an action shape the SDK renders differently than the
 * types suggest.
 */
export type PressedAnnotation = {
  action?: {
    uri?: unknown;
    relativePath?: unknown;
  } | null;
};

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Just enough of window.NutrientViewer to build a link annotation. */
export type NutrientViewerLike = {
  Geometry: { Rect: new (args: RectLike) => unknown };
  Color: { fromHex: (hex: string) => unknown };
  Actions: { URIAction: new (args: { uri: string }) => unknown };
  Annotations: {
    LinkAnnotation: new (props: Record<string, unknown>) => unknown;
  };
};

/** Where a pressed link points: a document in the set, plus its raw fragment. */
export type LinkTarget = {
  /** Document id from the allow-list. */
  id: string;
  /**
   * The URI fragment, e.g. `"#page=2"`, or null when there was none.
   *
   * Handed to the caller verbatim rather than parsed here, so the viewer can
   * pass it to the SDK's own `viewStateFromOpenParameters()` instead of this
   * module re-implementing the open-parameter format.
   */
  hash: string | null;
};

/** Blue border, wide enough to see on a projector without hiding the text. */
export const LINK_BORDER_COLOR = "#2563eb";
export const LINK_BORDER_WIDTH = 1;

/**
 * Build the URI for a link that opens `doc` at `page`.
 *
 * `page` is 1-based and goes on as a `#page=` fragment — the same open
 * parameter the SDK documents for the URL of a page hosting the viewer:
 * https://www.nutrient.io/guides/web/features/open-parameters/
 */
export function linkUri(doc: LinkedDocument, page: number): string {
  return `${documentUrl(doc)}#page=${page}`;
}

/**
 * Every cross-reference that should become a link while `currentId` is open.
 *
 * Excluding references that target the open document is what stops a
 * document's own title from linking to itself: Exhibit A's header contains
 * the phrase "Exhibit A", and the agreement's title contains "Master Services
 * Agreement".
 */
export function crossReferencesFrom(
  currentId: string,
  refs: readonly CrossReference[] = CROSS_REFERENCES,
): CrossReference[] {
  return refs.filter((ref) => ref.targetId !== currentId);
}

/** Split a URI into its filename and its fragment. */
function splitUri(uri: string): { fileName: string; hash: string | null } {
  const hashAt = uri.indexOf("#");
  const hash = hashAt === -1 ? null : uri.slice(hashAt);
  const path = (hashAt === -1 ? uri : uri.slice(0, hashAt)).split("?")[0];
  const segments = path.split("/");
  return { fileName: segments[segments.length - 1] ?? "", hash };
}

/**
 * Resolve a pressed annotation to a document in this set, or null.
 *
 * Null means "not ours" — the caller must leave the SDK's default behavior
 * alone so ordinary web links keep working.
 *
 * Note what this does NOT do: it never returns a URL for fetching. The
 * annotation only ever selects an entry from the manifest, so a link pointing
 * somewhere unexpected cannot make the sample load an arbitrary document.
 */
export function resolveLinkTarget(
  annotation: PressedAnnotation,
  docs: readonly LinkedDocument[] = DOCUMENTS,
): LinkTarget | null {
  const action = annotation.action;
  if (!action) return null;

  const raw =
    typeof action.uri === "string"
      ? action.uri
      : typeof action.relativePath === "string"
        ? action.relativePath
        : null;
  if (!raw) return null;

  const { fileName, hash } = splitUri(raw);
  if (!fileName) return null;

  const match = docs.find((doc) => doc.fileName === fileName);
  return match ? { id: match.id, hash } : null;
}

/**
 * Build one LinkAnnotation over one rect returned by instance.search().
 *
 * A LinkAnnotation renders nothing of its own, so the border is what makes the
 * hotspot visible — the underlying document already supplies the text.
 */
export function buildLinkAnnotation(
  NV: NutrientViewerLike,
  args: { pageIndex: number; rect: RectLike; uri: string },
): unknown {
  return new NV.Annotations.LinkAnnotation({
    pageIndex: args.pageIndex,
    boundingBox: new NV.Geometry.Rect(args.rect),
    action: new NV.Actions.URIAction({ uri: args.uri }),
    borderColor: NV.Color.fromHex(LINK_BORDER_COLOR),
    borderWidth: LINK_BORDER_WIDTH,
    borderStyle: "solid",
  });
}

export { findById as findDocument };
