import type NutrientViewer from "@nutrient-sdk/viewer";
import type { Instance } from "@nutrient-sdk/viewer";

declare global {
  interface Window {
    // Nutrient Web SDK will be available on window.NutrientViewer once loaded
    NutrientViewer?: typeof NutrientViewer;
    // Instance will be stored on window after loading
    instance?: Instance;
    // Used in text-comparison sample
    viewerInstance?: Instance;
  }
}
