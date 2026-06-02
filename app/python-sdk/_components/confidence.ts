/** Tailwind text-color class for an OCR/VLM confidence score in [0,1]. */
export function confidenceColor(c: number): string {
  if (c >= 0.7) return "text-[var(--data-green)]";
  if (c >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

/** Tailwind background-color class for an OCR/VLM confidence score in [0,1]. */
export function confidenceBg(c: number): string {
  if (c >= 0.7) return "bg-green-100 dark:bg-green-900/30";
  if (c >= 0.4) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}
