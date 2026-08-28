import {
  DOCUMENTS,
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

/** Blue border, wide enough to see on a projector without hiding the text. */
export const LINK_BORDER_COLOR = "#2563eb";
export const LINK_BORDER_WIDTH = 1;

/**
 * Every document in the set except the one currently open.
 *
 * The exclusion is what stops a document's own title from becoming a link to
 * itself: Exhibit A's header contains the phrase "Exhibit A", and the
 * agreement's title contains "Master Services Agreement".
 */
export function crossReferenceTargets(
  currentId: string,
  docs: readonly LinkedDocument[] = DOCUMENTS,
): LinkedDocument[] {
  return docs.filter((doc) => doc.id !== currentId);
}

/** The last path segment of a URI, with any query string or fragment removed. */
function fileNameFromUri(uri: string): string {
  const withoutHash = uri.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  const segments = withoutQuery.split("/");
  return segments[segments.length - 1] ?? "";
}

/**
 * Resolve a pressed annotation to a document id in this set, or null.
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
): string | null {
  const action = annotation.action;
  if (!action) return null;

  const raw =
    typeof action.uri === "string"
      ? action.uri
      : typeof action.relativePath === "string"
        ? action.relativePath
        : null;
  if (!raw) return null;

  const fileName = fileNameFromUri(raw);
  if (!fileName) return null;

  const match = docs.find((doc) => doc.fileName === fileName);
  return match ? match.id : null;
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
