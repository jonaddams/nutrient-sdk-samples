/**
 * Type guard utilities for safe type assertions
 * Provides safe helpers for working with SDK types
 */

import type { Annotation } from "@/lib/types/nutrient";

/**
 * Safely extracts annotation ID from SDK annotation creation result
 * @param created - Array of created items from SDK
 * @returns Annotation ID or null if not available
 */
export function extractAnnotationId(created: unknown[]): string | null {
	if (!Array.isArray(created) || created.length === 0) {
		return null;
	}

	const annotation = created[0] as { id?: string };
	// Validate ID is non-empty string
	return typeof annotation.id === "string" && annotation.id.trim().length > 0
		? annotation.id
		: null;
}

/**
 * Safely converts SDK annotation to typed Annotation
 * @param item - Unknown annotation item from SDK
 * @returns Typed Annotation or null if invalid
 */
export function toAnnotation(item: unknown): Annotation | null {
	if (!item || typeof item !== "object") {
		return null;
	}

	const obj = item as Record<string, unknown>;

	// Validate required fields with stricter checks
	if (
		typeof obj.id !== "string" ||
		obj.id.trim().length === 0 ||
		typeof obj.pageIndex !== "number" ||
		obj.pageIndex < 0 ||
		!Number.isInteger(obj.pageIndex)
	) {
		return null;
	}

	return obj as Annotation;
}

/**
 * Type guard to check if value is a valid annotation
 * @param value - Value to check
 * @returns True if value is valid Annotation
 */
export function isAnnotation(value: unknown): value is Annotation {
	if (!value || typeof value !== "object") {
		return false;
	}

	const obj = value as Record<string, unknown>;
	return (
		typeof obj.id === "string" &&
		obj.id.trim().length > 0 &&
		typeof obj.pageIndex === "number" &&
		obj.pageIndex >= 0 &&
		Number.isInteger(obj.pageIndex)
	);
}
