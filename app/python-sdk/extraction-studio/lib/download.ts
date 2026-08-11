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

/** Copy to the clipboard, resolving to whether it succeeded rather than
 *  throwing or rejecting.
 *
 *  Both prior call sites called `navigator.clipboard.writeText(...)` bare. Two
 *  ways that fails: a denied permission rejects the promise, and in a
 *  NON-SECURE CONTEXT `navigator.clipboard` is `undefined`, so the property
 *  access throws synchronously — which is why this is a try/catch around the
 *  call and not merely a `.catch()` on the promise.
 *
 *  The returned boolean is currently UNUSED by all three call sites
 *  (StructuredResults, OcrResults, TablesResults each fire-and-forget
 *  `onClick={() => copyText(payload())}`), so a failed copy is silent —
 *  arguably worse than the bare-call behaviour this replaced, where a denied
 *  permission at least surfaced as an unhandled rejection in the console.
 *  Left this way deliberately for now: none of the three panels has any
 *  existing UI for reporting a transient action's failure (no toast, no
 *  inline status), and building one is a bigger change than this Copy
 *  button's actual failure rate justifies in a browser clipboard demo. The
 *  boolean exists so a call site CAN act on it the day that changes. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
