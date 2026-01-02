"use client";

import { useMemo } from "react";

interface FormattedComparisonProps {
  html1: string;
  html2: string;
}

interface Block {
  type: "equal" | "insert" | "delete" | "replace";
  html: string;
}

export default function FormattedComparison({
  html1,
  html2,
}: FormattedComparisonProps) {
  const { blocks1, blocks2, stats } = useMemo(() => {
    return compareHtmlBlocks(html1, html2);
  }, [html1, html2]);

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
              <HtmlBlock key={`doc1-${idx}-${block.type}`} block={block} />
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
              <HtmlBlock key={`doc2-${idx}-${block.type}`} block={block} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HtmlBlock({ block }: { block: Block }) {
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
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized HTML from Nutrient API
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    </div>
  );
}

function compareHtmlBlocks(
  html1: string,
  html2: string,
): {
  blocks1: Block[];
  blocks2: Block[];
  stats: { insertions: number; deletions: number; replacements: number };
} {
  // Extract only the body content, ignoring head/style/script tags
  const bodyContent1 = extractBodyContent(html1);
  const bodyContent2 = extractBodyContent(html2);

  // Split HTML into block-level elements (p, div, h1-h6, li, etc.)
  const blockRegex = /<(p|div|h[1-6]|li|blockquote)[^>]*>[\s\S]*?<\/\1>/gi;
  const rawBlocks1 = bodyContent1.match(blockRegex) || [];
  const rawBlocks2 = bodyContent2.match(blockRegex) || [];

  // Filter out blocks with no text content and normalize
  // Keep original HTML for display but create normalized versions for comparison
  const blocks1 = rawBlocks1
    .map((block) => block.trim())
    .filter((block) => {
      const text = stripHtmlTags(block).trim();
      return text.length > 0;
    });

  const blocks2 = rawBlocks2
    .map((block) => block.trim())
    .filter((block) => {
      const text = stripHtmlTags(block).trim();
      return text.length > 0;
    });

  // Note: Normalization function exists but is currently unused since we compare
  // based on text content only via stripHtmlTags(). Kept for potential future use.

  // If either document has no blocks, return empty results
  if (blocks1.length === 0 && blocks2.length === 0) {
    return {
      blocks1: [],
      blocks2: [],
      stats: { insertions: 0, deletions: 0, replacements: 0 },
    };
  }

  const result1: Block[] = [];
  const result2: Block[] = [];
  let insertions = 0;
  let deletions = 0;
  let replacements = 0;

  // Build a diff using dynamic programming (LCS)
  const n = blocks1.length;
  const m = blocks2.length;
  const dp: number[][] = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(0));

  // Extract text content for comparison (most reliable)
  const textBlocks1 = blocks1.map((block) => stripHtmlTags(block).trim());
  const textBlocks2 = blocks2.map((block) => stripHtmlTags(block).trim());

  // Compute LCS length by comparing text content only
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (textBlocks1[i - 1] === textBlocks2[j - 1]) {
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
    if (i > 0 && j > 0) {
      // Compare using text content only
      if (textBlocks1[i - 1] === textBlocks2[j - 1]) {
        alignment.unshift({
          type: "equal",
          block1: blocks1[i - 1], // Use original for display
          block2: blocks2[j - 1], // Use original for display
        });
        i--;
        j--;
        continue;
      }
    }

    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
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
          html: curr.block1,
        });
        result2.push({
          type: "replace",
          html: nextBlock,
        });
        replacements++;
      }
      k++; // Skip next insert
    } else if (curr.type === "equal" && curr.block1 && curr.block2) {
      result1.push({ type: "equal", html: curr.block1 });
      result2.push({ type: "equal", html: curr.block2 });
    } else if (curr.type === "delete" && curr.block1) {
      result1.push({ type: "delete", html: curr.block1 });
      deletions++;
    } else if (curr.type === "insert" && curr.block2) {
      result2.push({ type: "insert", html: curr.block2 });
      insertions++;
    }
  }

  return {
    blocks1: result1,
    blocks2: result2,
    stats: { insertions, deletions, replacements },
  };
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractBodyContent(html: string): string {
  // Extract content between <body> and </body> tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  // If no body tag found, return the whole HTML
  return html;
}

// Currently unused but kept for potential future enhancements
// biome-ignore lint/correctness/noUnusedVariables: Kept for future use
function normalizeHtmlForComparison(html: string): string {
  return (
    html
      // Remove all <span> tags (opening and closing) with their attributes
      .replace(/<span[^>]*>/g, "")
      .replace(/<\/span>/g, "")
      // Remove all <div> tags (opening and closing) with their attributes
      .replace(/<div[^>]*>/g, "")
      .replace(/<\/div>/g, "")
      // Remove all id attributes
      .replace(/\s+id="[^"]*"/g, "")
      // Remove all class attributes
      .replace(/\s+class="[^"]*"/g, "")
      // Remove style attributes
      .replace(/\s+style="[^"]*"/g, "")
      // Remove data- attributes
      .replace(/\s+data-[^"]*="[^"]*"/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}
