"use client";

import type { DocAuthDocument } from "../../types";
import type { ReportFormState, ReportSection, MetricRow } from "../hooks/use-document-builder";
import ExportBar from "./export-bar";

interface ReportFormProps {
  formState: ReportFormState;
  onChange: (state: ReportFormState) => void;
  document: DocAuthDocument | null;
}

export default function ReportForm({
  formState,
  onChange,
  document,
}: ReportFormProps) {
  const updateField = <K extends keyof ReportFormState>(
    key: K,
    value: ReportFormState[K],
  ) => {
    onChange({ ...formState, [key]: value });
  };

  const updateSection = (index: number, updates: Partial<ReportSection>) => {
    const next = formState.sections.map((s, i) =>
      i === index ? { ...s, ...updates } : s,
    );
    updateField("sections", next);
  };

  const addSection = () => {
    updateField("sections", [
      ...formState.sections,
      { heading: "", body: "" },
    ]);
  };

  const removeSection = (index: number) => {
    updateField(
      "sections",
      formState.sections.filter((_, i) => i !== index),
    );
  };

  const updateMetric = (index: number, updates: Partial<MetricRow>) => {
    const next = formState.metrics.map((m, i) =>
      i === index ? { ...m, ...updates } : m,
    );
    updateField("metrics", next);
  };

  const addMetric = () => {
    updateField("metrics", [
      ...formState.metrics,
      { metric: "", value: "" },
    ]);
  };

  const removeMetric = (index: number) => {
    updateField(
      "metrics",
      formState.metrics.filter((_, i) => i !== index),
    );
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const textareaClass = `${inputClass} resize-none`;
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";
  const sectionTitleClass =
    "text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3";

  return (
    <div className="h-full flex flex-col overflow-y-auto p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-100 mb-1">
          Report Builder
        </h2>
        <p className="text-xs text-gray-400">
          Edit fields below to build your report. Changes update the document
          live.
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-3">
        <div className={sectionTitleClass}>Basic Information</div>
        <div>
          <label htmlFor="report-title" className={labelClass}>
            Report Title
          </label>
          <input
            id="report-title"
            type="text"
            value={formState.title}
            onChange={(e) => updateField("title", e.target.value)}
            className={inputClass}
            placeholder="Enter report title"
          />
        </div>
        <div>
          <label htmlFor="report-author" className={labelClass}>
            Author
          </label>
          <input
            id="report-author"
            type="text"
            value={formState.author}
            onChange={(e) => updateField("author", e.target.value)}
            className={inputClass}
            placeholder="Enter author name"
          />
        </div>
      </div>

      {/* Executive Summary */}
      <div className="space-y-3">
        <div className={sectionTitleClass}>Executive Summary</div>
        <div>
          <label htmlFor="report-summary" className={labelClass}>
            Summary
          </label>
          <textarea
            id="report-summary"
            value={formState.executiveSummary}
            onChange={(e) => updateField("executiveSummary", e.target.value)}
            className={textareaClass}
            rows={4}
            placeholder="Enter executive summary"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={sectionTitleClass}>Sections</div>
          <button
            type="button"
            onClick={addSection}
            className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            + Add Section
          </button>
        </div>
        {formState.sections.map((section, index) => (
          <div
            key={`section-${index}`}
            className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Section {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeSection(index)}
                className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={section.heading}
              onChange={(e) =>
                updateSection(index, { heading: e.target.value })
              }
              className={inputClass}
              placeholder="Section heading"
            />
            <textarea
              value={section.body}
              onChange={(e) =>
                updateSection(index, { body: e.target.value })
              }
              className={textareaClass}
              rows={3}
              placeholder="Section content"
            />
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={sectionTitleClass}>Key Metrics</div>
          <button
            type="button"
            onClick={addMetric}
            className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            + Add Row
          </button>
        </div>
        {formState.metrics.map((row, index) => (
          <div
            key={`metric-${index}`}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={row.metric}
              onChange={(e) =>
                updateMetric(index, { metric: e.target.value })
              }
              className={`${inputClass} flex-1`}
              placeholder="Metric name"
            />
            <input
              type="text"
              value={row.value}
              onChange={(e) =>
                updateMetric(index, { value: e.target.value })
              }
              className={`${inputClass} flex-1`}
              placeholder="Value"
            />
            <button
              type="button"
              onClick={() => removeMetric(index)}
              className="text-xs text-red-400 hover:text-red-300 flex-shrink-0 cursor-pointer"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Conclusion */}
      <div className="space-y-3">
        <div className={sectionTitleClass}>Conclusion</div>
        <div>
          <label htmlFor="report-conclusion" className={labelClass}>
            Conclusion
          </label>
          <textarea
            id="report-conclusion"
            value={formState.conclusion}
            onChange={(e) => updateField("conclusion", e.target.value)}
            className={textareaClass}
            rows={3}
            placeholder="Enter conclusion"
          />
        </div>
      </div>

      {/* Export */}
      <ExportBar document={document} />
    </div>
  );
}
