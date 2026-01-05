"use client";

import type { ViewState } from "@nutrient-sdk/viewer";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

interface ViewerProps {
  document: string;
}

interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Anchor {
  x: number;
  y: number;
}

// Use TextBlock interface that matches PSPDFKit's content editing API
interface TextBlock {
  id: string;
  text: string;
  boundingBox: BoundingBox;
  anchor: Anchor;
  maxWidth: number;
}

interface UpdatedTextBlock {
  id: string;
  text?: string;
  anchor?: { x?: number; y?: number };
  maxWidth?: number;
}

interface ContentEditingSession {
  getTextBlocks(pageIndex: number): Promise<TextBlock[]>;
  updateTextBlocks(updates: UpdatedTextBlock[]): Promise<void>;
  commit(): Promise<void>;
  discard(): Promise<void>;
}

// Removed font loading for initial performance - can be added back later if needed

export default function Viewer({ document }: ViewerProps) {
  const containerRef = useRef(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Removed customFontsRef for initial performance
  const overlaysRef = useRef<string[]>([]);
  const textBlocksRef = useRef<(TextBlock & { pageIndex: number })[]>([]); // Store all text blocks for all pages
  const isEditingRef = useRef<boolean>(false);
  const selectedRef = useRef<(TextBlock & { pageIndex: number })[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const isContentEditingRef = useRef<boolean>(false);
  const activeSessionRef = useRef<ContentEditingSession | null>(null);
  const nutrientViewerRef = useRef<typeof window.NutrientViewer>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selected, setSelected] = useState<
    (TextBlock & { pageIndex: number })[]
  >([]); // Changed to store complete TextBlock objects with page info
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>("");
  const [replaceText, setReplaceText] = useState<string>("");
  const [replacementResult, setReplacementResult] = useState<string>("");
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [showStatsPopup, setShowStatsPopup] = useState<boolean>(false);
  const [statsMessage, setStatsMessage] = useState<string>("");
  const [isContentEditing, setIsContentEditing] = useState<boolean>(false);

  // Generate stable IDs for form elements
  const findInputId = useId();
  const replaceInputId = useId();

  // Keep refs in sync with state
  React.useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  React.useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  React.useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  React.useEffect(() => {
    isContentEditingRef.current = isContentEditing;
  }, [isContentEditing]);

  // Focus the find input when the dialog opens
  React.useEffect(() => {
    if (showFindReplace && findInputRef.current) {
      findInputRef.current.focus();
    }
  }, [showFindReplace]);

  const minimalToolbarItems = useMemo(
    () =>
      [
        { type: "zoom-out" },
        { type: "zoom-in" },
        { type: "zoom-mode" },
        { type: "search" },
      ] as const,
    [],
  );

  const handleContentBoxesPress = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_event: Event) => {
      console.log(
        "Content Boxes button pressed. Current isEditing state:",
        isEditing,
      );

      if (isProcessingRef.current) {
        console.log("Already processing, ignoring click");
        return;
      }

      setIsProcessing(true);

      try {
        if (isEditing) {
          // If already editing, clear overlays and exit editing mode
          console.log("Removing overlays and exiting editing mode");
          overlaysRef.current.forEach((overlayId) => {
            window.viewerInstance?.removeCustomOverlayItem(overlayId);
          });

          overlaysRef.current = [];
          textBlocksRef.current = [];
          setSelected([]);
          setIsEditing(false);

          // Discard the active session when exiting editing mode
          if (activeSessionRef.current) {
            try {
              await activeSessionRef.current.discard();
            } catch (cleanupError) {
              console.warn("Error discarding session on exit:", cleanupError);
            }
            activeSessionRef.current = null;
          }

          // Dispatch state change events (deferred to avoid React state update during render)
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("selectedBlocksChange", {
                detail: { selectedCount: 0 },
              }),
            );
            window.dispatchEvent(
              new CustomEvent("editingStateChange", {
                detail: { isEditing: false },
              }),
            );
          }, 0);
        } else {
          console.log("Starting editing mode");
          setIsEditing(true);

          // Dispatch editing state change event (deferred to avoid React state update during render)
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("editingStateChange", {
                detail: { isEditing: true },
              }),
            );
          }, 0);

          // First clean up any existing session
          if (activeSessionRef.current) {
            try {
              await activeSessionRef.current.discard();
            } catch (cleanupError) {
              console.warn("Error cleaning up previous session:", cleanupError);
            }
            activeSessionRef.current = null;
          }

          // Create a content editing session and keep it active during editing mode
          let session: ContentEditingSession;
          try {
            if (!window.viewerInstance) {
              throw new Error("Viewer instance not available");
            }
            session = await window.viewerInstance.beginContentEditingSession();
            activeSessionRef.current = session;
          } catch (sessionError) {
            console.error(
              "Error creating content editing session:",
              sessionError,
            );
            throw new Error(
              "Unable to start text detection. Please try again.",
            );
          }

          try {
            // loop through all pages in the document
            if (!window.viewerInstance) {
              throw new Error("Viewer instance not available");
            }
            const totalPages = window.viewerInstance.totalPageCount;
            let allTextBlocks: (TextBlock & { pageIndex: number })[] = [];

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
              const pageTextBlocks = await session.getTextBlocks(pageIndex);
              const textBlocksWithPageIndex = pageTextBlocks.map(
                (tb: TextBlock) => ({ ...tb, pageIndex }),
              );
              allTextBlocks = allTextBlocks.concat(textBlocksWithPageIndex);
            }

            textBlocksRef.current = allTextBlocks; // Store text blocks for later reference

            const newOverlays: string[] = [];

            allTextBlocks.forEach(
              (textBlock: TextBlock & { pageIndex: number }) => {
                const overlayDiv = window.document.createElement("div");
                overlayDiv.style.border = "2px solid blue"; // initial border color
                overlayDiv.style.backgroundColor = "transparent"; // transparent background
                overlayDiv.style.cursor = "pointer";
                overlayDiv.style.boxSizing = "border-box"; // Ensure border is included in dimensions
                overlayDiv.style.pointerEvents = "auto"; // Ensure click events work
                // Set dimensions - CustomOverlayItem should handle PDF->screen coordinate transformation
                overlayDiv.style.width = `${textBlock.boundingBox.width}px`;
                overlayDiv.style.height = `${textBlock.boundingBox.height}px`;
                // Ensure the overlay doesn't have absolute positioning
                overlayDiv.style.position = "relative";

                overlayDiv.addEventListener("click", () => {
                  // Toggle the border color.
                  const isCurrentlyBlue =
                    overlayDiv.style.borderColor === "blue" ||
                    overlayDiv.style.borderColor === "";
                  overlayDiv.style.borderColor = isCurrentlyBlue
                    ? "red"
                    : "blue";

                  setSelected((prevSelected) => {
                    let newSelected: (TextBlock & { pageIndex: number })[];
                    if (isCurrentlyBlue) {
                      // If changing to red, add the textBlock if it's not already present
                      const isAlreadySelected = prevSelected.some(
                        (tb) => tb.id === textBlock.id,
                      );
                      newSelected = isAlreadySelected
                        ? prevSelected
                        : [...prevSelected, textBlock];
                    } else {
                      // If changing to blue, remove the textBlock from the array
                      newSelected = prevSelected.filter(
                        (tb) => tb.id !== textBlock.id,
                      );
                    }

                    // Dispatch selected blocks change event (deferred to avoid React state update during render)
                    setTimeout(() => {
                      window.dispatchEvent(
                        new CustomEvent("selectedBlocksChange", {
                          detail: { selectedCount: newSelected.length },
                        }),
                      );
                    }, 0);

                    return newSelected;
                  });
                });

                const overlayId = `overlay-${textBlock.id}`;

                if (!window.viewerInstance || !nutrientViewerRef.current) {
                  console.error(
                    "Viewer instance or NutrientViewer not available",
                  );
                  return;
                }

                const NutrientViewer = nutrientViewerRef.current;

                // Create position as Point - CustomOverlayItem requires Point type
                const position = new NutrientViewer.Geometry.Point({
                  x: textBlock.boundingBox.left,
                  y: textBlock.boundingBox.top,
                });

                const item = new NutrientViewer.CustomOverlayItem({
                  id: overlayId,
                  node: overlayDiv,
                  pageIndex: textBlock.pageIndex,
                  position: position,
                });

                newOverlays.push(overlayId);
                window.viewerInstance.setCustomOverlayItem(item);
              },
            );

            overlaysRef.current = newOverlays;

            // Force the viewer to recalculate overlay positions after creation
            // This ensures overlays are correctly positioned after viewport changes
            const viewerContainer = containerRef.current as HTMLElement | null;
            if (viewerContainer) {
              const originalHeight = viewerContainer.style.height;
              viewerContainer.style.height = `${viewerContainer.offsetHeight + 1}px`;
              void viewerContainer.offsetHeight; // Force reflow
              viewerContainer.style.height = originalHeight || "";
            }

            // Wait for layout to settle
            await new Promise((resolve) =>
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              }),
            );

            // Keep the session active - don't discard it
          } catch (overlayError) {
            // If overlay creation fails, clean up the session
            console.error("Error creating overlays:", overlayError);
            if (activeSessionRef.current) {
              await activeSessionRef.current.discard();
              activeSessionRef.current = null;
            }
            throw overlayError;
          }
        }
      } catch (error) {
        console.error("Error in content editing:", error);
        setIsEditing(false);

        // Clean up any active session on error
        if (activeSessionRef.current) {
          try {
            await activeSessionRef.current.discard();
          } catch (cleanupError) {
            console.warn(
              "Error cleaning up session after error:",
              cleanupError,
            );
          }
          activeSessionRef.current = null;
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [isEditing],
  );

  // Create ref for stable function reference
  const handleContentBoxesPressRef = useRef(handleContentBoxesPress);

  // Update ref when function changes
  React.useEffect(() => {
    handleContentBoxesPressRef.current = handleContentBoxesPress;
  }, [handleContentBoxesPress]);

  // Add escape key listener for Detect Text mode
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isEditingRef.current) {
        console.log(
          "Escape key pressed, exiting Detect Text mode. Find Replace open:",
          showFindReplace,
        );

        // Close Find and Replace dialog if it's open
        setShowFindReplace(false);

        handleContentBoxesPress(event as unknown as Event);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleContentBoxesPress, showFindReplace]);

  const handleFindReplace = useCallback(async () => {
    if (!findText.trim()) {
      setReplacementResult("Please enter text to find");
      return;
    }

    if (!isEditing || textBlocksRef.current.length === 0) {
      setReplacementResult("Please enable Content Boxes mode first");
      return;
    }

    if (isProcessing) {
      console.log("Already processing, ignoring find/replace request");
      return;
    }

    setIsProcessing(true);
    setReplacementResult("");

    try {
      const searchText = findText.toLowerCase();
      const matchingBlocks: (TextBlock & { pageIndex: number })[] = [];
      let totalReplacements = 0;
      let originalWordCount = 0;
      let newWordCount = 0;

      // Helper function to count words in text
      const countWords = (text: string): number => {
        return text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
      };

      // Find all text blocks that contain the search text
      textBlocksRef.current.forEach((textBlock) => {
        if (textBlock.text.toLowerCase().includes(searchText)) {
          matchingBlocks.push(textBlock);
          // Count occurrences in this block
          const regex = new RegExp(findText, "gi");
          const matches = textBlock.text.match(regex);
          if (matches) {
            totalReplacements += matches.length;
            // Count words being replaced and words in replacement
            originalWordCount += matches.length * countWords(findText);
            newWordCount += matches.length * countWords(replaceText);
          }
        }
      });

      if (matchingBlocks.length === 0) {
        setReplacementResult(`No matches found for "${findText}"`);
        return;
      }

      // Reuse the active session from Detect Text mode
      if (!activeSessionRef.current) {
        setReplacementResult("Content editing session not available");
        return;
      }

      const session = activeSessionRef.current;

      try {
        // Create updated text blocks with replacements
        const updatedTextBlocks: UpdatedTextBlock[] = matchingBlocks.map(
          (textBlock) => {
            const regex = new RegExp(findText, "gi");
            const newText = textBlock.text.replace(regex, replaceText);

            console.log(`Text replacement for block ${textBlock.id}:`);
            console.log(`  Original: "${textBlock.text}"`);
            console.log(`  New: "${newText}"`);

            return {
              id: textBlock.id,
              text: newText,
            };
          },
        );

        console.log(
          "Updating text blocks with find/replace:",
          updatedTextBlocks,
        );

        // Apply the text updates
        await session.updateTextBlocks(updatedTextBlocks);

        // Commit the changes to make them persistent
        await session.commit();

        console.log("Find/Replace completed and committed");

        // Create detailed statistics message
        const wordStats =
          originalWordCount !== newWordCount
            ? ` (${originalWordCount} words → ${newWordCount} words)`
            : ` (${originalWordCount} words)`;

        const message = `Replaced ${totalReplacements} instances across ${matchingBlocks.length} text blocks${wordStats}`;

        // Show popup with statistics
        setStatsMessage(message);
        setShowStatsPopup(true);

        // Auto-hide popup after 4 seconds
        setTimeout(() => {
          setShowStatsPopup(false);
        }, 4000);

        // Clear editing state since document will reload after commit
        overlaysRef.current.forEach((overlayId) => {
          window.viewerInstance?.removeCustomOverlayItem(overlayId);
        });
        overlaysRef.current = [];
        textBlocksRef.current = [];
        setSelected([]);
        setIsEditing(false);
        setShowFindReplace(false);

        // Dispatch state change events (deferred to avoid React state update during render)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("selectedBlocksChange", {
              detail: { selectedCount: 0 },
            }),
          );
          window.dispatchEvent(
            new CustomEvent("editingStateChange", {
              detail: { isEditing: false },
            }),
          );
        }, 0);
      } catch (updateError) {
        console.error("Error during find/replace update:", updateError);
        // Don't discard the session - it's shared with Detect Text mode
        // The session will be cleaned up when exiting Detect Text mode
        throw updateError;
      }
    } catch (error) {
      console.error("Error in Find/Replace operation:", error);
      setReplacementResult("Error occurred during replacement");
    } finally {
      setIsProcessing(false);
    }
  }, [findText, replaceText, isEditing, isProcessing]);

  const toggleContentEditor = useCallback(async () => {
    console.log(
      "Content Editor button pressed. Current isContentEditing state:",
      isContentEditingRef.current,
    );

    if (!window.viewerInstance) {
      console.warn("Viewer instance not available");
      return;
    }

    try {
      const { PSPDFKit } = window;
      if (!PSPDFKit) {
        console.warn("PSPDFKit not available");
        return;
      }

      if (isContentEditingRef.current) {
        // Exit content editing mode - return to default interaction mode
        console.log("Exiting content editing mode");
        window.viewerInstance?.setViewState(
          (v: typeof PSPDFKit.ViewState.prototype) =>
            v.set("interactionMode", PSPDFKit.InteractionMode.PAN),
        );
      } else {
        // Enter content editing mode
        console.log("Entering content editing mode");
        window.viewerInstance?.setViewState(
          (v: typeof PSPDFKit.ViewState.prototype) =>
            v.set("interactionMode", PSPDFKit.InteractionMode.CONTENT_EDITOR),
        );
      }
      // Note: State updates are handled by the interactionMode change event listener
    } catch (error) {
      console.error("Error toggling content editor:", error);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wait for NutrientViewer to be available (since we're loading it lazily)
    const initializeViewer = () => {
      const { NutrientViewer } = window;
      if (!NutrientViewer) {
        // If NutrientViewer isn't loaded yet, wait and try again
        setTimeout(initializeViewer, 100);
        return;
      }
      // Store the NutrientViewer reference for use in overlays
      nutrientViewerRef.current = NutrientViewer;
      const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || "";
      console.log(
        "License key from env:",
        licenseKey ? `Found (length: ${licenseKey.length})` : "Not found",
      );

      // Load viewer without custom fonts first for faster initial render
      NutrientViewer.load({
        container,
        document,
        toolbarItems: [
          ...minimalToolbarItems,
          ...(isEditingRef.current ? [] : [{ type: "export-pdf" } as const]),
        ],
        licenseKey: licenseKey, // Uncomment if you have a license key
        // customFonts: [], // Load without fonts first
        // Optimize initial loading
        initialViewState: new NutrientViewer.ViewState({
          zoom: NutrientViewer.ZoomMode.AUTO,
        }),
        useCDN: true,
      })
        .then((instance: typeof NutrientViewer.Instance.prototype) => {
          window.viewerInstance = instance;

          // Expose viewer functions for external control
          window.viewerInstance.toggleFindReplace = () => {
            if (!isEditingRef.current) {
              console.warn(
                "Find & Replace requires Content Boxes mode to be enabled first",
              );
              return;
            }
            setShowFindReplace((prev) => !prev);
          };

          window.viewerInstance.triggerAIReplace = async () => {
            if (!isEditingRef.current) {
              console.warn(
                "AI Replace requires Content Boxes mode to be enabled first",
              );
              return;
            }

            if (selectedRef.current.length === 0) {
              console.warn("AI Replace requires text blocks to be selected");
              return;
            }

            if (isProcessingRef.current) {
              console.log("Already processing, ignoring AI request");
              return;
            }

            setIsProcessing(true);

            try {
              console.log(
                "AI Replace triggered with selected text blocks:",
                selectedRef.current,
              );

              // Reuse the active session from Detect Text mode
              if (!activeSessionRef.current) {
                console.error("Content editing session not available");
                return;
              }

              const session = activeSessionRef.current;

              try {
                // Generate random replacement text for demonstration
                const generateRandomText = (originalText: string): string => {
                  const originalLength = originalText.length;
                  const words = [
                    "AI",
                    "tech",
                    "smart",
                    "fast",
                    "new",
                    "good",
                    "best",
                    "top",
                    "big",
                    "real",
                    "data",
                    "code",
                    "web",
                    "app",
                    "tool",
                    "work",
                    "easy",
                    "cool",
                    "hot",
                    "great",
                    "awesome",
                    "amazing",
                    "fantastic",
                    "fun",
                    "modern",
                    "clean",
                    "simple",
                    "quick",
                    "strong",
                    "bright",
                    "fresh",
                    "bold",
                    "clear",
                    "sharp",
                    "safe",
                    "secure",
                    "smart",
                    "intelligent",
                    "efficient",
                    "powerful",
                    "innovative",
                    "creative",
                    "dynamic",
                    "flexible",
                    "scalable",
                    "reliable",
                    "versatile",
                    "sustainable",
                    "productive",
                    "effective",
                    "impactful",
                    "engaging",
                    "insightful",
                    "transformative",
                    "disruptive",
                    "revolutionary",
                    "groundbreaking",
                    "cutting-edge",
                    "state-of-the-art",
                    "next-gen",
                    "high-tech",
                    "advanced",
                    "leading",
                    "premium",
                    "luxury",
                    "exclusive",
                    "elite",
                    "top-tier",
                    "world-class",
                    "best-in-class",
                    "top-notch",
                    "first-rate",
                    "superior",
                    "exceptional",
                    "outstanding",
                    "remarkable",
                    "extraordinary",
                    "unparalleled",
                    "unmatched",
                    "unrivaled",
                    "unbeatable",
                    "unprecedented",
                    "unforgettable",
                    "unmistakable",
                  ];

                  // Start with shorter words to have more room
                  let result = "";
                  let attempts = 0;
                  const maxAttempts = 100;

                  while (
                    result.length < originalLength - 10 &&
                    attempts < maxAttempts
                  ) {
                    const randomWord =
                      words[Math.floor(Math.random() * words.length)];
                    const testResult =
                      result + (result ? " " : "") + randomWord;

                    if (testResult.length <= originalLength) {
                      result = testResult;
                    } else {
                      break;
                    }
                    attempts++;
                  }

                  // If we still have room and the result is too short, pad with lorem ipsum
                  if (result.length < originalLength - 20) {
                    const lorem =
                      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
                    const remainingLength = originalLength - result.length - 1; // -1 for space
                    if (remainingLength > 0) {
                      const paddingText = lorem.substring(0, remainingLength);
                      result = result + (result ? " " : "") + paddingText;
                    }
                  }

                  // Ensure we don't exceed the original length
                  if (result.length > originalLength) {
                    result = result.substring(0, originalLength).trim();
                  }

                  return result || "AI text"; // Fallback if result is empty
                };

                // Create updated text blocks for the selected items
                const updatedTextBlocks: UpdatedTextBlock[] =
                  selectedRef.current.map((textBlock) => {
                    const newText = generateRandomText(textBlock.text);
                    console.log(`Text replacement for block ${textBlock.id}:`);
                    console.log(
                      `  Original: "${textBlock.text}" (length: ${textBlock.text.length})`,
                    );
                    console.log(
                      `  New: "${newText}" (length: ${newText.length})`,
                    );
                    console.log(
                      `  Length check: ${newText.length <= textBlock.text.length ? "PASS" : "FAIL"}`,
                    );

                    return {
                      id: textBlock.id,
                      text: newText,
                    };
                  });

                console.log("Updating text blocks:", updatedTextBlocks);

                // Apply the text updates
                await session.updateTextBlocks(updatedTextBlocks);

                // Commit the changes to make them persistent
                await session.commit();

                console.log("AI text replacement completed and committed");

                // Clear editing state since document will reload after commit
                overlaysRef.current.forEach((overlayId) => {
                  window.viewerInstance?.removeCustomOverlayItem(overlayId);
                });
                overlaysRef.current = [];
                textBlocksRef.current = [];
                setSelected([]);
                setIsEditing(false);

                // Dispatch state change events (deferred to avoid React state update during render)
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("selectedBlocksChange", {
                      detail: { selectedCount: 0 },
                    }),
                  );
                  window.dispatchEvent(
                    new CustomEvent("editingStateChange", {
                      detail: { isEditing: false },
                    }),
                  );
                }, 0);
              } catch (updateError) {
                console.error("Error during AI text update:", updateError);
                // Don't discard the session - it's shared with Detect Text mode
                // The session will be cleaned up when exiting Detect Text mode
                throw updateError;
              }
            } catch (error) {
              console.error("Error in AI Replace operation:", error);
            } finally {
              setIsProcessing(false);
            }
          };

          window.viewerInstance.detectText = () => {
            if (handleContentBoxesPressRef.current) {
              handleContentBoxesPressRef.current(new Event("click"));
            }
          };
          window.viewerInstance.toggleContentEditor = toggleContentEditor;

          console.log("Nutrient Viewer loaded successfully");

          instance.addEventListener(
            "viewState.currentPageIndex.change",
            (pageIndex: number) => {
              // currentPageIndex is zero-based
              console.log("Current page index:", pageIndex);
            },
          );

          // Listen for view state changes to sync the content editing state
          instance.addEventListener(
            "viewState.change",
            (previousViewState: ViewState, viewState: ViewState) => {
              // Suppress unused variable warning
              void previousViewState;
              const { NutrientViewer } = window;
              if (
                NutrientViewer &&
                viewState &&
                viewState.interactionMode !== undefined
              ) {
                const isContentEditingActive =
                  viewState.interactionMode ===
                  NutrientViewer.InteractionMode.CONTENT_EDITOR;
                console.log(
                  "Interaction mode changed to:",
                  viewState.interactionMode,
                  "Content editing active:",
                  isContentEditingActive,
                );

                setIsContentEditing(isContentEditingActive);

                // Dispatch content editing state change event (deferred to avoid React state update during render)
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("contentEditingStateChange", {
                      detail: { isContentEditing: isContentEditingActive },
                    }),
                  );
                }, 0);
              }
            },
          );
        })
        .catch((error: Error) => {
          console.error("Error loading Nutrient Viewer:", error);
        });
    };

    // Start initialization
    initializeViewer();

    return () => {
      // Clean up overlays before unloading
      if (window.viewerInstance) {
        overlaysRef.current.forEach((overlayId) => {
          try {
            window.viewerInstance?.removeCustomOverlayItem(overlayId);
          } catch {
            // Ignore errors during cleanup
          }
        });
      }
      overlaysRef.current = [];
      textBlocksRef.current = [];

      // Discard any active session
      if (activeSessionRef.current) {
        try {
          activeSessionRef.current.discard();
        } catch {
          // Ignore errors during cleanup
        }
        activeSessionRef.current = null;
      }

      // Unload the viewer
      const { NutrientViewer } = window;
      if (NutrientViewer && container) {
        try {
          NutrientViewer.unload(container);
        } catch {
          // Ignore errors if already unloaded
        }
      }

      // Clear the viewer instance
      if (window.viewerInstance) {
        window.viewerInstance = undefined;
      }
    };
  }, [document, minimalToolbarItems, toggleContentEditor]); // Only depend on document changes

  // Separate effect to update toolbar items
  useEffect(() => {
    if (window.viewerInstance) {
      window.viewerInstance.setToolbarItems([
        ...minimalToolbarItems,
        ...(isEditing ? [] : [{ type: "export-pdf" } as const]),
      ]);
    }
  }, [minimalToolbarItems, isEditing]);

  // Log selected text blocks for debugging
  useEffect(() => {
    console.log(
      "Selected text blocks:",
      selected.map((tb) => ({
        id: tb.id,
        text: `${tb.text.substring(0, 50)}...`,
      })),
    );
  }, [selected]);

  // You must set the container height and width
  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          height: "100%",
          width: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Find & Replace Panel */}
      {showFindReplace && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            background: "#ffffff",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
            zIndex: 1000,
            minWidth: "300px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#111827",
              }}
            >
              Find & Replace
            </h3>

            <div style={{ marginBottom: "12px" }}>
              <label
                htmlFor={findInputId}
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Find:
              </label>
              <input
                id={findInputId}
                ref={findInputRef}
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "2px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                }}
                placeholder="Enter text to find"
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label
                htmlFor={replaceInputId}
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Replace with:
              </label>
              <input
                id={replaceInputId}
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "2px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                }}
                placeholder="Enter replacement text"
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleFindReplace}
                disabled={isProcessing || !findText.trim()}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    isProcessing || !findText.trim() ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    isProcessing || !findText.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {isProcessing ? "Processing..." : "Replace All"}
              </button>

              <button
                type="button"
                onClick={() => setShowFindReplace(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Close
              </button>
            </div>

            {replacementResult && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px",
                  backgroundColor: replacementResult.includes("Error")
                    ? "#fef2f2"
                    : "#f0f9ff",
                  border: `2px solid ${replacementResult.includes("Error") ? "#f87171" : "#3b82f6"}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                  color: replacementResult.includes("Error")
                    ? "#991b1b"
                    : "#1e40af",
                  fontWeight: "500",
                }}
              >
                {replacementResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Popup */}
      {showStatsPopup && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#28a745",
            color: "white",
            padding: "20px 32px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            zIndex: 2000,
            fontSize: "16px",
            fontWeight: "500",
            textAlign: "center",
            minWidth: "300px",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              style={{
                display: "inline-block",
                marginRight: "8px",
                verticalAlign: "middle",
              }}
            >
              <title>Success</title>
              <path
                fill="white"
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
              />
            </svg>
            Success!
          </div>
          <div>{statsMessage}</div>
          <button
            type="button"
            onClick={() => setShowStatsPopup(false)}
            style={{
              marginTop: "12px",
              padding: "6px 12px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
