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
    // Note: PSPDFKit types are defined in app/document-authoring-sdk/types/index.ts
    // Instance will be stored on window after loading
    instance?: Instance;
    // Used in text-comparison and content-edit-api samples
    viewerInstance?: ExtendedInstance;
  }
}
