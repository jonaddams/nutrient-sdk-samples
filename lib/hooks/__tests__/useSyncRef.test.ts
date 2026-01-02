import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSyncRef } from "../useSyncRef";

describe("useSyncRef", () => {
  it("should initialize ref with the provided value", () => {
    const { result } = renderHook(() => useSyncRef(42));
    expect(result.current.current).toBe(42);
  });

  it("should update ref when value changes", () => {
    const { result, rerender } = renderHook(({ value }) => useSyncRef(value), {
      initialProps: { value: "initial" },
    });

    expect(result.current.current).toBe("initial");

    rerender({ value: "updated" });
    expect(result.current.current).toBe("updated");
  });

  it("should maintain stable ref identity across renders", () => {
    const { result, rerender } = renderHook(({ value }) => useSyncRef(value), {
      initialProps: { value: 1 },
    });

    const firstRef = result.current;
    rerender({ value: 2 });
    const secondRef = result.current;

    expect(firstRef).toBe(secondRef);
  });

  it("should work with complex objects", () => {
    const obj1 = { name: "test", value: 123 };
    const obj2 = { name: "updated", value: 456 };

    const { result, rerender } = renderHook(({ value }) => useSyncRef(value), {
      initialProps: { value: obj1 },
    });

    expect(result.current.current).toBe(obj1);

    rerender({ value: obj2 });
    expect(result.current.current).toBe(obj2);
  });

  it("should work with null and undefined", () => {
    const { result, rerender } = renderHook(({ value }) => useSyncRef(value), {
      initialProps: { value: null as string | null | undefined },
    });

    expect(result.current.current).toBe(null);

    rerender({ value: null });
    expect(result.current.current).toBe(null);

    rerender({ value: "value" });
    expect(result.current.current).toBe("value");
  });

  it("should allow ref mutation", () => {
    const { result } = renderHook(() => useSyncRef(10));

    expect(result.current.current).toBe(10);

    result.current.current = 20;
    expect(result.current.current).toBe(20);
  });
});
