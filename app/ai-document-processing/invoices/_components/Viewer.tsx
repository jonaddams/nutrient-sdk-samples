"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NutrientViewerWindow = Window & {
  NutrientViewer?: {
    load: (config: unknown) => Promise<unknown>;
    unload?: (container: HTMLElement) => void;
    FormFieldValue?: new (config: { name: string; value: string }) => unknown;
    FormFields?: {
      TextFormField: new (...args: unknown[]) => unknown;
      CheckBoxFormField: new (...args: unknown[]) => unknown;
      RadioButtonFormField: new (...args: unknown[]) => unknown;
      ComboBoxFormField: new (...args: unknown[]) => unknown;
      ListBoxFormField: new (...args: unknown[]) => unknown;
      ButtonFormField: new (...args: unknown[]) => unknown;
      SignatureFormField: new (...args: unknown[]) => unknown;
    };
  } & Record<string, unknown>;
};

interface FormField {
  name: string;
  type: string;
  required: boolean;
  value: string | null;
}

interface FieldData {
  name: string;
  type: string;
  required: boolean;
  value: string | null;
  extractedValue?: string | null;
  hasMatch?: boolean;
}

interface FormFieldValues {
  [fieldName: string]: string;
}

interface ViewerInstance {
  getFormFields: () => Promise<unknown>;
  setFormFieldValues: (values: FormFieldValues) => void;
  update: (formFieldValue: unknown) => Promise<unknown>;
}

interface ViewerProps {
  document: string | ArrayBuffer;
  onFormFieldsLoaded?: (formFields: FormField[]) => void;
  fieldData?: FieldData[];
  toolbarItems?: Array<{ type: string }>;
}

export default function Viewer({
  document,
  onFormFieldsLoaded,
  fieldData,
  toolbarItems,
}: ViewerProps) {
  const containerRef = useRef(null);
  const instanceRef = useRef<ViewerInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const memoizedToolbarItems = useMemo(() => toolbarItems, [toolbarItems]);

  const fillFormFieldsWithData = useCallback(
    async (instance: ViewerInstance, fieldData: FieldData[]) => {
      const { NutrientViewer } = window as NutrientViewerWindow;
      if (!NutrientViewer?.FormFieldValue) {
        console.error("❌ NutrientViewer.FormFieldValue not available");
        return;
      }

      for (const field of fieldData) {
        if (field.hasMatch && field.extractedValue) {
          try {
            const formFieldValue = new NutrientViewer.FormFieldValue({
              name: field.name,
              value: field.extractedValue,
            });

            await instance.update(formFieldValue);
          } catch (error) {
            console.error(`❌ Error filling field '${field.name}':`, error);
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    setError(null);

    if (
      typeof document === "string" &&
      document.includes("joseph-sample-sample-pay-stub.pdf")
    ) {
      setIsLoading(false);
      setError("Document Unavailable");
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 50;

    const tryLoad = () => {
      const container = containerRef.current;
      const { NutrientViewer } = window as NutrientViewerWindow;

      if (container && NutrientViewer) {
        const baseConfig = {
          container: container as HTMLElement,
          document: document,
        };

        const loadConfig = memoizedToolbarItems
          ? { ...baseConfig, toolbarItems: memoizedToolbarItems }
          : baseConfig;

        NutrientViewer.load(loadConfig)
          .then(async (instance: unknown) => {
            instanceRef.current = instance as ViewerInstance;
            setIsLoading(false);

            try {
              const formFields = (await (
                instance as ViewerInstance
              ).getFormFields()) as unknown[];

              const getFormFieldType = (formField: unknown) => {
                const { NutrientViewer } = window as NutrientViewerWindow;
                if (!NutrientViewer?.FormFields) return "Unknown";

                try {
                  if (
                    formField instanceof NutrientViewer.FormFields.TextFormField
                  )
                    return "Text Field";
                  if (
                    formField instanceof
                    NutrientViewer.FormFields.CheckBoxFormField
                  )
                    return "Checkbox";
                  if (
                    formField instanceof
                    NutrientViewer.FormFields.RadioButtonFormField
                  )
                    return "Radio Button";
                  if (
                    formField instanceof
                    NutrientViewer.FormFields.ComboBoxFormField
                  )
                    return "Combo Box";
                  if (
                    formField instanceof
                    NutrientViewer.FormFields.ListBoxFormField
                  )
                    return "List Box";
                  if (
                    formField instanceof
                    NutrientViewer.FormFields.ButtonFormField
                  )
                    return "Button";
                  if (
                    formField instanceof
                    NutrientViewer.FormFields.SignatureFormField
                  )
                    return "Signature";
                } catch {
                  // Ignore instanceof errors
                }

                return "Unknown";
              };

              const formFieldsArray: FormField[] = [];
              if (Array.isArray(formFields)) {
                formFields.forEach((formField: unknown) => {
                  const field = formField as {
                    name: string;
                    required: boolean;
                    value?: string;
                  };
                  formFieldsArray.push({
                    name: field.name,
                    type: getFormFieldType(formField),
                    required: field.required,
                    value: field.value || null,
                  });
                });
              }

              if (onFormFieldsLoaded) {
                onFormFieldsLoaded(formFieldsArray);
              }
            } catch (error) {
              console.error("❌ Error getting form fields:", error);
            }
          })
          .catch((error: Error) => {
            setIsLoading(false);
            console.error("❌ Error loading document:", error);
            setError(
              "Failed to load document. Please refresh the page and try again.",
            );
          });
      } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        timeoutId = setTimeout(tryLoad, 100);
      } else {
        setIsLoading(false);
        setError(
          "Failed to load Nutrient Viewer SDK. Please check your internet connection and refresh the page.",
        );
        console.error(
          "❌ Max retries reached. NutrientViewer SDK failed to load.",
        );
      }
    };

    timeoutId = setTimeout(tryLoad, 100);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const container = containerRef.current;
      const { NutrientViewer } = window as NutrientViewerWindow;
      if (container && NutrientViewer && NutrientViewer.unload) {
        NutrientViewer.unload(container);
      }
    };
  }, [document, onFormFieldsLoaded, memoizedToolbarItems]);

  useEffect(() => {
    if (fieldData && fieldData.length > 0 && instanceRef.current) {
      fillFormFieldsWithData(instanceRef.current, fieldData);
    }
  }, [fieldData, fillFormFieldsWithData]);

  if (error) {
    return (
      <div
        style={{ height: "100vh", width: "100%" }}
        className="flex items-center justify-center bg-gray-50"
      >
        <div className="text-center p-8 max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Warning icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-sm">Document Unavailable</h3>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            {typeof document === "string"
              ? document.split("/").pop()
              : "Document file"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100vh",
            width: "100%",
            backgroundColor: "rgba(249, 250, 251, 0.95)",
            zIndex: 1000,
          }}
          className="flex items-center justify-center"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Loading document...</p>
          </div>
        </div>
      )}
    </div>
  );
}
