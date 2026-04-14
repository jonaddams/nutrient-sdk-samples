"use client";

import { useState } from "react";
import {
  VARIABLE_CATEGORIES,
  type TemplateVariable,
  type VariableCategory,
} from "../data/variables";

interface VariableSidebarProps {
  onInsert: (variable: TemplateVariable) => void;
  lastInserted: string | null;
}

export default function VariableSidebar({
  onInsert,
  lastInserted,
}: VariableSidebarProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(VARIABLE_CATEGORIES.map((c) => c.name)),
  );

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Filter categories and variables by search term
  const filteredCategories: VariableCategory[] = VARIABLE_CATEGORIES.map(
    (cat) => ({
      ...cat,
      variables: cat.variables.filter(
        (v) =>
          v.label.toLowerCase().includes(search.toLowerCase()) ||
          v.token.toLowerCase().includes(search.toLowerCase()),
      ),
    }),
  ).filter((cat) => cat.variables.length > 0);

  const inputClass =
    "w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="h-full flex flex-col overflow-hidden p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-100 mb-1">
          Template Variables
        </h2>
        <p className="text-xs text-gray-400">
          Click a variable to insert it at the cursor position in the document.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
          placeholder="Search variables..."
        />
      </div>

      {/* Insertion feedback */}
      {lastInserted && (
        <div className="mb-3 px-3 py-2 bg-green-900/40 border border-green-700 rounded-md text-xs text-green-300">
          Inserted <code className="font-mono">{`{{${lastInserted}}}`}</code>
        </div>
      )}

      {/* Variable categories */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filteredCategories.length === 0 && (
          <p className="text-xs text-gray-500 py-4 text-center">
            No variables match &ldquo;{search}&rdquo;
          </p>
        )}
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          return (
            <div key={category.name}>
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider hover:bg-gray-800 rounded cursor-pointer"
              >
                <span>{category.name}</span>
                <span className="text-gray-500 text-[10px]">
                  {isExpanded ? "\u2212" : "+"}
                </span>
              </button>

              {/* Variable list */}
              {isExpanded && (
                <div className="space-y-1 pb-2">
                  {category.variables.map((variable) => (
                    <button
                      key={variable.token}
                      type="button"
                      onClick={() => onInsert(variable)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700/60 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-200 group-hover:text-white">
                          {variable.label}
                        </span>
                      </div>
                      <code className="text-[11px] text-gray-500 font-mono group-hover:text-gray-400">
                        {`{{${variable.token}}}`}
                      </code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
