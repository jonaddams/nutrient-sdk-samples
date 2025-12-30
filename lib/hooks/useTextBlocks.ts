"use client";

import { useCallback, useState } from "react";
import type {
  ContentEditingSession,
  SDKTextBlock,
  TextBlock,
  UpdatedTextBlock,
} from "@/lib/types/nutrient";
import { createAppError, ErrorType } from "@/lib/utils/errorHandler";
import { measurePerformance } from "@/lib/utils/performanceMonitor";

/**
 * Hook for managing text blocks state and operations
 * Handles detection, selection, and updates of text blocks in PDF documents
 *
 * @returns Object containing text blocks state and management functions
 * @property {TextBlock[]} textBlocks - All detected text blocks in the document
 * @property {TextBlock[]} selectedBlocks - Currently selected text blocks
 * @property {number} selectedCount - Count of selected blocks
 * @property {boolean} isDetecting - Whether text detection is in progress
 * @property {string | null} error - Error message if operation failed
 * @property {Function} detectTextBlocks - Detect all text blocks across all pages
 * @property {Function} toggleBlockSelection - Toggle selection state of a block
 * @property {Function} clearSelection - Clear all selected blocks
 * @property {Function} clearTextBlocks - Clear all text blocks and selections
 * @property {Function} findAndReplace - Find and replace text across all blocks
 * @property {Function} applyTextBlockUpdates - Apply updates to text blocks state
 * @property {Function} clearError - Clear the error state
 *
 * @example
 * ```tsx
 * const {
 *   textBlocks,
 *   selectedBlocks,
 *   isDetecting,
 *   error,
 *   detectTextBlocks,
 *   toggleBlockSelection,
 *   findAndReplace,
 *   applyTextBlockUpdates,
 *   clearError
 * } = useTextBlocks();
 *
 * // Detect text blocks
 * try {
 *   await detectTextBlocks(session, totalPages);
 * } catch (err) {
 *   // Error is stored in error state
 * }
 *
 * // Toggle block selection
 * toggleBlockSelection(textBlock, true);
 *
 * // Find and replace
 * const { updates, count } = findAndReplace('old', 'new');
 * applyTextBlockUpdates(updates); // Apply changes to state
 * ```
 */
export function useTextBlocks() {
  const [textBlocks, setTextBlocks] = useState<
    (TextBlock & { pageIndex: number })[]
  >([]);
  const [selectedBlocks, setSelectedBlocks] = useState<
    (TextBlock & { pageIndex: number })[]
  >([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Detect all text blocks across all pages in the document
   * @param session - Active content editing session
   * @param totalPages - Total number of pages in the document
   * @returns Promise resolving to array of detected text blocks with page indices
   * @throws AppError if detection fails
   */
  const detectTextBlocks = useCallback(
    async (session: ContentEditingSession, totalPages: number) => {
      setIsDetecting(true);
      setError(null);
      try {
        const { result: allTextBlocks } = await measurePerformance(
          "detectTextBlocks",
          async () => {
            let blocks: (TextBlock & { pageIndex: number })[] = [];

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
              const pageTextBlocks = await session.getTextBlocks(pageIndex);
              const textBlocksWithPageIndex = pageTextBlocks.map(
                (tb: SDKTextBlock): TextBlock => ({ ...tb, pageIndex }),
              );
              blocks = blocks.concat(textBlocksWithPageIndex);
            }

            return blocks;
          },
          { totalPages, blocksFound: 0 },
          { warning: 2000, error: 10000 },
        );

        setTextBlocks(allTextBlocks);
        return allTextBlocks;
      } catch (err) {
        const appError = createAppError(ErrorType.TEXT_DETECTION, err, {
          operation: "detectTextBlocks",
          totalPages,
        });
        setError(appError.message);
        throw appError;
      } finally {
        setIsDetecting(false);
      }
    },
    [],
  );

  /**
   * Toggle selection state of a specific text block
   * @param textBlock - The text block to toggle
   * @param isSelected - Whether to select (true) or deselect (false) the block
   */
  const toggleBlockSelection = useCallback(
    (textBlock: TextBlock & { pageIndex: number }, isSelected: boolean) => {
      setSelectedBlocks((prevSelected) => {
        if (isSelected) {
          // Add if not already present
          const isAlreadySelected = prevSelected.some(
            (tb) => tb.id === textBlock.id,
          );
          return isAlreadySelected
            ? prevSelected
            : [...prevSelected, textBlock];
        } else {
          // Remove from selection
          return prevSelected.filter((tb) => tb.id !== textBlock.id);
        }
      });
    },
    [],
  );

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedBlocks([]);
  }, []);

  /**
   * Clear all text blocks
   */
  const clearTextBlocks = useCallback(() => {
    setTextBlocks([]);
    setSelectedBlocks([]);
    setError(null);
  }, []);

  /**
   * Find and replace text across all detected text blocks
   * Does not modify state - returns updates that should be applied
   * @param findText - Text to search for
   * @param replaceText - Text to replace with
   * @returns Object containing updates array and replacement count
   * @property {UpdatedTextBlock[]} updates - Array of text blocks to update
   * @property {number} count - Total number of replacements made
   */
  const findAndReplace = useCallback(
    (findText: string, replaceText: string) => {
      const updates: UpdatedTextBlock[] = [];
      let replacementCount = 0;

      for (const block of textBlocks) {
        const parts = block.text.split(findText);
        if (parts.length > 1) {
          // Text contains find string
          const newText = parts.join(replaceText);
          const occurrences = parts.length - 1;
          replacementCount += occurrences;

          updates.push({
            id: block.id,
            text: newText,
          });
        }
      }

      return { updates, count: replacementCount };
    },
    [textBlocks],
  );

  /**
   * Apply text block updates to state
   * Call this after successful SDK updateTextBlocks operation
   * @param updates - Array of text block updates to apply
   */
  const applyTextBlockUpdates = useCallback((updates: UpdatedTextBlock[]) => {
    setTextBlocks((prev) =>
      prev.map((block) => {
        const update = updates.find((u) => u.id === block.id);
        return update && update.text !== undefined
          ? { ...block, text: update.text }
          : block;
      }),
    );
  }, []);

  return {
    textBlocks,
    selectedBlocks,
    selectedCount: selectedBlocks.length,
    isDetecting,
    error,
    detectTextBlocks,
    toggleBlockSelection,
    clearSelection,
    clearTextBlocks,
    findAndReplace,
    applyTextBlockUpdates,
    clearError,
  };
}
