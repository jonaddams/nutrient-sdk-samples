import type NutrientViewer from "@nutrient-sdk/viewer";
import type { Instance } from "@nutrient-sdk/viewer";

// Extended instance type for content-edit-api sample with custom methods
interface ExtendedInstance extends Instance {
  toggleFindReplace?: () => void;
  triggerAIReplace?: () => Promise<void>;
  detectText?: () => void;
  toggleContentEditor?: () => void;
}

declare global {
  interface Window {
    // Nutrient Web SDK will be available on window.NutrientViewer once loaded
    NutrientViewer?: typeof NutrientViewer;
    // PSPDFKit is available for backward compatibility
    PSPDFKit?: typeof NutrientViewer;
    // Instance will be stored on window after loading
    instance?: Instance;
    // Used in text-comparison and content-edit-api samples
    viewerInstance?: ExtendedInstance;
  }
}
