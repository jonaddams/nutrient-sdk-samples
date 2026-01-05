"use client";

import type {
	DocumentComparison,
	Geometry,
	Instance,
} from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

type Operation = DocumentComparison.Operation;

interface ChangeOperation {
	deleteText?: string;
	insertText?: string;
	del?: boolean;
	insert?: boolean;
	pageIndex?: number; // Track which page this change is on
	originalRect?: Geometry.Rect; // Rectangle for deleted text in original document
	changedRect?: Geometry.Rect; // Rectangle for inserted text in changed document
	annotationIds?: string[]; // Store annotation IDs for this change
}

export default function Page() {
	const originalDoc = "/documents/text-comparison-a.pdf";
	const changedDoc = "/documents/text-comparison-b.pdf";
	const numberOfContextWords = 100;
	const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;

	// State management for tracking document changes
	const [operationsMap, setOperationsMap] = useState<
		Map<string, ChangeOperation>
	>(new Map()); // UI state for rendering changes in the sidebar
	const [selectedChangeIndex, setSelectedChangeIndex] = useState<number>(0); // Track currently selected change
	const [isScrollLocked, setIsScrollLocked] = useState<boolean>(true); // Track whether scrolling is synchronized
	const isScrollLockedRef = useRef<boolean>(true); // Ref to track scroll lock state for event handlers
	const isSyncingRef = useRef<boolean>(false); // Ref to prevent sync loop
	const originalContainerRef = useRef<HTMLDivElement>(null); // Ref for the original document viewer container
	const changedContainerRef = useRef<HTMLDivElement>(null); // Ref for the changed document viewer container
	const operationsRef = useRef<Map<string, ChangeOperation>>(new Map()); // Ref for tracking changes across all pages
	const originalInstanceRef = useRef<Instance | null>(null); // Ref for the original viewer instance
	const changedInstanceRef = useRef<Instance | null>(null); // Ref for the changed viewer instance
	const selectionAnnotationIdsRef = useRef<string[]>([]); // Track selection border annotation IDs
	const annotationToChangeIndexRef = useRef<Map<string, number>>(new Map()); // Map annotation IDs to change indices

	// Trigger re-render by updating state
	function updateOperationsMap(existingMap: Map<string, ChangeOperation>) {
		setOperationsMap(new Map(existingMap));
	}

	// Toggle scroll lock and update both state and ref
	function toggleScrollLock() {
		const newValue = !isScrollLocked;
		setIsScrollLocked(newValue);
		isScrollLockedRef.current = newValue;
	}

	// Handle clicking on annotations in the document
	function handleAnnotationClick(event: { annotation: { id: string } }) {
		const annotationId = event.annotation.id;
		const changeIndex = annotationToChangeIndexRef.current.get(annotationId);

		if (
			changeIndex !== undefined &&
			operationsRef.current &&
			operationsRef.current.size > 0
		) {
			const changesArray = Array.from(operationsRef.current);
			if (changeIndex < changesArray.length) {
				const [, operation] = changesArray[changeIndex];
				handleChangeClick(operation, changeIndex);
			}
		}
	}

	/**
	 * Scrolls the viewer to a specific page by calculating the cumulative height
	 * of all pages before it and setting the scroll position.
	 *
	 * This is useful for programmatically navigating to pages that contain
	 * specific annotations or changes.
	 *
	 * @param instance - The Nutrient viewer instance
	 * @param targetPageIndex - Zero-based index of the page to scroll to
	 * @param offsetTop - Optional pixel offset from the top of the page (default: 0)
	 *
	 * @example
	 * // Scroll to page 3 (zero-indexed, so this is the 4th page)
	 * await scrollToPage(originalInstance, 3);
	 *
	 * @example
	 * // Scroll to page 2 with a 100px offset from the top
	 * await scrollToPage(changedInstance, 2, 100);
	 */
	async function scrollToPage(
		instance: Instance,
		targetPageIndex: number,
		offsetTop = 0,
	): Promise<void> {
		const scrollContainer = instance.contentDocument.querySelector(
			".PSPDFKit-Scroll",
		) as HTMLElement | null;

		if (!scrollContainer) {
			console.warn("Scroll container not found");
			return;
		}

		// Calculate cumulative height of all pages before the target page
		let cumulativeHeight = 0;

		for (let i = 0; i < targetPageIndex; i++) {
			const pageInfo = await instance.pageInfoForIndex(i);
			if (!pageInfo) continue;

			// Account for zoom level
			const zoom = instance.viewState.zoom;
			const zoomValue = typeof zoom === "number" ? zoom : 1;
			cumulativeHeight += pageInfo.height * zoomValue;

			// Add page spacing (gap between pages in the viewer)
			// The viewer typically has a 10px gap between pages
			cumulativeHeight += 10;
		}

		// Add the offset within the target page
		cumulativeHeight += offsetTop;

		// Scroll to the calculated position with smooth behavior
		scrollContainer.scrollTo({
			top: cumulativeHeight,
			behavior: "smooth",
		});

		// Also update the ViewState to ensure page index is correct
		const viewState = instance.viewState;
		instance.setViewState(viewState.set("currentPageIndex", targetPageIndex));
	}

	// Highlight colors for deletions and insertions
	// See tailwind.config.js for color definitions in the tailwind theme
	const deleteHighlightColor = { r: 255, g: 201, b: 203 }; // Light red for deletions
	const insertHighlightColor = { r: 192, g: 216, b: 239 }; // Light blue for insertions

	/*
  Main function to compare documents:
  This function loads the original and changed documents in Nutrient viewers
  and compares the text content of each page to identify changes
  It then creates highlight annotations for the changes and updates the state
  to trigger a re-render of the sidebar with the changes
  */
	async function compareDocuments() {
		if (window.NutrientViewer) {
			// This example is importing Nutrient SDK through the CDN
			// If you want to add through a package manager, use the following:
			// import("@nutrient-sdk/viewer").then(async (NutrientViewer) => {});

			const originalContainer = originalContainerRef.current;
			const changedContainer = changedContainerRef.current;

			const toolbarItems = [
				{ type: "sidebar-thumbnails" },
				{ type: "sidebar-document-outline" },
				{ type: "sidebar-bookmarks" },
				{ type: "pager" },
				{ type: "pan" },
				{ type: "zoom-out" },
				{ type: "zoom-in" },
				{ type: "zoom-mode" },
				{ type: "linearized-download-indicator" },
			];

			originalContainer
				? window.NutrientViewer!.unload(originalContainer)
				: null;
			changedContainer ? window.NutrientViewer!.unload(changedContainer) : null;

			// biome-ignore lint/style/noNonNullAssertion: containers are checked to exist via refs
			const originalInstance: Instance = await window.NutrientViewer!.load({
				container: originalContainer!,
				document: originalDoc,
				useCDN: true,
				styleSheets: ["/styles.css"],
				licenseKey: licenseKey,
				// biome-ignore lint/suspicious/noExplicitAny: toolbar items type inference fails with CDN types
				toolbarItems: toolbarItems as any,
			});

			// biome-ignore lint/style/noNonNullAssertion: containers are checked to exist via refs
			const changedInstance: Instance = await window.NutrientViewer!.load({
				container: changedContainer!,
				document: changedDoc,
				useCDN: true,
				styleSheets: ["/styles.css"],
				licenseKey: licenseKey,
				// biome-ignore lint/suspicious/noExplicitAny: toolbar items type inference fails with CDN types
				toolbarItems: toolbarItems as any,
			});

			// Store instances in refs for access from click handlers
			originalInstanceRef.current = originalInstance;
			changedInstanceRef.current = changedInstance;

			// Add click listeners to annotations in both documents
			originalInstance.addEventListener(
				"annotations.press",
				handleAnnotationClick,
			);
			changedInstance.addEventListener(
				"annotations.press",
				handleAnnotationClick,
			);

			// Synchronize changed viewer -> original viewer
			const changedScrollElement =
				changedInstance.contentDocument.querySelector(".PSPDFKit-Scroll");
			let changedScrollFrame: number | null = null;

			changedScrollElement?.addEventListener(
				"scroll",
				() => {
					if (changedScrollFrame) return; // Already scheduled
					changedScrollFrame = requestAnimationFrame(() => {
						syncChangedToOriginal();
						changedScrollFrame = null;
					});
				},
				{ passive: true },
			);

			changedInstance.addEventListener(
				"viewState.currentPageIndex.change",
				syncChangedToOriginal,
			);
			changedInstance.addEventListener(
				"viewState.zoom.change",
				syncChangedToOriginal,
			);

			// Synchronize original viewer -> changed viewer
			const originalScrollElement =
				originalInstance.contentDocument.querySelector(".PSPDFKit-Scroll");
			let originalScrollFrame: number | null = null;

			originalScrollElement?.addEventListener(
				"scroll",
				() => {
					if (originalScrollFrame) return; // Already scheduled
					originalScrollFrame = requestAnimationFrame(() => {
						syncOriginalToChanged();
						originalScrollFrame = null;
					});
				},
				{ passive: true },
			);

			originalInstance.addEventListener(
				"viewState.currentPageIndex.change",
				syncOriginalToChanged,
			);
			originalInstance.addEventListener(
				"viewState.zoom.change",
				syncOriginalToChanged,
			);

			// Sync from changed (right) to original (left)
			function syncChangedToOriginal() {
				// Only sync if scroll is locked and not already syncing
				if (!isScrollLockedRef.current || isSyncingRef.current) return;

				isSyncingRef.current = true;

				try {
					const sourceViewState = changedInstance.viewState;
					const targetViewState = originalInstance.viewState;
					const sourcePage = sourceViewState.currentPageIndex;
					const targetPage = targetViewState.currentPageIndex;

					// Sync zoom if different
					if (targetViewState.zoom !== sourceViewState.zoom) {
						originalInstance.setViewState(
							targetViewState.set("zoom", sourceViewState.zoom),
						);
					}

					// Sync page if different
					if (targetPage !== sourcePage) {
						originalInstance.setViewState(
							targetViewState.set("currentPageIndex", sourcePage),
						);
					} else {
						// Same page: sync scroll position
						const sourceScroll = changedInstance.contentDocument.querySelector(
							".PSPDFKit-Scroll",
						) as HTMLElement | null;
						const targetScroll = originalInstance.contentDocument.querySelector(
							".PSPDFKit-Scroll",
						) as HTMLElement | null;

						if (sourceScroll && targetScroll) {
							targetScroll.scrollTop = sourceScroll.scrollTop;
							targetScroll.scrollLeft = sourceScroll.scrollLeft;
						}
					}
				} finally {
					isSyncingRef.current = false;
				}
			}

			// Sync from original (left) to changed (right)
			function syncOriginalToChanged() {
				// Only sync if scroll is locked and not already syncing
				if (!isScrollLockedRef.current || isSyncingRef.current) return;

				isSyncingRef.current = true;

				try {
					const sourceViewState = originalInstance.viewState;
					const targetViewState = changedInstance.viewState;
					const sourcePage = sourceViewState.currentPageIndex;
					const targetPage = targetViewState.currentPageIndex;

					// Sync zoom if different
					if (targetViewState.zoom !== sourceViewState.zoom) {
						changedInstance.setViewState(
							targetViewState.set("zoom", sourceViewState.zoom),
						);
					}

					// Sync page if different
					if (targetPage !== sourcePage) {
						changedInstance.setViewState(
							targetViewState.set("currentPageIndex", sourcePage),
						);
					} else {
						// Same page: sync scroll position
						const sourceScroll = originalInstance.contentDocument.querySelector(
							".PSPDFKit-Scroll",
						) as HTMLElement | null;
						const targetScroll = changedInstance.contentDocument.querySelector(
							".PSPDFKit-Scroll",
						) as HTMLElement | null;

						if (sourceScroll && targetScroll) {
							targetScroll.scrollTop = sourceScroll.scrollTop;
							targetScroll.scrollLeft = sourceScroll.scrollLeft;
						}
					}
				} finally {
					isSyncingRef.current = false;
				}
			}

			const totalPageCount = await originalInstance.totalPageCount;

			// Process each page in the document
			for (let pageIndex = 0; pageIndex < totalPageCount; pageIndex++) {
				// Create a document descriptor for the original document
				const originalDocument = new window.NutrientViewer!.DocumentDescriptor({
					filePath: originalDoc,
					pageIndexes: [pageIndex],
				});

				// Create a document descriptor for the changed document
				const changedDocument = new window.NutrientViewer!.DocumentDescriptor({
					filePath: changedDoc,
					pageIndexes: [pageIndex],
				});

				// Map to store changes for each page
				const changes = new Map<string, ChangeOperation>();

				// Configure text comparison
				const textComparisonOperation =
					new window.NutrientViewer!.ComparisonOperation(
						window.NutrientViewer!.ComparisonOperationType.TEXT,
						{ numberOfContextWords },
					);

				// Perform text comparison
				const comparisonResult = await originalInstance.compareDocuments(
					{ originalDocument, changedDocument },
					textComparisonOperation,
				);

				// Process comparison results
				async function processOperation(operation: Operation) {
					switch (operation.type) {
						case "delete": {
							// Use original text blocks for delete operations
							const rect = operation.originalTextBlocks[0].rect;
							const coordinate = `${rect[0]},${rect[1]}`;

							const originalRect = new window.NutrientViewer!.Geometry.Rect({
								left: operation.originalTextBlocks[0].rect[0],
								top: operation.originalTextBlocks[0].rect[1],
								width: operation.originalTextBlocks[0].rect[2],
								height: operation.originalTextBlocks[0].rect[3],
							});

							// Create annotation and get its ID
							const annotation =
								new window.NutrientViewer!.Annotations.HighlightAnnotation({
									pageIndex,
									rects: window.NutrientViewer!.Immutable.List([originalRect]),
									color: new window.NutrientViewer!.Color(deleteHighlightColor),
								});
							const created = await originalInstance.create(annotation);
							const annotationId =
								created.length > 0 ? (created[0] as any).id : null;

							// Sidebar changes Map
							// If the coordinate already exists, add the deleteText value in the existing object
							if (changes.has(coordinate)) {
								const existing = changes.get(coordinate)!;
								changes.set(coordinate, {
									...existing,
									deleteText: operation.text,
									del: true,
									pageIndex,
									originalRect,
									annotationIds: [
										...(existing.annotationIds || []),
										...(annotationId ? [annotationId] : []),
									],
								});
							} else {
								changes.set(coordinate, {
									deleteText: operation.text,
									del: true,
									pageIndex,
									originalRect,
									annotationIds: annotationId ? [annotationId] : [],
								});
							}
							break;
						}

						case "insert": {
							// Use changed text blocks for insert operations
							const rect = operation.changedTextBlocks[0].rect;
							const coordinate = `${rect[0]},${rect[1]}`;

							const changedRect = new window.NutrientViewer!.Geometry.Rect({
								left: rect[0],
								top: rect[1],
								width: rect[2],
								height: rect[3],
							});

							// Create annotation and get its ID
							const annotation =
								new window.NutrientViewer!.Annotations.HighlightAnnotation({
									pageIndex,
									rects: window.NutrientViewer!.Immutable.List([changedRect]),
									color: new window.NutrientViewer!.Color(insertHighlightColor),
								});
							const created = await changedInstance.create(annotation);
							const annotationId =
								created.length > 0 ? (created[0] as any).id : null;

							// Sidebar changes Map
							// Update or create insert change entry
							if (changes.has(coordinate)) {
								const existing = changes.get(coordinate)!;
								changes.set(coordinate, {
									...existing,
									insertText: operation.text,
									insert: true,
									pageIndex,
									changedRect,
									annotationIds: [
										...(existing.annotationIds || []),
										...(annotationId ? [annotationId] : []),
									],
								});
							} else {
								changes.set(coordinate, {
									insertText: operation.text,
									insert: true,
									pageIndex,
									changedRect,
									annotationIds: annotationId ? [annotationId] : [],
								});
							}
							break;
						}
					}
				}

				// Iterate through comparison results structure
				if (
					comparisonResult &&
					"documentComparisonResults" in comparisonResult
				) {
					for (const docComparison of comparisonResult.documentComparisonResults) {
						for (const result of docComparison.comparisonResults) {
							for (const hunk of result.hunks) {
								const operations = hunk.operations.filter(
									(op: Operation) => op.type !== "equal",
								);

								// Process operations, looking for consecutive delete+insert pairs
								let i = 0;
								while (i < operations.length) {
									const currentOp = operations[i];

									// Check if this is a delete followed by an insert (replacement)
									if (
										currentOp.type === "delete" &&
										i + 1 < operations.length &&
										operations[i + 1].type === "insert"
									) {
										// Process as a replacement
										const deleteOp = currentOp;
										const insertOp = operations[i + 1];

										// Use the delete operation's coordinate as the key
										const deleteRect = deleteOp.originalTextBlocks[0].rect;
										const coordinate = `${deleteRect[0]},${deleteRect[1]}`;

										const originalRect =
											new window.NutrientViewer!.Geometry.Rect({
												left: deleteRect[0],
												top: deleteRect[1],
												width: deleteRect[2],
												height: deleteRect[3],
											});

										const insertRect = insertOp.changedTextBlocks[0].rect;
										const changedRect = new window.NutrientViewer!.Geometry.Rect(
											{
												left: insertRect[0],
												top: insertRect[1],
												width: insertRect[2],
												height: insertRect[3],
											},
										);

										// Create delete annotation
										const deleteAnnotation =
											new window.NutrientViewer!.Annotations.HighlightAnnotation(
												{
													pageIndex,
													rects: window.NutrientViewer!.Immutable.List([
														originalRect,
													]),
													color: new window.NutrientViewer!.Color(
														deleteHighlightColor,
													),
												},
											);
										const createdDelete =
											await originalInstance.create(deleteAnnotation);
										const deleteAnnotationId =
											createdDelete.length > 0
												? // eslint-disable-next-line @typescript-eslint/no-explicit-any
													(createdDelete[0] as any).id
												: null;

										// Create insert annotation
										const insertAnnotation =
											new window.NutrientViewer!.Annotations.HighlightAnnotation(
												{
													pageIndex,
													rects: window.NutrientViewer!.Immutable.List([
														changedRect,
													]),
													color: new window.NutrientViewer!.Color(
														insertHighlightColor,
													),
												},
											);
										const createdInsert =
											await changedInstance.create(insertAnnotation);
										const insertAnnotationId =
											createdInsert.length > 0
												? // eslint-disable-next-line @typescript-eslint/no-explicit-any
													(createdInsert[0] as any).id
												: null;

										// Store as a replacement
										changes.set(coordinate, {
											deleteText: deleteOp.text,
											insertText: insertOp.text,
											del: true,
											insert: true,
											pageIndex,
											originalRect,
											changedRect,
											annotationIds: [
												...(deleteAnnotationId ? [deleteAnnotationId] : []),
												...(insertAnnotationId ? [insertAnnotationId] : []),
											],
										});

										// Skip the next operation since we processed it
										i += 2;
									} else {
										// Process as a standalone delete or insert
										await processOperation(currentOp);
										i++;
									}
								}
							}
						}
					}
				}

				operationsRef.current = new Map([...operationsRef.current, ...changes]);
			}

			// Update state to trigger re-render
			updateOperationsMap(operationsRef.current);

			// Build annotation ID to change index mapping
			const annotationMap = new Map<string, number>();
			Array.from(operationsRef.current).forEach(([, operation], index) => {
				if (operation.annotationIds) {
					operation.annotationIds.forEach((annotationId) => {
						annotationMap.set(annotationId, index);
					});
				}
			});
			annotationToChangeIndexRef.current = annotationMap;
		}
	}

	// Add helper function to count words
	function countWords(text: string | undefined): number {
		return text ? text.trim().split(/\s+/).length : 0;
	}

	// Display the number of words added and removed in the sidebar
	function plusMinusDisplayText(operation: ChangeOperation) {
		const deleteCount = operation.deleteText
			? countWords(operation.deleteText)
			: 0;
		const insertCount = operation.insertText
			? countWords(operation.insertText)
			: 0;

		if (operation.insert && operation.del) {
			return (
				<div className="text-xs">
					<span className="bg-delete-highlight">-{deleteCount}</span>
					{" | "}
					<span className="bg-insert-highlight">+{insertCount}</span>
				</div>
			);
		} else if (operation.insert) {
			return (
				<div className="text-xs">
					<span className="bg-insert-highlight">+{insertCount}</span>
				</div>
			);
		} else {
			return (
				<div className="text-xs">
					<span className="bg-delete-highlight">-{deleteCount}</span>
				</div>
			);
		}
	}

	// Add border annotations around selected change
	async function highlightSelectedChange(operation: ChangeOperation) {
		if (!originalInstanceRef.current || !changedInstanceRef.current) return;

		// Remove previous selection annotations
		for (const annotationId of selectionAnnotationIdsRef.current) {
			try {
				await originalInstanceRef.current.delete(annotationId);
			} catch {
				// Annotation might be in changed instance
				try {
					await changedInstanceRef.current.delete(annotationId);
				} catch {
					// Annotation doesn't exist, ignore
				}
			}
		}
		selectionAnnotationIdsRef.current = [];

		// Create border color (blue to match Nutrient UI)
		const borderColor = new window.NutrientViewer!.Color({
			r: 59,
			g: 130,
			b: 246,
		});

		// Add border around deleted text in original document
		if (
			operation.del &&
			operation.originalRect &&
			operation.pageIndex !== undefined
		) {
			// Expand the bounding box by a few pixels
			const expandedRect = new window.NutrientViewer!.Geometry.Rect({
				left: operation.originalRect.left - 3,
				top: operation.originalRect.top - 3,
				width: operation.originalRect.width + 6,
				height: operation.originalRect.height + 6,
			});

			const borderAnnotation =
				new window.NutrientViewer!.Annotations.RectangleAnnotation({
					pageIndex: operation.pageIndex,
					boundingBox: expandedRect,
					strokeColor: borderColor,
					strokeWidth: 2,
					fillColor: null, // No fill
				});

			const createdAnnotations =
				await originalInstanceRef.current.create(borderAnnotation);
			if (createdAnnotations.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				selectionAnnotationIdsRef.current.push(
					(createdAnnotations[0] as any).id,
				);
			}
		}

		// Add border around inserted text in changed document
		if (
			operation.insert &&
			operation.changedRect &&
			operation.pageIndex !== undefined
		) {
			// Expand the bounding box by a few pixels
			const expandedRect = new window.NutrientViewer!.Geometry.Rect({
				left: operation.changedRect.left - 3,
				top: operation.changedRect.top - 3,
				width: operation.changedRect.width + 6,
				height: operation.changedRect.height + 6,
			});

			const borderAnnotation =
				new window.NutrientViewer!.Annotations.RectangleAnnotation({
					pageIndex: operation.pageIndex,
					boundingBox: expandedRect,
					strokeColor: borderColor,
					strokeWidth: 2,
					fillColor: null, // No fill
				});

			const createdAnnotations =
				await changedInstanceRef.current.create(borderAnnotation);
			if (createdAnnotations.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				selectionAnnotationIdsRef.current.push(
					(createdAnnotations[0] as any).id,
				);
			}
		}
	}

	// Handle clicking on a sidebar item to scroll to that page
	async function handleChangeClick(operation: ChangeOperation, index: number) {
		setSelectedChangeIndex(index);
		if (
			operation.pageIndex !== undefined &&
			originalInstanceRef.current &&
			changedInstanceRef.current
		) {
			await scrollToPage(originalInstanceRef.current, operation.pageIndex);
			await scrollToPage(changedInstanceRef.current, operation.pageIndex);
			await highlightSelectedChange(operation);
		}
	}

	// Navigate to previous change
	async function handlePreviousChange() {
		const changesArray = Array.from(operationsMap);
		if (selectedChangeIndex > 0) {
			const newIndex = selectedChangeIndex - 1;
			setSelectedChangeIndex(newIndex);
			const [, operation] = changesArray[newIndex];
			if (
				operation.pageIndex !== undefined &&
				originalInstanceRef.current &&
				changedInstanceRef.current
			) {
				await scrollToPage(originalInstanceRef.current, operation.pageIndex);
				await scrollToPage(changedInstanceRef.current, operation.pageIndex);
				await highlightSelectedChange(operation);
			}
		}
	}

	// Navigate to next change
	async function handleNextChange() {
		const changesArray = Array.from(operationsMap);
		if (selectedChangeIndex < changesArray.length - 1) {
			const newIndex = selectedChangeIndex + 1;
			setSelectedChangeIndex(newIndex);
			const [, operation] = changesArray[newIndex];
			if (
				operation.pageIndex !== undefined &&
				originalInstanceRef.current &&
				changedInstanceRef.current
			) {
				await scrollToPage(originalInstanceRef.current, operation.pageIndex);
				await scrollToPage(changedInstanceRef.current, operation.pageIndex);
				await highlightSelectedChange(operation);
			}
		}
	}

	useEffect(() => {
		compareDocuments();
	}, []);

	return (
		<div className="min-h-screen bg-white dark:bg-[#1a1414]">
			<SampleHeader
				title="Text Comparison"
				description="Compare two PDF documents side-by-side with highlighted text changes"
			/>
			<div className="m-4 grid grid-cols-12">
				{/* original document viewer */}
				<div className="min-h-fit col-span-5 border">
					<div>
						<p className="text-center p-3">{originalDoc}</p>
					</div>
					<div
						id="original-document-viewer"
						ref={originalContainerRef}
						className="h-lvh"
					/>
				</div>
				{/* changed document viewer */}
				<div className="min-h-fit col-span-5 border">
					<div>
						<p className="text-center p-3">{changedDoc}</p>
					</div>
					<div
						id="changed-document-viewer"
						ref={changedContainerRef}
						className="h-lvh"
					/>
				</div>
				{/* changes sidebar */}
				<div className="col-span-2">
					<div className="sm:block border border-gray-300 dark:border-gray-700">
						<div className="flex justify-between items-center p-3 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-[#26221E]">
							<p>
								{operationsMap.size} Change{operationsMap.size !== 1 ? "s" : ""}
							</p>
							<div className="flex gap-1">
								<button
									type="button"
									onClick={toggleScrollLock}
									className="p-1 px-2 border border-gray-400 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
									title={
										isScrollLocked ? "Unlock scroll sync" : "Lock scroll sync"
									}
								>
									{isScrollLocked ? "🔒" : "🔓"}
								</button>
								<button
									type="button"
									onClick={handlePreviousChange}
									disabled={selectedChangeIndex === 0}
									className="p-1 px-2 border border-gray-400 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
									title="Previous change"
								>
									←
								</button>
								<button
									type="button"
									onClick={handleNextChange}
									disabled={selectedChangeIndex === operationsMap.size - 1}
									className="p-1 px-2 border border-gray-400 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
									title="Next change"
								>
									→
								</button>
							</div>
						</div>
						<div>
							{/* display individual operations grouped by page */}
							{(() => {
								// Group changes by page
								const changesByPage = new Map<
									number,
									Array<[string, ChangeOperation, number]>
								>();
								Array.from(operationsMap).forEach(([key, value], index) => {
									const pageIndex = value.pageIndex ?? 0;
									if (!changesByPage.has(pageIndex)) {
										changesByPage.set(pageIndex, []);
									}
									const pageChanges = changesByPage.get(pageIndex);
									if (pageChanges) {
										pageChanges.push([key, value, index]);
									}
								});

								// Sort pages
								const sortedPages = Array.from(changesByPage.keys()).sort(
									(a, b) => a - b,
								);

								return sortedPages.map((pageIndex) => {
									const pageChanges = changesByPage.get(pageIndex);
									if (!pageChanges) return null;

									return (
										<div key={`page-${pageIndex}`}>
											<div className="bg-gray-100 dark:bg-[#26221E] p-2 text-sm font-medium text-gray-700 dark:text-gray-300 sticky top-0">
												Page {pageIndex + 1}
											</div>
											{pageChanges.map(([key, value, index]) => (
												<button
													key={key}
													type="button"
													className={`p-2 border rounded mx-auto mb-2 w-11/12 cursor-pointer transition-all text-left block ${
														selectedChangeIndex === index
															? "border-blue-600 bg-blue-50 dark:bg-[hsla(317,30%,24%,1)] dark:border-[#E095CB] border-2 shadow-md"
															: "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
													}`}
													onClick={() => handleChangeClick(value, index)}
												>
													<div className="flex justify-between p-1 pl-0">
														<div className="text-gray-400 text-xs">
															{value.insert && value.del
																? "replaced"
																: value.insert
																	? "inserted"
																	: "deleted"}
														</div>
														{plusMinusDisplayText(value)}
													</div>
													<div>
														{value.deleteText && (
															<p className="text-xs mb-0.5">
																<span className="bg-delete-highlight">
																	{value.deleteText}
																</span>
															</p>
														)}
														{value.insertText && (
															<p className="text-xs">
																<span className="bg-insert-highlight">
																	{value.insertText}
																</span>
															</p>
														)}
													</div>
												</button>
											))}
										</div>
									);
								});
							})()}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
