"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";

const DOCUMENT = "/documents/account-registration-form.pdf";

// --- Validation Rule Types ---

type ValidationRule =
  | { type: "required"; message?: string }
  | { type: "pattern"; regex: RegExp; message: string }
  | { type: "minLength"; value: number; message?: string }
  | { type: "maxLength"; value: number; message?: string }
  | { type: "matchField"; field: string; message?: string }
  | { type: "conditionalRequired"; when: { field: string; values: string[] }; message?: string }
  | { type: "minSelected"; value: number; message?: string }
  | { type: "checked"; message?: string }
  | { type: "dateFormat"; format: string; message?: string }
  | { type: "signed"; message?: string };

// Rules that can be evaluated on a single field's value in real-time
const REALTIME_RULE_TYPES = new Set(["required", "pattern", "minLength", "maxLength", "dateFormat", "checked"]);

const validationRules: Record<string, ValidationRule[]> = {
  full_name: [{ type: "required" }],
  email: [
    { type: "required" },
    { type: "pattern", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
  ],
  phone: [
    { type: "pattern", regex: /^\+?[\d\s\-()]{7,15}$/, message: "Invalid phone number" },
  ],
  date_of_birth: [
    { type: "required" },
    { type: "dateFormat", format: "mm/dd/yyyy", message: "Invalid date format (mm/dd/yyyy)" },
  ],
  username: [
    { type: "required" },
    { type: "maxLength", value: 20, message: "Username must be 20 characters or fewer" },
  ],
  password: [
    { type: "required" },
    { type: "minLength", value: 8, message: "Password must be at least 8 characters" },
  ],
  confirm_password: [
    { type: "required" },
    { type: "matchField", field: "password", message: "Passwords do not match" },
  ],
  company_name: [
    {
      type: "conditionalRequired",
      when: { field: "account_type", values: ["Business", "Enterprise"] },
    },
  ],
  country: [{ type: "required" }],
  interests: [{ type: "minSelected", value: 1, message: "Select at least one interest" }],
  terms_agree: [{ type: "checked", message: "You must agree to the terms" }],
  signature: [{ type: "signed", message: "Signature is required" }],
};

// --- Validation Engine (pure functions) ---

function validateRule(
  rule: ValidationRule,
  value: string | string[] | null,
  allValues: Record<string, string | string[] | null>,
): string | null {
  const strVal = typeof value === "string" ? value.trim() : "";
  const arrVal = Array.isArray(value) ? value : [];

  switch (rule.type) {
    case "required":
      if (!strVal && arrVal.length === 0) return rule.message ?? "This field is required";
      return null;

    case "pattern":
      if (strVal && !rule.regex.test(strVal)) return rule.message;
      return null;

    case "minLength":
      if (strVal && strVal.length < rule.value)
        return rule.message ?? `Minimum ${rule.value} characters required`;
      return null;

    case "maxLength":
      if (strVal && strVal.length > rule.value)
        return rule.message ?? `Maximum ${rule.value} characters allowed`;
      return null;

    case "matchField": {
      const otherVal = typeof allValues[rule.field] === "string"
        ? (allValues[rule.field] as string).trim()
        : "";
      if (strVal && otherVal && strVal !== otherVal)
        return rule.message ?? "Fields do not match";
      return null;
    }

    case "conditionalRequired": {
      const condVal = allValues[rule.when.field];
      const condStr = typeof condVal === "string" ? condVal : "";
      if (rule.when.values.includes(condStr) && !strVal)
        return rule.message ?? "This field is required";
      return null;
    }

    case "minSelected":
      if (arrVal.length < rule.value)
        return rule.message ?? `Select at least ${rule.value}`;
      return null;

    case "checked":
      if (arrVal.length === 0 || (arrVal.length === 1 && arrVal[0] === "Off"))
        return rule.message ?? "This must be checked";
      return null;

    case "dateFormat": {
      if (!strVal) return null;
      const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
      if (!dateRegex.test(strVal)) return rule.message ?? "Invalid date format";
      return null;
    }

    case "signed":
      return null; // Handled specially via validateSignature()

    default:
      return null;
  }
}

function validateField(
  fieldName: string,
  allValues: Record<string, string | string[] | null>,
  realtimeOnly: boolean,
): string | null {
  const rules = validationRules[fieldName];
  if (!rules) return null;

  const value = allValues[fieldName] ?? null;

  for (const rule of rules) {
    if (realtimeOnly && !REALTIME_RULE_TYPES.has(rule.type)) continue;
    const error = validateRule(rule, value, allValues);
    if (error) return error;
  }
  return null;
}

function validateAll(
  allValues: Record<string, string | string[] | null>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const fieldName of Object.keys(validationRules)) {
    if (fieldName === "signature") continue;
    const error = validateField(fieldName, allValues, false);
    if (error) errors[fieldName] = error;
  }
  return errors;
}

// --- Exported types ---

export interface ValidationState {
  errors: Record<string, string>;
  validatedFields: Set<string>;
}

export interface FormFieldMeta {
  name: string;
  type: string;
  annotationIds: string[];
  pageIndex: number;
}

interface FormValidationViewerProps {
  onValidationChange: (state: ValidationState) => void;
  validateAllRef: React.MutableRefObject<(() => Promise<void>) | null>;
  resetRef: React.MutableRefObject<(() => Promise<void>) | null>;
  navigateToFieldRef: React.MutableRefObject<((fieldName: string) => Promise<void>) | null>;
}

export default function FormValidationViewer({
  onValidationChange,
  validateAllRef,
  resetRef,
  navigateToFieldRef,
}: FormValidationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const fieldMetaRef = useRef<FormFieldMeta[]>([]);
  const validationStateRef = useRef<ValidationState>({
    errors: {},
    validatedFields: new Set(),
  });
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  const updateFieldColor = useCallback(
    async (fieldName: string, isValid: boolean | null) => {
      const instance = instanceRef.current;
      const { NutrientViewer } = window;
      if (!instance || !NutrientViewer) return;

      const meta = fieldMetaRef.current.find((f) => f.name === fieldName);
      if (!meta) return;

      for (const annotationId of meta.annotationIds) {
        try {
          const annotation = await instance.getAnnotation(meta.pageIndex, annotationId);
          if (!annotation) continue;

          let color = null;
          if (isValid === true) color = NutrientViewer.Color.GREEN;
          else if (isValid === false) color = NutrientViewer.Color.RED;

          await instance.update(annotation.set("backgroundColor", color));
        } catch {
          // Annotation may not support backgroundColor
        }
      }
    },
    [],
  );

  const emitState = useCallback(() => {
    onValidationChangeRef.current({
      errors: { ...validationStateRef.current.errors },
      validatedFields: new Set(validationStateRef.current.validatedFields),
    });
  }, []);

  const validateAndUpdateField = useCallback(
    async (fieldName: string, allValues: Record<string, string | string[] | null>, realtimeOnly: boolean) => {
      const error = validateField(fieldName, allValues, realtimeOnly);
      const state = validationStateRef.current;

      state.validatedFields.add(fieldName);
      if (error) {
        state.errors[fieldName] = error;
      } else {
        delete state.errors[fieldName];
      }

      await updateFieldColor(fieldName, error === null);
      emitState();
    },
    [updateFieldColor, emitState],
  );

  const validateSignature = useCallback(async (): Promise<boolean> => {
    const instance = instanceRef.current;
    const { NutrientViewer } = window;
    if (!instance || !NutrientViewer) return false;

    const formFields = await instance.getFormFields();
    const sigField = (formFields as any[]).find(
      (f: any) => f instanceof NutrientViewer.FormFields.SignatureFormField && f.name === "signature",
    );
    if (!sigField) return true;

    const overlapping = await instance.getOverlappingAnnotations(sigField);
    const isSigned = overlapping.size > 0;

    const state = validationStateRef.current;
    state.validatedFields.add("signature");
    if (!isSigned) {
      state.errors["signature"] = "Signature is required";
    } else {
      delete state.errors["signature"];
    }

    await updateFieldColor("signature", isSigned);
    return isSigned;
  }, [updateFieldColor]);

  const handleValidateAll = useCallback(async () => {
    const instance = instanceRef.current;
    if (!instance) return;

    const allValues = await instance.getFormFieldValues();
    const errors = validateAll(allValues as Record<string, string | string[] | null>);

    const state = validationStateRef.current;
    state.errors = { ...errors };
    state.validatedFields = new Set(Object.keys(validationRules));

    for (const fieldName of Object.keys(validationRules)) {
      if (fieldName === "signature") continue;
      await updateFieldColor(fieldName, !errors[fieldName]);
    }

    await validateSignature();
    emitState();
  }, [updateFieldColor, validateSignature, emitState]);

  const handleReset = useCallback(async () => {
    const state = validationStateRef.current;
    state.errors = {};
    state.validatedFields = new Set();

    for (const meta of fieldMetaRef.current) {
      await updateFieldColor(meta.name, null);
    }

    emitState();
  }, [updateFieldColor, emitState]);

  const handleNavigateToField = useCallback(async (fieldName: string) => {
    const instance = instanceRef.current;
    if (!instance) return;

    const meta = fieldMetaRef.current.find((f) => f.name === fieldName);
    if (!meta || meta.annotationIds.length === 0) return;

    try {
      const annotation = await instance.getAnnotation(meta.pageIndex, meta.annotationIds[0]);
      if (annotation) {
        instance.jumpToRect(meta.pageIndex, annotation.boundingBox);
      }
    } catch {
      // Field may not be navigable
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

      // Discover form fields
      const formFields = await instance.getFormFields();
      const metas: FormFieldMeta[] = [];

      (formFields as any[]).forEach((field: any) => {
        let type = "unknown";
        if (field instanceof NutrientViewer.FormFields.TextFormField) type = "text";
        else if (field instanceof NutrientViewer.FormFields.CheckBoxFormField) type = "checkbox";
        else if (field instanceof NutrientViewer.FormFields.RadioButtonFormField) type = "radio";
        else if (field instanceof NutrientViewer.FormFields.ComboBoxFormField) type = "combobox";
        else if (field instanceof NutrientViewer.FormFields.ListBoxFormField) type = "listbox";
        else if (field instanceof NutrientViewer.FormFields.SignatureFormField) type = "signature";
        else if (field instanceof NutrientViewer.FormFields.ButtonFormField) type = "button";

        const annotationIds = field.annotationIds?.toArray?.() ?? [];
        metas.push({
          name: field.name,
          type,
          annotationIds,
          pageIndex: 0,
        });
      });

      fieldMetaRef.current = metas;

      // Wire up refs
      validateAllRef.current = handleValidateAll;
      resetRef.current = handleReset;
      navigateToFieldRef.current = handleNavigateToField;

      // Real-time field validation
      instance.addEventListener("formFieldValues.update", async (event: any) => {
        const allValues = await instance.getFormFieldValues();
        const changedFieldName = event?.formFieldName ?? event?.name;
        if (changedFieldName && validationRules[changedFieldName]) {
          await validateAndUpdateField(
            changedFieldName,
            allValues as Record<string, string | string[] | null>,
            true,
          );
        }
      });

      // Wire submit button
      instance.addEventListener("annotations.press", async (event: any) => {
        const meta = fieldMetaRef.current.find(
          (f) => f.type === "button" && f.annotationIds.includes(event?.annotationId),
        );
        if (meta?.name === "submit") {
          await handleValidateAll();
        }
      });
    });

    return () => {
      instanceRef.current = null;
      validateAllRef.current = null;
      resetRef.current = null;
      navigateToFieldRef.current = null;
      NutrientViewer.unload(container);
    };
  }, [handleValidateAll, handleReset, handleNavigateToField, validateAndUpdateField]);

  return <div ref={containerRef} className="validation-viewer" />;
}
