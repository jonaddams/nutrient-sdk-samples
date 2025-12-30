"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OVERLAY_STYLES, VIEWER_EVENTS } from "@/lib/constants";
import { useSyncViewerToWindow, useViewer } from "@/lib/context/ViewerContext";
import { dispatchViewerEventDeferred } from "@/lib/events/viewerEvents";
import { useSyncRef } from "@/lib/hooks/useSyncRef";
import { useTextBlocks } from "@/lib/hooks/useTextBlocks";
import { useViewerSession } from "@/lib/hooks/useViewerSession";
import type { TextBlock, UpdatedTextBlock } from "@/lib/types/nutrient";
import { FindReplaceDialog } from "./components/FindReplaceDialog";
import { StatsPopup } from "./components/StatsPopup";

interface ViewerProps {
  document: string;
}

export default function Viewer({ document }: ViewerProps) {
  // Context and hooks
  const { instance, setInstance } = useViewer();
  useSyncViewerToWindow(); // Maintain backward compatibility with window.viewerInstance
  const { beginSession, commitSession, discardSession, getSession } =
    useViewerSession();
  const {
    textBlocks,
    selectedBlocks,
    selectedCount,
    detectTextBlocks,
    toggleBlockSelection,
    clearSelection,
    clearTextBlocks,
    findAndReplace,
  } = useTextBlocks();

  // Local state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>("");
  const [replaceText, setReplaceText] = useState<string>("");
  const [replacementResult, setReplacementResult] = useState<string>("");
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [showStatsPopup, setShowStatsPopup] = useState<boolean>(false);
  const [statsMessage, setStatsMessage] = useState<string>("");
  const [isContentEditing, setIsContentEditing] = useState<boolean>(false);

  // Refs - using useSyncRef for state synchronization
  const containerRef = useRef(null);
  const overlaysRef = useRef<string[]>([]);
  const isEditingRef = useSyncRef(isEditing);
  const isProcessingRef = useSyncRef(isProcessing);
  const isContentEditingRef = useSyncRef(isContentEditing);
  const selectedBlocksRef = useSyncRef(selectedBlocks);
  const selectedCountRef = useSyncRef(selectedCount);
  const instanceRef = useSyncRef(instance);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Uses refs to avoid recreating callback
  const handleContentBoxesPress = useCallback(
    async (_event: Event) => {
      const currentInstance = instanceRef.current;
      if (isProcessingRef.current || !currentInstance) {
        return;
      }

      setIsProcessing(true);

      try {
        if (isEditing) {
          // If already editing, clear overlays and exit editing mode
          overlaysRef.current.forEach((overlayId) => {
            currentInstance.removeCustomOverlayItem(overlayId);
          });

          overlaysRef.current = [];
          clearTextBlocks();
          clearSelection();
          setIsEditing(false);

          // Discard the active session when exiting editing mode
          await discardSession();

          // Dispatch state change events (deferred to avoid React state update during render)
          dispatchViewerEventDeferred(VIEWER_EVENTS.SELECTED_BLOCKS_CHANGE, {
            selectedCount: 0,
          });
          dispatchViewerEventDeferred(VIEWER_EVENTS.EDITING_STATE_CHANGE, {
            isEditing: false,
          });
        } else {
          setIsEditing(true);

          // Dispatch editing state change event (deferred to avoid React state update during render)
          dispatchViewerEventDeferred(VIEWER_EVENTS.EDITING_STATE_CHANGE, {
            isEditing: true,
          });

          // Create a content editing session and detect text blocks
          const session = await beginSession();

          try {
            // Detect all text blocks in the document
            const totalPages = currentInstance.totalPageCount;
            const allTextBlocks = await detectTextBlocks(session, totalPages);

            const newOverlays: string[] = [];

            allTextBlocks.forEach(
              (textBlock: TextBlock & { pageIndex: number }) => {
                const overlayDiv = window.document.createElement("div");
                overlayDiv.style.border = `${OVERLAY_STYLES.BORDER_WIDTH} solid ${OVERLAY_STYLES.BORDER_COLOR_DEFAULT}`;
                overlayDiv.style.backgroundColor =
                  OVERLAY_STYLES.BACKGROUND_COLOR;
                overlayDiv.style.cursor = OVERLAY_STYLES.CURSOR;
                overlayDiv.style.boxSizing = OVERLAY_STYLES.BOX_SIZING;
                overlayDiv.style.pointerEvents = OVERLAY_STYLES.POINTER_EVENTS;
                overlayDiv.style.width = `${textBlock.boundingBox.width}px`;
                overlayDiv.style.height = `${textBlock.boundingBox.height}px`;
                overlayDiv.style.position = OVERLAY_STYLES.POSITION;

                overlayDiv.addEventListener("click", () => {
                  // Toggle the border color
                  const isCurrentlyBlue =
                    overlayDiv.style.borderColor ===
                      OVERLAY_STYLES.BORDER_COLOR_DEFAULT ||
                    overlayDiv.style.borderColor === "";
                  overlayDiv.style.borderColor = isCurrentlyBlue
                    ? OVERLAY_STYLES.BORDER_COLOR_SELECTED
                    : OVERLAY_STYLES.BORDER_COLOR_DEFAULT;

                  // Update selection state using hook
                  toggleBlockSelection(textBlock, isCurrentlyBlue);

                  // Dispatch event for external listeners
                  dispatchViewerEventDeferred(
                    VIEWER_EVENTS.SELECTED_BLOCKS_CHANGE,
                    {
                      selectedCount: isCurrentlyBlue
                        ? selectedCount + 1
                        : selectedCount - 1,
                    },
                  );
                });

                const overlayId = `overlay-${textBlock.id}`;
                const { NutrientViewer } = window;
                if (!NutrientViewer) {
                  console.error("NutrientViewer not available");
                  return;
                }

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
                currentInstance.setCustomOverlayItem(item);
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
            await discardSession();
            throw overlayError;
          }
        }
      } catch (error) {
        console.error("Error in content editing:", error);
        setIsEditing(false);

        // Clean up any active session on error
        await discardSession();
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isEditing,
      instance,
      clearTextBlocks,
      clearSelection,
      discardSession,
      beginSession,
      detectTextBlocks,
      toggleBlockSelection,
      selectedCount,
    ],
  );

  // Create ref for stable function reference
  const handleContentBoxesPressRef = useRef(handleContentBoxesPress);

  // Update ref when function changes
  React.useEffect(() => {
    handleContentBoxesPressRef.current = handleContentBoxesPress;
  }, [handleContentBoxesPress]);

  // Add escape key listener for Detect Text mode
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Uses ref to access current state
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isEditingRef.current) {
        // Close Find and Replace dialog if it's open
        setShowFindReplace(false);

        handleContentBoxesPress(event as unknown as Event);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleContentBoxesPress]);

  const handleFindReplace = useCallback(async () => {
    if (!findText.trim()) {
      setReplacementResult("Please enter text to find");
      return;
    }

    if (!isEditing || textBlocks.length === 0) {
      setReplacementResult("Please enable Content Boxes mode first");
      return;
    }

    if (isProcessing || !instance) {
      return;
    }

    setIsProcessing(true);
    setReplacementResult("");

    try {
      // Use the findAndReplace hook to get updates
      const { updates, count: totalReplacements } = findAndReplace(
        findText,
        replaceText,
      );

      if (totalReplacements === 0) {
        setReplacementResult(`No matches found for "${findText}"`);
        return;
      }

      // Reuse the active session from Detect Text mode
      const session = getSession();
      if (!session) {
        setReplacementResult("Content editing session not available");
        return;
      }

      try {
        // Apply the text updates (updates already in UpdatedTextBlock format)
        await session.updateTextBlocks(updates);

        // Commit the changes to make them persistent
        await commitSession();

        // Create statistics message
        const message = `Replaced ${totalReplacements} instances across ${updates.length} text blocks`;

        // Show popup with statistics
        setStatsMessage(message);
        setShowStatsPopup(true);

        // Auto-hide popup after 4 seconds
        setTimeout(() => {
          setShowStatsPopup(false);
        }, 4000);

        // Clear editing state since document will reload after commit
        overlaysRef.current.forEach((overlayId) => {
          instance.removeCustomOverlayItem(overlayId);
        });
        overlaysRef.current = [];
        clearTextBlocks();
        clearSelection();
        setIsEditing(false);
        setShowFindReplace(false);

        // Dispatch state change events (deferred to avoid React state update during render)
        dispatchViewerEventDeferred(VIEWER_EVENTS.SELECTED_BLOCKS_CHANGE, {
          selectedCount: 0,
        });
        dispatchViewerEventDeferred(VIEWER_EVENTS.EDITING_STATE_CHANGE, {
          isEditing: false,
        });
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
  }, [
    findText,
    replaceText,
    isEditing,
    isProcessing,
    textBlocks,
    instance,
    findAndReplace,
    getSession,
    commitSession,
    clearTextBlocks,
    clearSelection,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Uses refs to avoid circular dependency
  const toggleContentEditor = useCallback(async () => {
    const currentInstance = instanceRef.current;
    if (!currentInstance) {
      return;
    }

    try {
      const { NutrientViewer: PSPDFKit } = window;
      if (!PSPDFKit) {
        return;
      }

      if (isContentEditingRef.current) {
        // Exit content editing mode - return to default interaction mode
        currentInstance.setViewState(
          // biome-ignore lint/suspicious/noExplicitAny: SDK ViewState type is not exported
          (v: any) => v.set("interactionMode", PSPDFKit.InteractionMode.PAN),
        );
      } else {
        // Enter content editing mode
        currentInstance.setViewState(
          // biome-ignore lint/suspicious/noExplicitAny: SDK ViewState type is not exported
          (v: any) =>
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

    // Wait for NutrientViewer to be available
    const initializeViewer = () => {
      const { NutrientViewer } = window;
      if (!NutrientViewer) {
        setTimeout(initializeViewer, 100);
        return;
      }
      const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || "";

      // Detect dark mode
      const isDarkMode =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

      // Unload any existing instance first
      try {
        NutrientViewer.unload(container);
      } catch {
        // Ignore errors if no instance exists
      }

      // Load viewer with dark theme if dark mode is detected
      NutrientViewer.load({
        container,
        document,
        toolbarItems: [
          ...minimalToolbarItems,
          ...(isEditingRef.current ? [] : [{ type: "export-pdf" } as const]),
        ],
        licenseKey: licenseKey,
        initialViewState: new NutrientViewer.ViewState({
          zoom: NutrientViewer.ZoomMode.AUTO,
        }),
        useCDN: true,
        theme: isDarkMode
          ? NutrientViewer.Theme.DARK
          : NutrientViewer.Theme.LIGHT,
      })
        .then((viewerInstance: Instance) => {
          // Store instance in context (which also syncs to window for backward compatibility)
          setInstance(viewerInstance);

          // Expose viewer functions for external control
          viewerInstance.toggleFindReplace = () => {
            if (!isEditingRef.current) {
              return;
            }
            setShowFindReplace((prev) => !prev);
          };

          viewerInstance.triggerAIReplace = async () => {
            if (!isEditingRef.current) {
              return;
            }

            if (selectedCountRef.current === 0) {
              return;
            }

            if (isProcessingRef.current) {
              return;
            }

            setIsProcessing(true);

            try {
              // Reuse the active session from Detect Text mode
              const session = getSession();
              if (!session) {
                console.error("Content editing session not available");
                return;
              }

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
                    "modern",
                    "clean",
                    "simple",
                    "quick",
                    "bright",
                    "fresh",
                  ];

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
                      "Lorem ipsum dolor sit amet consectetur adipiscing elit";
                    const remainingLength = originalLength - result.length - 1;
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
                  selectedBlocksRef.current.map((textBlock) => {
                    const newText = generateRandomText(textBlock.text);

                    return {
                      id: textBlock.id,
                      text: newText,
                    };
                  });

                // Apply the text updates
                await session.updateTextBlocks(updatedTextBlocks);

                // Commit the changes to make them persistent
                await commitSession();

                // Clear editing state since document will reload after commit
                overlaysRef.current.forEach((overlayId) => {
                  viewerInstance.removeCustomOverlayItem(overlayId);
                });
                overlaysRef.current = [];
                clearTextBlocks();
                clearSelection();
                setIsEditing(false);

                // Dispatch state change events (deferred to avoid React state update during render)
                dispatchViewerEventDeferred(
                  VIEWER_EVENTS.SELECTED_BLOCKS_CHANGE,
                  {
                    selectedCount: 0,
                  },
                );
                dispatchViewerEventDeferred(VIEWER_EVENTS.EDITING_STATE_CHANGE, {
                  isEditing: false,
                });
              } catch (updateError) {
                console.error("Error during AI text update:", updateError);
                throw updateError;
              }
            } catch (error) {
              console.error("Error in AI Replace operation:", error);
            } finally {
              setIsProcessing(false);
            }
          };

          viewerInstance.detectText = () => {
            if (handleContentBoxesPressRef.current) {
              handleContentBoxesPressRef.current(new Event("click"));
            }
          };
          viewerInstance.toggleContentEditor = toggleContentEditor;

          viewerInstance.addEventListener(
            "viewState.currentPageIndex.change",
            (_pageIndex: number) => {},
          );

          // Listen for view state changes to sync the content editing state
          viewerInstance.addEventListener(
            "viewState.change",
            // biome-ignore lint/suspicious/noExplicitAny: SDK ViewState type is not exported
            (_prevViewState: any, viewState: any) => {
              const { NutrientViewer } = window;
              if (
                NutrientViewer &&
                viewState &&
                viewState.interactionMode !== undefined
              ) {
                const isContentEditingActive =
                  viewState.interactionMode ===
                  NutrientViewer.InteractionMode.CONTENT_EDITOR;

                setIsContentEditing(isContentEditingActive);

                // Dispatch content editing state change event
                dispatchViewerEventDeferred(
                  VIEWER_EVENTS.CONTENT_EDITING_STATE_CHANGE,
                  {
                    isContentEditing: isContentEditingActive,
                  },
                );
              }
            },
          );
        })
        .catch((error: Error) => {
          console.error("Error loading Nutrient Viewer:", error);
        });
    };

    initializeViewer();

    return () => {
      // Clean up overlays before unloading
      if (instance) {
        overlaysRef.current.forEach((overlayId) => {
          try {
            instance.removeCustomOverlayItem(overlayId);
          } catch {
            // Ignore errors during cleanup
          }
        });
      }
      overlaysRef.current = [];
      clearTextBlocks();

      // Discard any active session
      discardSession().catch(() => {
        // Ignore errors during cleanup
      });

      // Unload the viewer
      const { NutrientViewer } = window;
      if (NutrientViewer && container) {
        try {
          NutrientViewer.unload(container);
        } catch {
          // Ignore errors if already unloaded
        }
      }

      // Clear instance from context (will also clear window.viewerInstance)
      setInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Uses multiple refs to avoid recreating effect
  }, [
    document,
    minimalToolbarItems,
    clearSelection,
    clearTextBlocks,
    commitSession,
    discardSession,
    getSession,
    setInstance,
  ]);

  // Separate effect to update toolbar items
  useEffect(() => {
    if (instance) {
      instance.setToolbarItems([
        ...minimalToolbarItems,
        ...(isEditing ? [] : [{ type: "export-pdf" } as const]),
      ]);
    }
  }, [minimalToolbarItems, isEditing, instance]);

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

      <FindReplaceDialog
        isVisible={showFindReplace}
        findText={findText}
        replaceText={replaceText}
        replacementResult={replacementResult}
        isProcessing={isProcessing}
        onFindTextChange={setFindText}
        onReplaceTextChange={setReplaceText}
        onReplaceAll={handleFindReplace}
        onClose={() => setShowFindReplace(false)}
      />

      <StatsPopup
        isVisible={showStatsPopup}
        message={statsMessage}
        onClose={() => setShowStatsPopup(false)}
      />
    </div>
  );
}
