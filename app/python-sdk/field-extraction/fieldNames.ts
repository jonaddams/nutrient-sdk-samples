/** Split a comma-separated field-name string into trimmed, non-empty names. */
export function parseFieldNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
