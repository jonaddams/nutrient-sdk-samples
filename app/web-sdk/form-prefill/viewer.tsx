"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";

const DOCUMENT = "/patient-intake/documents/Patient Demographics Form.pdf";

export interface FormFieldInfo {
  name: string;
  type: string;
  value: string;
}

interface FormPrefillViewerProps {
  onFieldsDiscovered: (fields: FormFieldInfo[]) => void;
}

export default function FormPrefillViewer({
  onFieldsDiscovered,
}: FormPrefillViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const onFieldsDiscoveredRef = useRef(onFieldsDiscovered);
  onFieldsDiscoveredRef.current = onFieldsDiscovered;

  // Expose instance for the page component to call setFormFieldValues
  useEffect(() => {
    return () => {
      (window as any).__formPrefillInstance = null;
    };
  }, []);

  const discoverFields = useCallback(async (inst: Instance) => {
    const { NutrientViewer } = window;
    if (!NutrientViewer) return;

    try {
      const formFields = (await inst.getFormFields()) as any;
      const fields: FormFieldInfo[] = [];

      formFields.forEach((field: any) => {
        let type = "unknown";
        if (field instanceof NutrientViewer.FormFields.TextFormField)
          type = "text";
        else if (field instanceof NutrientViewer.FormFields.CheckBoxFormField)
          type = "checkbox";
        else if (
          field instanceof NutrientViewer.FormFields.RadioButtonFormField
        )
          type = "radio";
        else if (field instanceof NutrientViewer.FormFields.ComboBoxFormField)
          type = "combobox";
        else if (field instanceof NutrientViewer.FormFields.ListBoxFormField)
          type = "listbox";
        else if (field instanceof NutrientViewer.FormFields.SignatureFormField)
          type = "signature";
        else if (field instanceof NutrientViewer.FormFields.ButtonFormField)
          type = "button";

        // Only include fillable fields
        if (type === "text" || type === "combobox" || type === "listbox") {
          fields.push({
            name: field.name,
            type,
            value: field.value ?? "",
          });
        }
      });

      onFieldsDiscoveredRef.current(fields);
    } catch (error) {
      console.error("Error discovering form fields:", error);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).then(async (instance: Instance) => {
      instanceRef.current = instance;
      (window as any).__formPrefillInstance = instance;
      await discoverFields(instance);
    });

    return () => {
      instanceRef.current = null;
      (window as any).__formPrefillInstance = null;
      NutrientViewer.unload(container);
    };
  }, [discoverFields]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
