/** Save a string as a file. Extracted when the third results panel needed it —
 *  OcrResults and StructuredResults each carried a hand-maintained copy,
 *  including the deferred-revoke comment verbatim. */
export function downloadText(
  text: string,
  filename: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Deferred: revoking synchronously races the browser's internal blob fetch
  // for the download in some browsers (notably older Safari).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Copy to the clipboard, reporting success rather than throwing.
 *
 *  Both prior call sites called `navigator.clipboard.writeText(...)` bare. Two
 *  ways that fails: a denied permission rejects the promise, and in a
 *  NON-SECURE CONTEXT `navigator.clipboard` is `undefined`, so the property
 *  access throws synchronously — which is why this is a try/catch around the
 *  call and not merely a `.catch()` on the promise. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
