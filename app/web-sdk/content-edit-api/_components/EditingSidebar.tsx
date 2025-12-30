"use client";

import { Edit3, FileText, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface EditingSidebarProps {
  isEditing: boolean;
  selectedCount: number;
  isContentEditing: boolean;
  onDetectTextClick: () => void;
  onFindReplaceClick: () => void;
  onRewordClick: () => void;
  onContentEditClick: () => void;
}

export function EditingSidebar({
  isEditing,
  selectedCount,
  isContentEditing,
  onDetectTextClick,
  onFindReplaceClick,
  onRewordClick,
  onContentEditClick,
}: EditingSidebarProps) {
  const [showStats, setShowStats] = useState(false);
  const [currentSelectedCount, setCurrentSelectedCount] =
    useState(selectedCount);

  useEffect(() => {
    setCurrentSelectedCount(selectedCount);
    setShowStats(selectedCount > 0);
  }, [selectedCount]);

  return (
    <aside className="w-80 border-l border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414] p-6 overflow-y-auto">
      <h2 className="text-xl font-bold mb-6">Content Editing Tools</h2>

      <div className="space-y-4">
        {/* Detect Text Button */}
        <button
          onClick={onDetectTextClick}
          className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
            isEditing
              ? "border-[var(--digital-pollen)] bg-[var(--digital-pollen)]/10"
              : "border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)]"
          }`}
        >
          <FileText className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <div className="font-semibold">
              {isEditing ? "Exit Detection Mode" : "Detect Text"}
            </div>
            <div className="text-sm text-[var(--warm-gray-600)]">
              {isEditing
                ? "Click to stop detecting text blocks"
                : "Identify text blocks in the document"}
            </div>
          </div>
        </button>

        {/* Find & Replace Button */}
        <button
          onClick={onFindReplaceClick}
          disabled={!isEditing}
          className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <div className="font-semibold">Find & Replace</div>
            <div className="text-sm text-[var(--warm-gray-600)]">
              Search and replace text across the document
            </div>
          </div>
        </button>

        {/* Reword with AI Button */}
        <button
          onClick={onRewordClick}
          disabled={currentSelectedCount === 0}
          className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <div className="font-semibold">Reword with AI</div>
            <div className="text-sm text-[var(--warm-gray-600)]">
              Use AI to generate new text for selected blocks
            </div>
          </div>
        </button>

        {/* Content Editor Mode Button */}
        <button
          onClick={onContentEditClick}
          disabled={!isEditing}
          className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isContentEditing
              ? "border-[var(--digital-pollen)] bg-[var(--digital-pollen)]/10"
              : "border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)]"
          }`}
        >
          <Edit3 className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <div className="font-semibold">
              {isContentEditing ? "Exit Editor Mode" : "Edit Text"}
            </div>
            <div className="text-sm text-[var(--warm-gray-600)]">
              {isContentEditing
                ? "Click to exit editing mode"
                : "Enter interactive editing mode"}
            </div>
          </div>
        </button>

        {/* Stats Display */}
        {showStats && (
          <div className="mt-6 p-4 bg-[var(--warm-gray-100)] dark:bg-[var(--warm-gray-900)] rounded-lg">
            <div className="text-sm font-semibold mb-1">Selected Blocks</div>
            <div className="text-2xl font-bold text-[var(--digital-pollen)]">
              {currentSelectedCount}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-2 !text-sm">How to use:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside text-[var(--warm-gray-600)]">
            <li>Click "Detect Text" to identify text blocks</li>
            <li>Click on text blocks to select them (turns red)</li>
            <li>Use tools to modify selected blocks</li>
            <li>Click "Detect Text" again to save changes</li>
          </ol>
        </div>
      </div>
    </aside>
  );
}
