import { describe, it, expect } from "vitest";
import {
  extractAnnotationId,
  toAnnotation,
  isAnnotation,
} from "../typeGuards";

describe("typeGuards", () => {
  describe("extractAnnotationId", () => {
    it("should extract id from valid created array", () => {
      const created = [{ id: "annotation-123", other: "data" }];
      expect(extractAnnotationId(created)).toBe("annotation-123");
    });

    it("should return null for empty array", () => {
      expect(extractAnnotationId([])).toBe(null);
    });

    it("should return null for non-array input", () => {
      expect(extractAnnotationId(null as any)).toBe(null);
      expect(extractAnnotationId(undefined as any)).toBe(null);
      expect(extractAnnotationId("string" as any)).toBe(null);
      expect(extractAnnotationId({} as any)).toBe(null);
    });

    it("should return null when first item has no id", () => {
      const created = [{ other: "data" }];
      expect(extractAnnotationId(created)).toBe(null);
    });

    it("should return null when id is not a string", () => {
      const created = [{ id: 123 }];
      expect(extractAnnotationId(created)).toBe(null);
    });
  });

  describe("toAnnotation", () => {
    it("should convert valid object to Annotation", () => {
      const obj = {
        id: "anno-1",
        pageIndex: 0,
        boundingBox: { left: 0, top: 0, width: 100, height: 50 },
      };
      const result = toAnnotation(obj);
      expect(result).toEqual(obj);
    });

    it("should return null for null or undefined", () => {
      expect(toAnnotation(null)).toBe(null);
      expect(toAnnotation(undefined)).toBe(null);
    });

    it("should return null for non-object types", () => {
      expect(toAnnotation("string")).toBe(null);
      expect(toAnnotation(123)).toBe(null);
      expect(toAnnotation(true)).toBe(null);
    });

    it("should return null when missing required id field", () => {
      const obj = { pageIndex: 0 };
      expect(toAnnotation(obj)).toBe(null);
    });

    it("should return null when missing required pageIndex field", () => {
      const obj = { id: "anno-1" };
      expect(toAnnotation(obj)).toBe(null);
    });

    it("should return null when id is not a string", () => {
      const obj = { id: 123, pageIndex: 0 };
      expect(toAnnotation(obj)).toBe(null);
    });

    it("should return null when pageIndex is not a number", () => {
      const obj = { id: "anno-1", pageIndex: "0" };
      expect(toAnnotation(obj)).toBe(null);
    });

    it("should accept additional properties", () => {
      const obj = {
        id: "anno-1",
        pageIndex: 0,
        customProp: "value",
        anotherProp: 123,
      };
      const result = toAnnotation(obj);
      expect(result).toEqual(obj);
    });
  });

  describe("isAnnotation", () => {
    it("should return true for valid annotation", () => {
      const annotation = {
        id: "anno-1",
        pageIndex: 0,
        boundingBox: { left: 0, top: 0, width: 100, height: 50 },
      };
      expect(isAnnotation(annotation)).toBe(true);
    });

    it("should return false for null or undefined", () => {
      expect(isAnnotation(null)).toBe(false);
      expect(isAnnotation(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(isAnnotation("string")).toBe(false);
      expect(isAnnotation(123)).toBe(false);
      expect(isAnnotation(true)).toBe(false);
      expect(isAnnotation([])).toBe(false);
    });

    it("should return false when missing id", () => {
      const obj = { pageIndex: 0 };
      expect(isAnnotation(obj)).toBe(false);
    });

    it("should return false when missing pageIndex", () => {
      const obj = { id: "anno-1" };
      expect(isAnnotation(obj)).toBe(false);
    });

    it("should return false when id is not a string", () => {
      const obj = { id: 123, pageIndex: 0 };
      expect(isAnnotation(obj)).toBe(false);
    });

    it("should return false when pageIndex is not a number", () => {
      const obj = { id: "anno-1", pageIndex: "0" };
      expect(isAnnotation(obj)).toBe(false);
    });

    it("should return true with additional properties", () => {
      const obj = {
        id: "anno-1",
        pageIndex: 0,
        extra: "data",
      };
      expect(isAnnotation(obj)).toBe(true);
    });

    it("should work as type guard", () => {
      const value: unknown = { id: "anno-1", pageIndex: 0 };

      if (isAnnotation(value)) {
        // TypeScript should know this is an Annotation now
        expect(value.id).toBe("anno-1");
        expect(value.pageIndex).toBe(0);
      }
    });
  });
});
