"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
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
    signatureDate: new Date().toLocaleDateString("en-US"),
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
    signatureDate: new Date().toLocaleDateString("en-US"),
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

  // Logical display order for text fields (by keyword in field name)
  const FIELD_ORDER = [
    "firstName",
    "lastName",
    "middleName",
    "dateOfBirth",
    "ssn",
    "address",
    "city",
    "state",
    "zipCode",
    "phone",
    "email",
    "employer",
    "occupation",
    "signatureDate",
  ];

  // Check if a field belongs to a checkbox group
  const isGroupedCheckbox = (field: FormFieldInfo): boolean => {
    if (field.type !== "checkbox") return false;
    return CHECKBOX_GROUPS.some((g) =>
      field.name.toLowerCase().endsWith(g.suffix.toLowerCase()),
    );
  };

  // Non-checkbox fields for sidebar display, sorted by logical order
  const textFields = fields
    .filter((f) => !isGroupedCheckbox(f) && f.type !== "checkbox")
    .sort((a, b) => {
      const aIdx = FIELD_ORDER.findIndex((k) =>
        a.name.toLowerCase().includes(k.toLowerCase()),
      );
      const bIdx = FIELD_ORDER.findIndex((k) =>
        b.name.toLowerCase().includes(k.toLowerCase()),
      );
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

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
        (k) =>
          k.toLowerCase() === group.label.toLowerCase().replace(/\s+/g, ""),
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "var(--text-xs)",
    color: "var(--ink-3)",
    marginBottom: 4,
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-elev)",
    color: "var(--ink)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-2)",
  };

  const sidebar = (
    <>
      {/* Presets */}
      <div
        className="p-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Data Presets
        </h3>
        <div className="flex flex-wrap gap-2 pt-3">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleApplyPreset(name)}
              className="btn ghost btn-sm"
            >
              {name}
            </button>
          ))}
        </div>
        {filledCount > 0 && (
          <p className="text-xs mt-2" style={{ color: "var(--ink-3)" }}>
            Filled {filledCount} field{filledCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {fields.length === 0 ? (
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--ink-4)" }}
          >
            Discovering form fields...
          </p>
        ) : (
          <>
            {textFields.map((field) => (
              <div key={field.name}>
                <label htmlFor={`ff-${field.name}`} style={labelStyle}>
                  {friendlyLabel(field.name)}
                </label>
                <input
                  id={`ff-${field.name}`}
                  type="text"
                  value={fieldValues[field.name] ?? ""}
                  onChange={(e) =>
                    handleUpdateField(field.name, e.target.value)
                  }
                  className="w-full px-2 py-1.5 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            ))}
            {CHECKBOX_GROUPS.map((group) => (
              <div key={group.label}>
                <label htmlFor={`ff-${group.label}`} style={labelStyle}>
                  {group.label}
                </label>
                <select
                  id={`ff-${group.label}`}
                  value={fieldValues[group.label] ?? ""}
                  onChange={(e) =>
                    handleUpdateField(group.label, e.target.value)
                  }
                  className="w-full px-2 py-1.5 text-sm focus:outline-none"
                  style={inputStyle}
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
        <div
          className="p-4 flex gap-2"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <button
            type="button"
            onClick={handleApplyAll}
            className="btn btn-sm flex-1"
          >
            Apply All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="btn ghost btn-sm"
          >
            Clear All
          </button>
        </div>
      )}
    </>
  );

  return (
    <SampleFrame
      title="Form Data Pre-Fill"
      description="Programmatically populate PDF form fields from JSON data. Load preset data profiles or edit individual fields, then apply values to the form."
      sidebar={sidebar}
      sidebarSide="left"
    >
      <Viewer onFieldsDiscovered={handleFieldsDiscovered} />
    </SampleFrame>
  );
}
