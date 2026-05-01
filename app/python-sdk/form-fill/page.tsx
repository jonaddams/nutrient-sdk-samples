"use client";

import { useCallback, useEffect, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_FORM = {
  label: "Account Registration Form",
  path: "/documents/account-registration-form.pdf",
  filename: "account-registration-form.pdf",
};

/** Known options for special fields in the sample form */
const FIELD_OPTIONS: Record<string, string[]> = {
  account_type: ["Personal", "Business", "Enterprise"],
  country: [
    "United States",
    "Canada",
    "United Kingdom",
    "Germany",
    "France",
    "Australia",
    "Japan",
  ],
  interests: ["Technology", "Science", "Finance", "Healthcare", "Education"],
};

const PRESET: Record<string, string> = {
  full_name: "Jane Smith",
  email: "jane@example.com",
  phone: "(555) 123-4567",
  date_of_birth: "03/15/1990",
  username: "janesmith",
  password: "secure123",
  confirm_password: "secure123",
  account_type: "Personal",
  company_name: "Acme Corp",
  country: "United States",
  interests: "Technology",
  terms_agree: "Yes",
  newsletter: "Yes",
};

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

interface FormField {
  name: string;
  type: string;
  fieldType: string;
  widgetCount: number;
}

/** Fields to hide from UI */
const HIDDEN_FIELDS = new Set(["submit", "signature"]);

export default function FormFillPage() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load form fields on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingFields(true);

    (async () => {
      try {
        const res = await fetch(SAMPLE_FORM.path);
        const blob = await res.blob();
        const file = new File([blob], SAMPLE_FORM.filename);

        const formData = new FormData();
        formData.append("file", file);

        const apiRes = await fetch(`${API_BASE}/api/forms/list-fields`, {
          method: "POST",
          body: formData,
        });

        if (!apiRes.ok) throw new Error(`API returned ${apiRes.status}`);

        const data: FormField[] = await apiRes.json();
        if (!cancelled) {
          setFields(data);
          const initial: Record<string, string> = {};
          for (const f of data) initial[f.name] = "";
          setValues(initial);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load fields",
          );
        }
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePreset = useCallback(() => {
    setValues((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(PRESET)) {
        if (k in next) next[k] = v;
      }
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setValues((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = "";
      return next;
    });
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  const handleFill = async () => {
    setProcessing(true);
    setError(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      const res = await fetch(SAMPLE_FORM.path);
      const blob = await res.blob();
      const file = new File([blob], SAMPLE_FORM.filename);

      const nonEmpty: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v) nonEmpty[k] = v;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("values", JSON.stringify(nonEmpty));

      const apiRes = await fetch(`${API_BASE}/api/forms/fill-fields`, {
        method: "POST",
        body: formData,
      });

      if (!apiRes.ok) throw new Error(`API returned ${apiRes.status}`);

      const pdfBlob = await apiRes.blob();
      setPdfUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Form fill failed");
    } finally {
      setProcessing(false);
    }
  };

  const editableFields = fields.filter((f) => !HIDDEN_FIELDS.has(f.name));
  const filledCount = editableFields.filter((f) => values[f.name]).length;
  const viewerDocument = pdfUrl || SAMPLE_FORM.path;

  const updateValue = (name: string, val: string) =>
    setValues((prev) => ({ ...prev, [name]: val }));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="PDF Form Fill"
        description="Programmatically fill PDF form fields with data using the Nutrient Python SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Form Fields */}
            <div className="w-96 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Form Fields
                  {fields.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {filledCount}/{editableFields.length} filled
                    </span>
                  )}
                </h3>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handlePreset}
                    className="px-2 py-1 text-[10px] font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    Load Sample
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-1 text-[10px] font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingFields && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Loading form fields...
                  </p>
                )}

                {editableFields.map((field) => {
                  const label = field.name.replace(/_/g, " ");
                  const options = FIELD_OPTIONS[field.name];

                  // Checkbox
                  if (field.fieldType === "checkbox") {
                    return (
                      <label
                        key={field.name}
                        className="flex items-center gap-2 py-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={values[field.name] === "Yes"}
                          onChange={(e) =>
                            updateValue(
                              field.name,
                              e.target.checked ? "Yes" : "",
                            )
                          }
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-[var(--digital-pollen)]"
                        />
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 capitalize">
                          {label}
                        </span>
                      </label>
                    );
                  }

                  // Radio buttons
                  if (field.fieldType === "radio" && options) {
                    return (
                      <fieldset key={field.name}>
                        <legend className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1.5 capitalize">
                          {label}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt) => (
                            <label
                              key={opt}
                              className="flex items-center gap-1.5 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={field.name}
                                checked={values[field.name] === opt}
                                onChange={() => updateValue(field.name, opt)}
                                className="w-3.5 h-3.5 accent-[var(--digital-pollen)]"
                              />
                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                {opt}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  }

                  // Combobox / dropdown
                  if (field.fieldType === "combobox" && options) {
                    return (
                      <div key={field.name}>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                          {label}
                        </label>
                        <select
                          value={values[field.name] || ""}
                          onChange={(e) =>
                            updateValue(field.name, e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1414] text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select...</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  // Listbox / multi-select (rendered as dropdown for simplicity)
                  if (field.fieldType === "listbox" && options) {
                    return (
                      <div key={field.name}>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                          {label}
                        </label>
                        <select
                          value={values[field.name] || ""}
                          onChange={(e) =>
                            updateValue(field.name, e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1414] text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select...</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  // Default: text input
                  return (
                    <div key={field.name}>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                        {label}
                      </label>
                      <input
                        type={
                          field.name.includes("password") ? "password" : "text"
                        }
                        value={values[field.name] || ""}
                        onChange={(e) =>
                          updateValue(field.name, e.target.value)
                        }
                        placeholder={label}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1414] text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[var(--warm-gray-400)] space-y-2">
                <button
                  type="button"
                  onClick={handleFill}
                  disabled={processing || filledCount === 0}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Filling..." : "Fill Form & Generate PDF"}
                </button>

                {pdfUrl && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const a = window.document.createElement("a");
                        a.href = pdfUrl;
                        a.download = "filled-form.pdf";
                        a.click();
                      }}
                      className="flex-1 px-4 py-2 text-xs font-semibold rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(pdfUrl);
                        setPdfUrl(null);
                      }}
                      className="flex-1 px-4 py-2 text-xs font-semibold rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Back to Blank
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md text-red-700 dark:text-red-300 text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-900/70 text-white">
                {pdfUrl ? "Filled PDF" : "Blank Form"}
              </div>

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Filling form fields...
                    </p>
                  </div>
                </div>
              )}

              <PdfViewer
                document={viewerDocument}
                toolbarItems={TOOLBAR_ITEMS}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
