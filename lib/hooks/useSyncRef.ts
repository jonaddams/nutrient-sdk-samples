"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to keep a ref synchronized with a state value
 * Useful for accessing current state in closures without re-creating them
 *
 * @template T - The type of the value to sync
 * @param value - The state value to keep in sync
 * @returns A mutable ref that always contains the current value
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * const countRef = useSyncRef(count);
 *
 * const handleClick = useCallback(() => {
 *   // countRef.current always has the latest count
 *   console.log(countRef.current);
 * }, []); // No need to include count in deps
 * ```
 */
export function useSyncRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
