"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { fetchTemplateJson } from "../../../lib/utils";
import type { TemplateType } from "../../../types";
import { useWizard } from "../../context/wizard-context";
import StepNavigation from "../step-navigation";

export default function CustomizeStep() {
  const { state, dispatch, completeCurrentStep, nextStep } = useWizard();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const isInitializing = useRef(false);
  const sdkLoadFailed = useRef(false);

  console.log("🎨 CustomizeStep render:", {
    template: state.template,
    hasTemplateEditor: !!state.templateEditor,
    hasTemplateDocument: !!state.templateDocument,
    currentStep: state.currentStep,
    isLoading,
    isInitializing: isInitializing.current,
  });

  // Add global error handler for SDK errors
  useEffect(() => {
    const handleSDKError = (event: ErrorEvent): boolean | undefined => {
      const error = event.error;
      const message = event.message || "";
      const stack = error?.stack || "";

      // Check for various SDK errors that we want to suppress
      if (
        message.includes("docauth-impl") ||
        message.includes("nutrient-viewer.js") ||
        stack.includes("IntersectionObserver") ||
        stack.includes("nutrient-viewer.js") ||
        message.includes("Cannot read properties of null")
      ) {
        console.warn("⚠️ SDK error caught and handled:", {
          message,
          stack: stack.substring(0, 200),
        });
        event.preventDefault(); // Prevent the error from propagating
        return true;
      }
      return false;
    };

    window.addEventListener("error", handleSDKError);
    return () => {
      window.removeEventListener("error", handleSDKError);
    };
  }, []);

  const initializeEditor = useCallback(async () => {
    console.log("🚀 INITIALIZEEDITOR CALLED with state:", {
      template: state.template,
      hasDocAuthSystem: !!state.docAuthSystem,
      hasTemplateDocument: !!state.templateDocument,
      hasTemplateEditor: !!state.templateEditor,
      isInitializing: isInitializing.current,
      sdkLoadFailed: sdkLoadFailed.current,
    });

    if (isInitializing.current) {
      console.log("⏸️ Initialization already in progress, skipping");
      return;
    }

    // If SDK load has already failed, don't try again
    if (sdkLoadFailed.current) {
      console.log("⏸️ SDK load previously failed, skipping initialization");
      return;
    }

    // Clean up any existing editor first
    if (state.templateEditor) {
      console.log(
        "🧹 Cleaning up existing template editor before initializing new one",
      );
      try {
        state.templateEditor.destroy();
        console.log("✅ Template editor destroyed successfully");
      } catch (error) {
        console.warn("⚠️ Template editor cleanup error:", error);
      }
      dispatch({ type: "SET_TEMPLATE_EDITOR", payload: null });
      dispatch({ type: "SET_TEMPLATE_DOCUMENT", payload: null });
    }

    // Wait for ref to be available
    let attempts = 0;
    const maxAttempts = 20;
    while (!editorRef.current && attempts < maxAttempts) {
      console.log(
        `🔄 Waiting for editor ref (attempt ${attempts + 1}/${maxAttempts})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!editorRef.current) {
      console.warn("❌ No editor ref available after waiting");
      return;
    }

    // Validate DOM connection and dimensions
    if (!editorRef.current.isConnected) {
      console.warn("❌ Editor ref element is not connected to DOM");
      return;
    }

    // Wait for container to have proper dimensions
    let dimensionAttempts = 0;
    const maxDimensionAttempts = 10;
    let rect = editorRef.current.getBoundingClientRect();

    while (
      (rect.width === 0 || rect.height === 0) &&
      dimensionAttempts < maxDimensionAttempts
    ) {
      console.log(
        `🔄 Waiting for container dimensions (attempt ${dimensionAttempts + 1}/${maxDimensionAttempts}):`,
        rect,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      rect = editorRef.current.getBoundingClientRect();
      dimensionAttempts++;
    }

    if (rect.width === 0 || rect.height === 0) {
      console.warn(
        "❌ Editor container still has zero dimensions after waiting:",
        rect,
      );
      return;
    }

    console.log("✅ Container has valid dimensions:", rect);

    if (!state.template) {
      console.warn("❌ No template selected");
      return;
    }

    isInitializing.current = true;
    setIsLoading(true);

    try {
      // Initialize Document Authoring system if not already done
      let docAuthSystem = state.docAuthSystem;
      if (!docAuthSystem) {
        if (!window.DocAuth) {
          console.error("❌ Document Authoring SDK not loaded");
          sdkLoadFailed.current = true;
          throw new Error("Document Authoring SDK not loaded");
        }

        docAuthSystem = await window.DocAuth.createDocAuthSystem();
        console.log("✅ Document Authoring system created");
        dispatch({ type: "SET_DOC_AUTH_SYSTEM", payload: docAuthSystem });
      }

      // Always load the template document for the current template
      console.log("📄 Loading template document for:", state.template);
      let templateDocument: any = null;

      if (state.template === "custom" && state.customTemplateBinary) {
        templateDocument = await docAuthSystem.importDOCX(
          state.customTemplateBinary,
        );
        console.log("✅ Custom DOCX template imported");
      } else {
        try {
          const templateJson = await fetchTemplateJson(
            state.template as TemplateType,
          );
          templateDocument = await docAuthSystem.loadDocument(templateJson);
          console.log("✅ DocJSON template loaded for:", state.template);
        } catch (fetchError) {
          console.error("❌ Error fetching template JSON:", fetchError);
          throw fetchError;
        }
      }

      dispatch({ type: "SET_TEMPLATE_DOCUMENT", payload: templateDocument });

      // Initialize editor
      console.log("🖊️ Creating template editor...");

      const container = editorRef.current;
      if (!container) {
        console.warn(
          "❌ Container became null during template editor initialization",
        );
        return;
      }

      // Clear any existing content
      while (container.firstChild) {
        const child = container.firstChild;
        if (child.parentNode === container) {
          container.removeChild(child);
        } else {
          break;
        }
      }

      // Ensure container is properly styled and sized
      if (!container.id) {
        container.id = `template-editor-${Date.now()}`;
      }
      container.style.position = "relative";
      container.style.overflow = "hidden";

      // Set explicit pixel dimensions as required by Document Authoring SDK
      const containerRect = container.getBoundingClientRect();
      container.style.width = `${containerRect.width}px`;
      container.style.height = `${containerRect.height || 500}px`;
      container.style.minHeight = "500px";

      // Log the final container dimensions for debugging
      console.log("🔍 Final container dimensions before SDK initialization:", {
        width: container.style.width,
        height: container.style.height,
        rect: containerRect,
      });

      // Wait multiple frames to ensure DOM is completely settled
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Final validation
      if (!container.isConnected || !container.parentElement) {
        console.warn(
          "❌ Template container became disconnected before editor creation",
        );
        return;
      }

      console.log("📝 Container ready, creating editor with dimensions:", {
        width: container.getBoundingClientRect().width,
        height: container.getBoundingClientRect().height,
      });

      try {
        const editorOptions = {
          document: templateDocument,
        };

        const editor = await docAuthSystem.createEditor(
          container,
          editorOptions,
        );
        console.log("✅ Template editor ready");
        dispatch({ type: "SET_TEMPLATE_EDITOR", payload: editor });
      } catch (sdkError) {
        console.error(
          "❌ Document Authoring SDK error in template editor:",
          sdkError,
        );
        // Retry after delay
        console.log("🔄 Retrying template SDK initialization...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (container.isConnected && container.parentElement) {
          try {
            const editor = await docAuthSystem.createEditor(container, {
              document: templateDocument,
            });
            console.log("✅ Template editor created on retry");
            dispatch({ type: "SET_TEMPLATE_EDITOR", payload: editor });
          } catch (retryError) {
            console.error("❌ Template SDK retry failed:", retryError);
            throw retryError;
          }
        } else {
          console.error("❌ Template container no longer available for retry");
          throw sdkError;
        }
      }
    } catch (error) {
      console.error("❌ Error initializing template editor:", error);

      // Check if it's the specific null properties error we're seeing
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Only dispatch error if SDK load hasn't failed (to avoid infinite loop)
      if (!sdkLoadFailed.current) {
        if (errorMessage.includes("Cannot read properties of null")) {
          console.warn(
            "⚠️ Detected null properties error, this might be a timing or SDK conflict issue",
          );
          dispatch({
            type: "SET_ERROR",
            payload:
              "Template editor initialization failed - please try selecting a different template or refreshing the page",
          });
        } else {
          dispatch({ type: "SET_ERROR", payload: errorMessage });
        }
      } else {
        console.warn(
          "⚠️ SDK load failed, not dispatching error to avoid infinite loop",
        );
      }
    } finally {
      setIsLoading(false);
      isInitializing.current = false;
    }
  }, [state, dispatch]);

  // Effect to handle template changes and editor initialization
  useEffect(() => {
    console.log("📍 CustomizeStep useEffect triggered with:", {
      template: state.template,
      editorExists: !!state.templateEditor,
      documentExists: !!state.templateDocument,
      isInitializing: isInitializing.current,
      currentStep: state.currentStep,
    });

    // Check if we need to initialize or reconnect editor
    if (state.template && !isInitializing.current) {
      if (!state.templateEditor) {
        console.log(
          "🎆 About to initialize editor for template:",
          state.template,
        );
        initializeEditor();
      } else {
        // Editor exists but might need reconnection to DOM
        console.log(
          "🔄 Checking if existing template editor needs reconnection...",
        );

        // Check if the current container is empty or if we need to reinitialize
        const currentContainer = editorRef.current;

        if (!currentContainer || currentContainer.children.length === 0) {
          console.log(
            "🔄 Template editor container is empty, reinitializing...",
          );
          // Clear the disconnected editor from state and reinitialize
          dispatch({ type: "SET_TEMPLATE_EDITOR", payload: null });
          dispatch({ type: "SET_TEMPLATE_DOCUMENT", payload: null });
          setTimeout(() => {
            if (!isInitializing.current) {
              initializeEditor();
            }
          }, 100);
        } else {
          console.log(
            "✅ Template editor container has content, assuming ready",
          );
        }
      }
    } else {
      console.log("🚫 Not initializing editor:", {
        hasTemplate: !!state.template,
        hasEditor: !!state.templateEditor,
        isInitializing: isInitializing.current,
      });
    }
  }, [
    state.template,
    state.currentStep,
    state.templateDocument,
    state.templateEditor,
    dispatch,
    initializeEditor,
  ]);

  // Effect to handle cleanup when editor changes or component unmounts
  useEffect(() => {
    return () => {
      if (state.templateEditor) {
        console.log("🧹 Cleaning up template editor");
        try {
          state.templateEditor.destroy();
        } catch (error) {
          console.warn("⚠️ Template editor cleanup error:", error);
        }
      }
    };
  }, [state.templateEditor]);

  const handleNext = () => {
    completeCurrentStep();
    nextStep();
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="text-center flex-shrink-0">
        <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Customize Your Template
        </h2>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Edit the template design and layout to match your needs
        </p>
      </div>

      {/* Template Editor Container */}
      <div
        className="relative overflow-hidden bg-white border border-gray-200 dark:border-[var(--warm-gray-600)] rounded-xl flex-1"
        style={{ minHeight: "700px" }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/75 dark:bg-black/75">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading template editor...
              </p>
            </div>
          </div>
        )}
        {sdkLoadFailed.current && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
            <div className="text-center max-w-md px-6">
              <svg
                className="mx-auto h-12 w-12 text-red-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>SDK Load Error</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Document Authoring SDK Not Loaded
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                The Document Authoring SDK failed to load. This might be due to
                a network issue or the SDK being blocked.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}
        {state.error && !sdkLoadFailed.current && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{state.error}</span>
            </div>
          </div>
        )}
        {!state.template && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 48 48"
              >
                <title>Template Editor</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-5m-4 0V3a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-4 0h8"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                Template Editor
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a template first
              </p>
            </div>
          </div>
        )}
        <div
          ref={editorRef}
          className="absolute inset-0"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            touchAction: "manipulation",
          }}
        />
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0">
        <StepNavigation
          canProceed={!!state.template && !!state.templateEditor && !isLoading}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
