import type {
  Color,
  Configuration,
  Instance,
  Rect,
  RectangleAnnotation,
} from "@nutrient-sdk/viewer";

/**
 * The Web SDK is loaded as a CDN script tag, not imported, so `window.NutrientViewer`
 * is the entry point rather than the module's exports. This is the only place that
 * boundary is untyped: everything the global *produces* (instances, annotations,
 * rects, colours) is described by the package's own types, which are importable
 * because `next.config.ts`'s alias is a runtime external and cannot affect
 * type-only imports.
 */
export type NutrientViewerGlobal = {
  load(config: Configuration): Promise<Instance>;
  unload(target: HTMLElement | Instance): boolean;
  preloadWorker?(cfg: { licenseKey?: string; useCDN?: boolean }): Promise<void>;
  version?: string;
  Annotations: {
    RectangleAnnotation: new (
      options: Partial<RectangleAnnotation>,
    ) => RectangleAnnotation;
  };
  Geometry: {
    Rect: new (options: {
      left: number;
      top: number;
      width: number;
      height: number;
    }) => Rect;
  };
  Color: new (options: { r: number; g: number; b: number }) => Color;
};

export function getNutrientViewer(): NutrientViewerGlobal | undefined {
  return (window as unknown as { NutrientViewer?: NutrientViewerGlobal })
    .NutrientViewer;
}
