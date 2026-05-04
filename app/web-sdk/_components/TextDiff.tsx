"use client";

import { useMemo, useRef, useState } from "react";

interface TextDiffProps {
  text1: string;
  text2: string;
}

interface DiffResult {
  type: "equal" | "insert" | "delete" | "replace";
  text: string;
  id: number;
}

interface ChangeItem {
  id: number;
  type: "inserted" | "deleted" | "replaced";
  preview: string;
  diffIndex: number;
}

// Normalize text to handle invisible character differences
function normalizeText(text: string): string {
  return (
    text
      // Normalize unicode
      .normalize("NFKC")
      // Replace various types of whitespace with standard space
      .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
      // Replace multiple spaces with single space
      .replace(/\s+/g, " ")
  );
}

// Simple word-based diff algorithm
function computeDiff(text1: string, text2: string): DiffResult[] {
  // Normalize texts first
  const normalizedText1 = normalizeText(text1);
  const normalizedText2 = normalizeText(text2);

  // Split texts into words and punctuation, preserving both whitespace and punctuation
  // This regex splits on whitespace and captures: whitespace, words, and punctuation separately
  const words1 = normalizedText1.split(/(\s+|[.,!?;:()[\]{}'"—–-])/);
  const words2 = normalizedText2.split(/(\s+|[.,!?;:()[\]{}'"—–-])/);

  // Filter out empty strings
  const filteredWords1 = words1.filter((w) => w.length > 0);
  const filteredWords2 = words2.filter((w) => w.length > 0);

  // Use a simple LCS-based diff algorithm
  const diff = lcs(filteredWords1, filteredWords2);
  return diff;
}

// Longest Common Subsequence based diff
function lcs(arr1: string[], arr2: string[]): DiffResult[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  // Build LCS table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffResult[] = [];
  let i = m;
  let j = n;
  let id = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
      result.unshift({ type: "equal", text: arr1[i - 1], id: id++ });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "insert", text: arr2[j - 1], id: id++ });
      j--;
    } else if (i > 0) {
      result.unshift({ type: "delete", text: arr1[i - 1], id: id++ });
      i--;
    }
  }

  return result;
}

// Group consecutive diff items and detect replacements
function groupDiffs(diffs: DiffResult[]): DiffResult[] {
  if (diffs.length === 0) return [];

  const grouped: DiffResult[] = [];
  let i = 0;

  while (i < diffs.length) {
    const current = diffs[i];

    // Check if this is a delete followed by an insert (potential replacement)
    // Only treat as replacement if they're both non-whitespace and similar length
    if (
      current.type === "delete" &&
      i + 1 < diffs.length &&
      diffs[i + 1].type === "insert"
    ) {
      const deleteText = current.text.trim();
      const insertText = diffs[i + 1].text.trim();

      // Only treat as replacement if:
      // 1. Both are non-empty (not just whitespace)
      // 2. They're similar in length (within 50% of each other)
      // 3. Neither contains only punctuation
      const lengthRatio =
        Math.max(deleteText.length, insertText.length) /
        Math.max(Math.min(deleteText.length, insertText.length), 1);
      const isReplacement =
        deleteText.length > 0 &&
        insertText.length > 0 &&
        lengthRatio <= 3 &&
        /[a-zA-Z0-9]/.test(deleteText) &&
        /[a-zA-Z0-9]/.test(insertText);

      if (isReplacement) {
        // Combine delete and insert into a replacement
        grouped.push({
          type: "replace",
          text: `${current.text}→${diffs[i + 1].text}`,
          id: current.id,
        });
        i += 2;
      } else {
        // Keep as separate delete and insert
        let text = current.text;
        let j = i + 1;
        while (j < diffs.length && diffs[j].type === current.type) {
          text += diffs[j].text;
          j++;
        }
        grouped.push({ ...current, text });
        i = j;
      }
    } else {
      // Group consecutive items of the same type
      let text = current.text;
      let j = i + 1;
      while (j < diffs.length && diffs[j].type === current.type) {
        text += diffs[j].text;
        j++;
      }
      grouped.push({ ...current, text });
      i = j;
    }
  }

  return grouped;
}

// Extract change items for sidebar
function extractChangeItems(diffs: DiffResult[]): ChangeItem[] {
  const items: ChangeItem[] = [];
  let changeCounter = 1;

  diffs.forEach((diff, index) => {
    if (diff.type === "insert") {
      const preview = diff.text.trim().slice(0, 50);
      items.push({
        id: changeCounter++,
        type: "inserted",
        preview: preview || "(whitespace)",
        diffIndex: index,
      });
    } else if (diff.type === "delete") {
      const preview = diff.text.trim().slice(0, 50);
      items.push({
        id: changeCounter++,
        type: "deleted",
        preview: preview || "(whitespace)",
        diffIndex: index,
      });
    } else if (diff.type === "replace") {
      const [deleted, inserted] = diff.text.split("→");
      const preview = `${deleted.trim().slice(0, 25)} → ${inserted.trim().slice(0, 25)}`;
      items.push({
        id: changeCounter++,
        type: "replaced",
        preview: preview || "(whitespace)",
        diffIndex: index,
      });
    }
  });

  return items;
}

export default function TextDiff({ text1, text2 }: TextDiffProps) {
  const [highlightedChange, setHighlightedChange] = useState<number | null>(
    null,
  );
  const diffRefs = useRef<{ [key: number]: HTMLSpanElement | null }>({});

  const diffResult = useMemo(() => {
    const diff = computeDiff(text1, text2);
    return groupDiffs(diff);
  }, [text1, text2]);

  const changeItems = useMemo(() => {
    return extractChangeItems(diffResult);
  }, [diffResult]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let replacements = 0;
    let unchanged = 0;

    for (const item of diffResult) {
      const wordCount = item.text.trim().split(/\s+/).length;
      if (item.type === "insert") {
        additions += wordCount;
      } else if (item.type === "delete") {
        deletions += wordCount;
      } else if (item.type === "replace") {
        replacements += 1;
      } else {
        unchanged += wordCount;
      }
    }

    const total = additions + deletions + unchanged;
    const changedPercent =
      total > 0 ? ((additions + deletions) / total) * 100 : 0;

    return { additions, deletions, replacements, unchanged, changedPercent };
  }, [diffResult]);

  const handleChangeClick = (diffIndex: number) => {
    setHighlightedChange(diffIndex);
    const element = diffRefs.current[diffIndex];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Flash animation
      element.classList.add("ring-4", "ring-blue-400");
      setTimeout(() => {
        element.classList.remove("ring-4", "ring-blue-400");
      }, 2000);
    }
  };

  const handleDiffItemClick = (diffIndex: number) => {
    setHighlightedChange(diffIndex);
    // Scroll to the corresponding sidebar item
    const sidebarElement = document.getElementById(`change-item-${diffIndex}`);
    if (sidebarElement) {
      sidebarElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const categorizedChanges = useMemo(() => {
    return {
      inserted: changeItems.filter((item) => item.type === "inserted"),
      deleted: changeItems.filter((item) => item.type === "deleted"),
      replaced: changeItems.filter((item) => item.type === "replaced"),
    };
  }, [changeItems]);

  // Map each change type to a token-based accent color so we can drive
  // every per-type style (icon, badge, hover, active) from one source.
  const accentFor = (type: ChangeItem["type"]) =>
    type === "inserted"
      ? "var(--data-green)"
      : type === "deleted"
        ? "var(--code-coral)"
        : "var(--accent)";

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className="w-80 overflow-y-auto shrink-0"
        style={{
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div
          className="p-4"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="panel-section" style={{ paddingTop: 0, marginBottom: 12 }}>
            Changes
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-3)" }}>Total changes</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: "var(--ink)" }}
              >
                {changeItems.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-3)" }}>Inserted</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: "var(--data-green)" }}
              >
                {categorizedChanges.inserted.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-3)" }}>Deleted</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: "var(--code-coral)" }}
              >
                {categorizedChanges.deleted.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--ink-3)" }}>Replaced</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {categorizedChanges.replaced.length}
              </span>
            </div>
          </div>
        </div>

        {/* Sequential Changes List */}
        <div className="p-2">
          {changeItems.map((item) => {
            const accent = accentFor(item.type);
            const isActive = highlightedChange === item.diffIndex;
            const labelText =
              item.type === "inserted"
                ? "INSERTED"
                : item.type === "deleted"
                  ? "DELETED"
                  : "REPLACED";

            return (
              <button
                key={item.id}
                id={`change-item-${item.diffIndex}`}
                type="button"
                onClick={() => handleChangeClick(item.diffIndex)}
                className="w-full text-left px-3 py-2 mb-2 transition-all cursor-pointer"
                style={{
                  background: isActive
                    ? `color-mix(in srgb, ${accent} 14%, var(--bg-elev))`
                    : "var(--bg-elev)",
                  border: `1px solid ${
                    isActive
                      ? `color-mix(in srgb, ${accent} 50%, var(--line))`
                      : "var(--line)"
                  }`,
                  borderRadius: "var(--r-2)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = `color-mix(in srgb, ${accent} 8%, var(--bg-elev))`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-elev)";
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-xs font-mono font-medium tabular-nums shrink-0 mt-0.5"
                    style={{ color: "var(--ink-4)" }}
                  >
                    {item.id}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 font-mono tracking-wider"
                      style={{
                        background: `color-mix(in srgb, ${accent} 14%, var(--bg-elev))`,
                        color: accent,
                        border: `1px solid color-mix(in srgb, ${accent} 35%, var(--line))`,
                        borderRadius: "var(--r-pill)",
                        display: "inline-block",
                      }}
                    >
                      {labelText}
                    </span>
                    <p
                      className="text-xs truncate font-mono mt-1"
                      style={{ color: "var(--ink-2)" }}
                    >
                      {item.preview}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Statistics Bar */}
          <div
            className="mb-6 p-4"
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--ink)" }}
              >
                Change Summary
              </h3>
              <span className="text-sm" style={{ color: "var(--ink-3)" }}>
                {stats.changedPercent.toFixed(1)}% changed
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--data-green)" }}
                >
                  +{stats.additions}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  words added
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--code-coral)" }}
                >
                  -{stats.deletions}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  words removed
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {stats.replacements}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  replacements
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--ink-3)" }}
                >
                  {stats.unchanged}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  words unchanged
                </div>
              </div>
            </div>
          </div>

          {/* Unified Diff View */}
          <div
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
              overflow: "hidden",
            }}
          >
            <div
              className="px-4 py-2"
              style={{
                background: "var(--surface)",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--ink)" }}
              >
                Unified Comparison View
              </h3>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              {diffResult.map((item, index) => {
                if (item.type === "equal") {
                  return (
                    <span
                      key={index}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      {item.text}
                    </span>
                  );
                }
                if (item.type === "insert") {
                  return (
                    <span
                      key={index}
                      ref={(el) => {
                        diffRefs.current[index] = el;
                      }}
                      onClick={() => handleDiffItemClick(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleDiffItemClick(index);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-200 border-b-2 border-green-400 dark:border-green-600 px-0.5 transition-all cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/60"
                      title="Added text - Click to highlight in sidebar"
                    >
                      {item.text}
                    </span>
                  );
                }
                if (item.type === "delete") {
                  return (
                    <span
                      key={index}
                      ref={(el) => {
                        diffRefs.current[index] = el;
                      }}
                      onClick={() => handleDiffItemClick(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleDiffItemClick(index);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200 line-through border-b-2 border-red-400 dark:border-red-600 px-0.5 transition-all cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60"
                      title="Removed text - Click to highlight in sidebar"
                    >
                      {item.text}
                    </span>
                  );
                }
                if (item.type === "replace") {
                  const [deleted, inserted] = item.text.split("→");
                  return (
                    <span
                      key={index}
                      ref={(el) => {
                        diffRefs.current[index] = el;
                      }}
                      onClick={() => handleDiffItemClick(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleDiffItemClick(index);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="transition-all cursor-pointer"
                      title="Replaced text - Click to highlight in sidebar"
                    >
                      <span className="bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200 line-through border-b-2 border-red-400 dark:border-red-600 px-0.5 hover:bg-red-200 dark:hover:bg-red-900/60">
                        {deleted}
                      </span>
                      <span className="bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-200 border-b-2 border-green-400 dark:border-green-600 px-0.5 hover:bg-green-200 dark:hover:bg-green-900/60">
                        {inserted}
                      </span>
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(diffResult, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "comparison-results.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-sm btn-secondary"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => {
                let textOutput = `Document Comparison Report\n${"=".repeat(50)}\n\n`;
                textOutput += `Statistics:\n`;
                textOutput += `  Added: ${stats.additions} words\n`;
                textOutput += `  Removed: ${stats.deletions} words\n`;
                textOutput += `  Replaced: ${stats.replacements}\n`;
                textOutput += `  Unchanged: ${stats.unchanged} words\n`;
                textOutput += `  Changed: ${stats.changedPercent.toFixed(1)}%\n\n`;
                textOutput += `Detailed Changes:\n${"=".repeat(50)}\n\n`;

                for (const item of diffResult) {
                  if (item.type === "insert") {
                    textOutput += `[+] ${item.text}`;
                  } else if (item.type === "delete") {
                    textOutput += `[-] ${item.text}`;
                  } else if (item.type === "replace") {
                    const [deleted, inserted] = item.text.split("→");
                    textOutput += `[-] ${deleted}\n[+] ${inserted}`;
                  } else {
                    textOutput += item.text;
                  }
                }

                const blob = new Blob([textOutput], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "comparison-report.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-sm btn-secondary"
            >
              Export TXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
