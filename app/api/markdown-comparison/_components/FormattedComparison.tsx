"use client";

import { useMemo } from "react";

interface FormattedComparisonProps {
  markdown1: string;
  markdown2: string;
}

interface Block {
  type: "equal" | "insert" | "delete" | "replace";
  content: string;
  oldContent?: string;
}

export default function FormattedComparison({
  markdown1,
  markdown2,
}: FormattedComparisonProps) {
  const { blocks1, blocks2, stats } = useMemo(() => {
    return compareMarkdownBlocks(markdown1, markdown2);
  }, [markdown1, markdown2]);

  return (
    <div className="flex h-full">
      {/* Document 1 */}
      <div className="flex-1 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Original Document
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.deletions} deletions • {stats.replacements} replacements
          </p>
        </div>
        <div className="p-6 overflow-auto flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            {blocks1.map((block, idx) => (
              <MarkdownBlock key={`doc1-${idx}-${block.type}`} block={block} />
            ))}
          </div>
        </div>
      </div>

      {/* Document 2 */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Modified Document
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.insertions} insertions • {stats.replacements} replacements
          </p>
        </div>
        <div className="p-6 overflow-auto flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            {blocks2.map((block, idx) => (
              <MarkdownBlock key={`doc2-${idx}-${block.type}`} block={block} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownBlock({ block }: { block: Block }) {
  const baseClasses = "p-3 rounded-md transition-colors";
  let colorClasses = "";

  switch (block.type) {
    case "delete":
      colorClasses = "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500";
      break;
    case "insert":
      colorClasses =
        "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500";
      break;
    case "replace":
      colorClasses =
        "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500";
      break;
    default:
      colorClasses = "bg-transparent";
  }

  return (
    <div className={`${baseClasses} ${colorClasses}`}>
      <MarkdownRenderer content={block.content} />
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  // Convert markdown to basic HTML-like rendering
  // Handle common markdown patterns
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold mb-2">
          {cleanMarkdown(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-bold mb-2">
          {cleanMarkdown(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-bold mb-2">
          {cleanMarkdown(line.slice(4))}
        </h3>,
      );
    }
    // List items
    else if (line.match(/^[\s]*[-*+]\s+/)) {
      elements.push(
        <li key={i} className="ml-4 list-disc">
          {cleanMarkdown(line.replace(/^[\s]*[-*+]\s+/, ""))}
        </li>,
      );
    }
    // Numbered lists
    else if (line.match(/^[\s]*\d+\.\s+/)) {
      elements.push(
        <li key={i} className="ml-4 list-decimal">
          {cleanMarkdown(line.replace(/^[\s]*\d+\.\s+/, ""))}
        </li>,
      );
    }
    // Empty lines
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraphs
    else if (line.trim()) {
      elements.push(
        <p key={i} className="mb-2 leading-relaxed">
          {cleanMarkdown(line)}
        </p>,
      );
    }
  }

  return <>{elements}</>;
}

function cleanMarkdown(text: string): string {
  return (
    text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      // Italic
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      // Links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
  );
}

function compareMarkdownBlocks(
  md1: string,
  md2: string,
): {
  blocks1: Block[];
  blocks2: Block[];
  stats: { insertions: number; deletions: number; replacements: number };
} {
  // Split into paragraphs/blocks
  const blocks1 = md1
    .split(/\n\n+/)
    .filter((b) => b.trim())
    .map((b) => b.trim());
  const blocks2 = md2
    .split(/\n\n+/)
    .filter((b) => b.trim())
    .map((b) => b.trim());

  const result1: Block[] = [];
  const result2: Block[] = [];
  let insertions = 0;
  let deletions = 0;
  let replacements = 0;

  // Build a diff using dynamic programming
  const n = blocks1.length;
  const m = blocks2.length;
  const dp: number[][] = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(0));

  // Compute LCS length
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (blocks1[i - 1] === blocks2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build aligned diff
  let i = n;
  let j = m;
  const alignment: Array<{
    type: "equal" | "replace" | "delete" | "insert";
    block1?: string;
    block2?: string;
  }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && blocks1[i - 1] === blocks2[j - 1]) {
      alignment.unshift({
        type: "equal",
        block1: blocks1[i - 1],
        block2: blocks2[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      alignment.unshift({
        type: "insert",
        block2: blocks2[j - 1],
      });
      j--;
    } else if (i > 0) {
      alignment.unshift({
        type: "delete",
        block1: blocks1[i - 1],
      });
      i--;
    }
  }

  // Group consecutive changes as replacements
  for (let k = 0; k < alignment.length; k++) {
    const curr = alignment[k];

    if (
      curr.type === "delete" &&
      k + 1 < alignment.length &&
      alignment[k + 1].type === "insert"
    ) {
      // This is a replacement
      const nextBlock = alignment[k + 1].block2;
      if (curr.block1 && nextBlock) {
        result1.push({
          type: "replace",
          content: curr.block1,
          oldContent: nextBlock,
        });
        result2.push({
          type: "replace",
          content: nextBlock,
          oldContent: curr.block1,
        });
        replacements++;
      }
      k++; // Skip next insert
    } else if (curr.type === "equal" && curr.block1 && curr.block2) {
      result1.push({ type: "equal", content: curr.block1 });
      result2.push({ type: "equal", content: curr.block2 });
    } else if (curr.type === "delete" && curr.block1) {
      result1.push({ type: "delete", content: curr.block1 });
      deletions++;
    } else if (curr.type === "insert" && curr.block2) {
      result2.push({ type: "insert", content: curr.block2 });
      insertions++;
    }
  }

  return {
    blocks1: result1,
    blocks2: result2,
    stats: { insertions, deletions, replacements },
  };
}
