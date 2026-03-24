"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { FormFieldInfo } from "./viewer";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

// Checkbox groups: multiple checkboxes that represent a single-choice field
// The key suffix (after _) groups them; only one should be "Yes" at a time
interface CheckboxGroup {
  label: string;
  suffix: string;
  options: { label: string; prefix: string }[];
}

const CHECKBOX_GROUPS: CheckboxGroup[] = [
  {
    label: "Gender",
    suffix: "_gender",
    options: [
      { label: "Female", prefix: "genderFemale" },
      { label: "Male", prefix: "genderMale" },
      { label: "Other", prefix: "genderOther" },
      { label: "Prefer Not to Say", prefix: "genderPreferNot" },
    ],
  },
  {
    label: "Marital Status",
    suffix: "_maritalStatus",
    options: [
      { label: "Single", prefix: "maritalSingle" },
      { label: "Married", prefix: "maritalMarried" },
      { label: "Divorced", prefix: "maritalDivorced" },
      { label: "Widowed", prefix: "maritalWidowed" },
    ],
  },
];

// Sample data presets that can be loaded into form fields
const PRESETS: Record<string, Record<string, string>> = {
  "Sarah Johnson": {
    firstName: "Sarah",
    lastName: "Johnson",
    middleName: "Marie",
    dateOfBirth: "03/15/1987",
    ssn: "123-45-6789",
    phone: "(555) 123-4567",
    email: "sarah.johnson@email.com",
    address: "1245 Oak Street",
    city: "Springfield",
    state: "IL",
    zipCode: "62701",
    employer: "Springfield General Hospital",
    occupation: "Registered Nurse",
    gender: "Female",
    maritalStatus: "Married",
  },
  "John Smith": {
    firstName: "John",
    lastName: "Smith",
    middleName: "Robert",
    dateOfBirth: "07/22/1990",
    ssn: "987-65-4321",
    phone: "(555) 867-5309",
    email: "john.smith@example.com",
    address: "789 Elm Avenue",
    city: "Portland",
    state: "OR",
    zipCode: "97201",
    employer: "TechCorp Inc.",
    occupation: "Software Engineer",
    gender: "Male",
    maritalStatus: "Single",
  },
};

export default function FormPrefillPage() {
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [filledCount, setFilledCount] = useState(0);

  const handleFieldsDiscovered = useCallback(
    (discoveredFields: FormFieldInfo[]) => {
      setFields(discoveredFields);
      const initial: Record<string, string> = {};
      for (const f of discoveredFields) {
        if (f.type !== "checkbox") {
          initial[f.name] = f.value;
        }
      }
      // Initialize virtual group fields
      for (const group of CHECKBOX_GROUPS) {
        initial[group.label] = "";
      }
      setFieldValues(initial);
    },
    [],
  );

  // Check if a field belongs to a checkbox group
  const isGroupedCheckbox = (field: FormFieldInfo): boolean => {
    if (field.type !== "checkbox") return false;
    return CHECKBOX_GROUPS.some((g) =>
      field.name.toLowerCase().endsWith(g.suffix.toLowerCase()),
    );
  };

  // Non-checkbox fields for sidebar display
  const textFields = fields.filter((f) => !isGroupedCheckbox(f) && f.type !== "checkbox");

  const applyValues = async () => {
    const inst = (window as any).__formPrefillInstance;
    if (!inst) return;

    // Build a single values object for setFormFieldValues
    const formValues: Record<string, string | string[]> = {};
    let filled = 0;

    // Text fields
    for (const field of textFields) {
      const matchingKey = Object.keys(fieldValues).find((key) =>
        field.name.toLowerCase().includes(key.toLowerCase()),
      );
      if (matchingKey && fieldValues[matchingKey]) {
        formValues[field.name] = fieldValues[matchingKey];
        filled++;
      }
    }

    // Checkbox groups: use "1" to check, "Off" to uncheck
    for (const group of CHECKBOX_GROUPS) {
      const selectedLabel = fieldValues[group.label] ?? "";
      const checkboxFields = fields.filter(
        (f) =>
          f.type === "checkbox" &&
          f.name.toLowerCase().endsWith(group.suffix.toLowerCase()),
      );

      for (const cbField of checkboxFields) {
        const matchingOption = group.options.find((opt) =>
          cbField.name.toLowerCase().includes(opt.prefix.toLowerCase()),
        );
        const shouldCheck = matchingOption?.label === selectedLabel;
        formValues[cbField.name] = shouldCheck ? ["Yes"] : [];
        if (shouldCheck) filled++;
      }
    }

    try {
      await inst.setFormFieldValues(formValues);
    } catch (error) {
      console.error("Error applying form values:", error);
    }

    setFilledCount(filled);
  };

  const handleApplyPreset = (presetName: string) => {
    const values = PRESETS[presetName];
    if (!values) return;
    const updated: Record<string, string> = { ...fieldValues };

    // Fill text fields
    for (const field of textFields) {
      const matchingKey = Object.keys(values).find((key) =>
        field.name.toLowerCase().includes(key.toLowerCase()),
      );
      if (matchingKey && values[matchingKey]) {
        updated[field.name] = values[matchingKey];
      }
    }

    // Fill group dropdowns
    for (const group of CHECKBOX_GROUPS) {
      const presetKey = Object.keys(values).find(
        (k) => k.toLowerCase() === group.label.toLowerCase().replace(/\s+/g, ""),
      );
      if (presetKey && values[presetKey]) {
        updated[group.label] = values[presetKey];
      }
    }

    setFieldValues(updated);
    setFilledCount(0);
  };

  const handleUpdateField = (fieldName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleApplyAll = () => {
    applyValues();
  };

  const handleClearAll = async () => {
    const inst = (window as any).__formPrefillInstance;
    if (!inst) return;

    const formValues: Record<string, string | string[]> = {};
    for (const field of fields) {
      formValues[field.name] = field.type === "checkbox" ? [] : "";
    }

    try {
      await inst.setFormFieldValues(formValues);
    } catch {
      // Some fields may not be clearable
    }

    // Reset sidebar values
    const cleared: Record<string, string> = {};
    for (const field of textFields) {
      cleared[field.name] = "";
    }
    for (const group of CHECKBOX_GROUPS) {
      cleared[group.label] = "";
    }
    setFieldValues(cleared);
    setFilledCount(0);
  };

  // Derive a friendly label from the field name (e.g. "firstName_firstName" → "First Name")
  const friendlyLabel = (name: string): string => {
    const parts = name.split("_");
    const base = parts[parts.length - 1];
    return base
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Form Data Pre-Fill"
        description="Programmatically populate PDF form fields from JSON data. Load preset data profiles or edit individual fields, then apply values to the form."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              {/* Presets */}
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Data Presets
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PRESETS).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleApplyPreset(name)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer border-[var(--digital-pollen)] text-gray-800 dark:text-[var(--digital-pollen)] bg-transparent hover:bg-[var(--digital-pollen)] hover:text-[var(--black)]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {filledCount > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Filled {filledCount} field{filledCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Field list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {fields.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                    Discovering form fields...
                  </p>
                ) : (
                  <>
                    {textFields.map((field) => (
                      <div key={field.name}>
                        <label
                          htmlFor={`ff-${field.name}`}
                          className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                        >
                          {friendlyLabel(field.name)}
                        </label>
                        <input
                          id={`ff-${field.name}`}
                          type="text"
                          value={fieldValues[field.name] ?? ""}
                          onChange={(e) =>
                            handleUpdateField(field.name, e.target.value)
                          }
                          placeholder={field.name}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
                        />
                      </div>
                    ))}
                    {CHECKBOX_GROUPS.map((group) => (
                      <div key={group.label}>
                        <label
                          htmlFor={`ff-${group.label}`}
                          className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                        >
                          {group.label}
                        </label>
                        <select
                          id={`ff-${group.label}`}
                          value={fieldValues[group.label] ?? ""}
                          onChange={(e) =>
                            handleUpdateField(group.label, e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
                        >
                          <option value="">— Select —</option>
                          {group.options.map((opt) => (
                            <option key={opt.label} value={opt.label}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Actions */}
              {fields.length > 0 && (
                <div className="p-4 border-t border-[var(--warm-gray-400)] flex gap-2">
                  <button
                    type="button"
                    onClick={handleApplyAll}
                    className="flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    style={{
                      background: "var(--digital-pollen)",
                      color: "var(--black)",
                    }}
                  >
                    Apply All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    style={{
                      color: "var(--digital-pollen)",
                      border: "1px solid var(--digital-pollen)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--digital-pollen)";
                      e.currentTarget.style.color = "var(--black)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--digital-pollen)";
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer onFieldsDiscovered={handleFieldsDiscovered} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
