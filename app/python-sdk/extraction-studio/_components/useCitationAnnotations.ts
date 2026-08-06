import type { Instance, RectangleAnnotation } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";
import {
  appearance,
  type CitationStyle,
  diffStyles,
  fracToRect,
  type IndexedCitation,
  type PaintedStyle,
  resolveHex,
  styleFor,
} from "../lib/citations";
import { getNutrientViewer } from "../lib/nutrient";

// Restyle only the annotations whose style changed, then scroll the selected one
// into view. Deliberately outside the component: the annotation-sync effect still
// calls this itself when the selection moves while its `create` is in flight —
// belt-and-braces rather than a necessity since serialisation, because the queued
// emphasis run lands behind the sync task and finds the maps already populated.
// See the call site.
//
// Never call this directly. It must run inside the hook's mutation queue —
// either handed to `enqueue`, or called from a task already running on it, which
// is what the sync effect does. (A running task must NOT re-enter `enqueue`: it
// would chain onto a promise that cannot settle until the task itself returns,
// and deadlock.) That serialisation is what guarantees the awaited `update`
// below and the write-back beneath it cannot interleave with a rebuild or with
// another restyle. Two failures depend on it, and `diffStyles` can detect
// neither, because it only ever iterates `next`:
//   (a) a rebuild clearing the maps mid-update, with the continuation then
//       re-inserting entries for the batch that was just deleted. For a field
//       index dropped from the new citation set nothing would ever visit it
//       again, so the stale entry would be permanent.
//   (b) two runs overlapping, the later one winning on the canvas, and then the
//       earlier one's continuation overwriting the maps with its older styles.
//       The maps and the canvas would disagree, so the next click would compute
//       the wrong diff and skip annotations that genuinely need updating.
// A cancellation token used to guard these by discarding superseded write-backs.
// Ordering removes the overlap itself, so there is no longer a superseded
// write-back to discard.
async function applyEmphasis(
  instance: Instance,
  citations: IndexedCitation[],
  activeIndex: number | null,
  fieldToAnnotation: Map<number, RectangleAnnotation>,
  styles: Map<number, PaintedStyle>,
  hex: string,
) {
  const NutrientViewer = getNutrientViewer();
  if (!NutrientViewer) {
    // Unreachable once load() has resolved on the global — `instance` only
    // exists because it did — but this file's convention is that nothing
    // fails without saying so.
    console.error("NutrientViewer global unavailable; skipping emphasis");
    return;
  }

  // Scroll the citation itself into view, not merely its page — on a dense
  // document the page alone leaves the user hunting. This is the headline
  // feature of the whole linkage, so it runs BEFORE the restyle and carries its
  // own catch: a failed update must never silently cancel the navigation.
  if (activeIndex != null) {
    try {
      const hit = citations.find((c) => c.fieldIndex === activeIndex);
      if (hit) {
        const info = instance.pageInfoForIndex(hit.citation.page);
        // `pageInfoForIndex` returns `PageInfo | null` for an out-of-range
        // page. Throwing here (rather than letting the destructure below
        // throw its own TypeError) keeps the existing behaviour — caught by
        // the catch below, which must never cancel the navigation silently.
        if (!info)
          throw new Error(`no page info for page ${hit.citation.page}`);
        const { width, height } = info;
        const rect = fracToRect(hit.citation, width, height);
        instance.jumpToRect(
          hit.citation.page,
          new NutrientViewer.Geometry.Rect(rect),
        );
      }
    } catch (e) {
      console.error("citation jump failed:", e);
    }
  }

  // `next` is built from the full `citations` list, but `styles` (and
  // `fieldToAnnotation`) are keyed only on `buildable` — the subset that
  // survived the per-citation try/catch in the sync effect below. A citation
  // skipped there never gets a `styles` entry, yet still lands in `next` here,
  // so `diffStyles` reports it "changed" on every single call from now on:
  // there is no prior value it can ever match. That entry is then filtered
  // out below when `fieldToAnnotation.get()` returns undefined, so behaviour
  // stays correct — still exactly the annotations that exist get updated —
  // but it does mean the `if (!changed.length) return` fast path just below
  // is permanently defeated for the rest of the session once any citation
  // fails to build. Harmless (a discarded `.map`/`.filter` over a small list),
  // but worth knowing so it isn't mistaken for a leak or a bug on rediscovery.
  const next = new Map<number, PaintedStyle>();
  for (const entry of citations) {
    next.set(entry.fieldIndex, {
      style: styleFor(entry.fieldIndex, activeIndex),
      hex: resolveHex(entry, hex),
    });
  }
  const changed = diffStyles(styles, next);
  if (!changed.length) return;

  try {
    // Annotations are Immutable records, so `.set()` returns a new record
    // rather than mutating — the result is what gets passed to update(), and
    // what replaces the stored object.
    const updated = changed
      .map((fieldIndex) => {
        const annotation = fieldToAnnotation.get(fieldIndex);
        if (!annotation) return null;
        const painted = next.get(fieldIndex);
        if (!painted) return null;
        const style = appearance(painted.style, painted.hex);
        const restyled = annotation
          .set("strokeColor", new NutrientViewer.Color(style.stroke))
          .set("strokeWidth", style.strokeWidth)
          .set("fillColor", new NutrientViewer.Color(style.fill))
          .set("opacity", style.opacity);
        return { fieldIndex, restyled };
      })
      .filter(
        (u): u is { fieldIndex: number; restyled: RectangleAnnotation } =>
          u !== null,
      );
    if (!updated.length) return;

    await instance.update(updated.map((u) => u.restyled));
    for (const { fieldIndex, restyled } of updated) {
      fieldToAnnotation.set(fieldIndex, restyled);
      const painted = next.get(fieldIndex);
      if (painted) styles.set(fieldIndex, painted);
    }
  } catch (e) {
    console.error("citation emphasis failed:", e);
  }
}

export function useCitationAnnotations(opts: {
  instanceRef: React.RefObject<Instance | null>;
  ready: boolean;
  citations: IndexedCitation[];
  activeIndex: number | null;
  showCitations: boolean;
  /** Hex fill color for the highlights. Part of PaintedStyle, so changing it
   *  registers in `diffStyles` and restyles every annotation — see the note on
   *  PaintedStyle in lib/citations.ts. */
  citationHex: string;
}) {
  const {
    instanceRef,
    ready,
    citations,
    activeIndex,
    showCitations,
    citationHex,
  } = opts;

  // annotation id → field index (for the press direction), field index →
  // the annotation object itself (so restyling never needs a lookup by id),
  // and the style each one currently carries.
  const idToField = useRef(new Map<string, number>());
  const fieldToAnnotation = useRef(new Map<number, RectangleAnnotation>());
  const styles = useRef(new Map<number, PaintedStyle>());

  // Every annotation mutation — rebuilds and restyles alike — runs through this
  // one chain, so an awaited update and the write-back that follows it always
  // complete before the next mutation starts. That ordering is what makes a
  // cancellation token unnecessary: there is no longer a window in which a
  // superseded continuation can write to the maps. Clearing the three maps
  // counts as a mutation and belongs on the chain too — a clear that lands
  // mid-update is precisely failure (a) described above `applyEmphasis`.
  //
  // The structural cost of a single chain is head-of-line blocking: a task whose
  // `await` never settles stalls every later annotation mutation for the rest of
  // the session, and does it without a trace, because the chain's `.catch` below
  // cannot fire on a hang. Under the old cancellation token a hung run stalled
  // only itself. Nothing suggests the three SDK calls can hang — `update`
  // rejects rather than stalling, even against an unloaded instance — so this is
  // theoretical, and deliberately not defended with a timeout: letting the next
  // mutation start while a hung one might still resolve would reintroduce
  // exactly the overlap this chain exists to prevent.
  const queue = useRef<Promise<void>>(Promise.resolve());

  // A task already running on this chain must never wait on its own enqueued
  // work re-entering the chain: the promise would not settle until that task
  // returns, so it would be waiting on itself, deadlocking the whole chain
  // permanently and silently — the chain's `.catch` below cannot fire on a
  // hang. `enqueue` returns `void` specifically so that mistake cannot be
  // made: `await enqueue(...)` degrades to `await undefined`, a benign no-op,
  // rather than a working-looking expression that is a trap. Detecting the
  // mistake was never on the table — the browser has no AsyncLocalStorage, so
  // there is no way to ask "am I currently inside a queued task?" — only
  // preventing it was, and returning `void` is the prevention. Call the work
  // directly instead, as the sync effect does.
  const enqueue = useCallback((task: () => Promise<void>): void => {
    const run = queue.current.then(task);
    // Keep the chain alive after a failure so one bad mutation cannot poison
    // every later one — but say so rather than swallowing. A throw escaping a
    // task's own try/catch would otherwise produce no output at all, and this
    // file's convention is that nothing fails without saying so. Attaching the
    // handler also marks `run` as handled, so the `void enqueue(...)` call
    // sites cannot produce an unhandled rejection.
    queue.current = run.catch((e) => {
      console.error("queued annotation mutation failed:", e);
    });
  }, []);

  // The sync effect below needs the current selection to style newly created
  // annotations, but must NOT re-run when the selection changes — that is the
  // emphasis effect's job. Reading it through a ref keeps it out of the deps
  // without needing a lint suppression of its own. (The suppression below is
  // for `instanceRef.current`, not for this.)
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // ── Sync the annotation set. Created once per (document, citation set);
  // selection changes never come through here.
  //
  // Must stay declared BEFORE the emphasis effect. React runs effects in
  // declaration order, so that order is what puts `sync` on the chain first when
  // one commit changes both the citation set and the selection — which is what
  // lets the emphasis task find the maps already populated instead of cleared.
  // Swapping the two only costs a wasted `update` round-trip (the rebuild
  // already styles from `activeIndexRef`, and the following diff self-corrects),
  // so it degrades rather than corrupts — but the dependency is invisible from
  // either effect on its own, hence this note.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome flags `instanceRef.current`, not `instanceRef`. The whole point of `.current` is that it is not stable, so listing it would rebuild the entire annotation layer on every instance swap; `ready` flipping true is the signal this effect is meant to react to.
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !ready) return;
    let cancelled = false;

    const NutrientViewer = getNutrientViewer();
    if (!NutrientViewer) {
      // Unreachable once load() has resolved on the global — `instance` only
      // exists because it did — but this file's convention is that nothing
      // fails without saying so.
      console.error(
        "NutrientViewer global unavailable; skipping annotation sync",
      );
      return;
    }
    const sync = async () => {
      // Read and clear INSIDE the task, not in the effect body. On the chain,
      // any restyle enqueued earlier has already finished its write-back, so
      // `previousIds` sees every id currently on the canvas and the clear
      // cannot strand a continuation that is still mid-update. Clearing from
      // the effect body would leave exactly the window failure (a) needs.
      const previousIds = [...idToField.current.keys()];
      idToField.current.clear();
      fieldToAnnotation.current.clear();
      styles.current.clear();

      if (previousIds.length) {
        try {
          await instance.delete(previousIds);
        } catch (e) {
          // `delete` rejects if ANY id could not be removed. Aborting the
          // rebuild here would leave the layer empty with the ids already
          // forgotten — unrecoverable. Possible duplicates are the lesser
          // evil, so log and carry on to create the new set.
          console.error("citation annotation delete failed:", e);
        }
      }
      if (cancelled || !showCitations || !citations.length) return;

      try {
        const selected = activeIndexRef.current;

        // Each annotation is built independently so one malformed citation —
        // an out-of-range page, a degenerate rect — cannot cost the entire
        // highlight layer. `buildable` and `built` stay index-aligned with each
        // other (and, after `create`, with `created`), which is why the
        // post-create bookkeeping below keys off `buildable` rather than the
        // original `citations`: if an entry were skipped, indexing into
        // `citations` would map the wrong annotation id to the wrong field.
        const buildable: IndexedCitation[] = [];
        const built: RectangleAnnotation[] = [];
        const skipped: number[] = [];
        for (const entry of citations) {
          try {
            const { fieldIndex, citation } = entry;
            const info = instance.pageInfoForIndex(citation.page);
            // See the matching guard in applyEmphasis: `pageInfoForIndex` can
            // return null for an out-of-range page. Throwing here is caught
            // by this loop's own catch, isolating the one bad citation
            // instead of the whole sync.
            if (!info)
              throw new Error(`no page info for page ${citation.page}`);
            const { width, height } = info;
            const rect = fracToRect(citation, width, height);
            // A citation's own hex wins, so a box is created with its
            // confidence colour rather than created in the picker's colour
            // and then repainted by the emphasis effect.
            const style = appearance(
              styleFor(fieldIndex, selected),
              resolveHex(entry, citationHex),
            );
            built.push(
              new NutrientViewer.Annotations.RectangleAnnotation({
                pageIndex: citation.page,
                boundingBox: new NutrientViewer.Geometry.Rect(rect),
                strokeColor: new NutrientViewer.Color(style.stroke),
                strokeWidth: style.strokeWidth,
                fillColor: new NutrientViewer.Color(style.fill),
                opacity: style.opacity,
              }),
            );
            buildable.push(entry);
          } catch (e) {
            // One bad citation must not cost the whole highlight layer.
            skipped.push(entry.fieldIndex);
            console.error("skipped citation for field", entry.fieldIndex, e);
          }
        }
        if (skipped.length) {
          console.warn(
            `${skipped.length} of ${citations.length} citations could not be drawn:`,
            skipped,
          );
        }

        if (!built.length) {
          // Nothing built — either there were no citations, or every one
          // failed (the aggregate warning above says which). The previous
          // batch is already deleted and the maps are already cleared, so
          // the layer is correctly empty; calling create([]) would only add
          // a dependency on how the SDK handles an empty array.
          return;
        }

        // `Instance#create()` isn't generic over its input: it always resolves
        // to `Change[]`, the union of everything creatable (annotations, form
        // fields, bookmarks, comments), regardless of what was passed in. We
        // only ever pass `RectangleAnnotation[]` here, so narrow to what was
        // actually created.
        const created = (await instance.create(built)) as RectangleAnnotation[];
        if (cancelled) {
          // A newer sync has already superseded this one. It read its
          // `previousIds` from an idToField this run had *already* cleared,
          // so it cannot know these ids — only this closure can. Without
          // this the batch would linger on the page forever: unclickable
          // (absent from idToField) and never restyled.
          try {
            await instance.delete(created.map((a) => a.id));
          } catch (e) {
            console.error("superseded citation batch cleanup failed:", e);
          }
          return;
        }

        // `create` resolves to the created annotations carrying generated
        // ids (index.d.ts:11639), in the order they were passed. Keeping
        // the objects means the emphasis effect can `.set()` on them
        // directly, with no lookup by id.
        created.forEach((annotation, i) => {
          // `created` is positional against `built`, not the original
          // `citations` — a skipped citation would otherwise shift every
          // later index and map the wrong annotation id to the wrong field.
          const entry = buildable[i];
          const { fieldIndex } = entry;
          idToField.current.set(annotation.id, fieldIndex);
          fieldToAnnotation.current.set(fieldIndex, annotation);
          styles.current.set(fieldIndex, {
            style: styleFor(fieldIndex, selected),
            // Must match the hex actually used to build the annotation above,
            // or the very next diff would see a mismatch and repaint it.
            hex: resolveHex(entry, citationHex),
          });
        });

        // The selection can move while `create` is in flight, leaving the
        // fresh batch carrying `selected`'s styles. Called directly, not via
        // `enqueue`: this task is already the running link in the chain, so
        // re-entering the queue here would deadlock (see applyEmphasis).
        //
        // Belt-and-braces since serialisation: the emphasis effect that fired
        // for the moved selection is queued *behind* this task and now finds
        // the maps populated, so it would correct the styles on its own. Under
        // the old cancellation token it found them cleared and could not.
        // Keeping it costs one no-op diff and closes the gap sooner.
        if (activeIndexRef.current !== selected) {
          await applyEmphasis(
            instance,
            citations,
            activeIndexRef.current,
            fieldToAnnotation.current,
            styles.current,
            citationHex,
          );
        }
      } catch (e) {
        // The document is still perfectly readable without highlights, so
        // this must not become a blocking error.
        console.error("citation annotation sync failed:", e);
      }
    };

    void enqueue(sync);
    return () => {
      cancelled = true;
    };
  }, [citations, showCitations, ready, enqueue, citationHex]);

  // ── Apply selection: restyle only what changed, then scroll it into view.
  // No teardown: the chain already guarantees this run's write-back completes
  // before the next mutation starts, so there is nothing for an unmount to
  // revoke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome flags `instanceRef.current`, not `instanceRef`. The whole point of `.current` is that it is not stable, so listing it would restyle on every instance swap; `ready` flipping true is the signal this effect is meant to react to.
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !ready) return;
    void enqueue(() =>
      applyEmphasis(
        instance,
        citations,
        activeIndex,
        fieldToAnnotation.current,
        styles.current,
        citationHex,
      ),
    );
    // citationHex belongs here: it is what makes a color change repaint. The
    // style KEYS are unchanged when only the color moves, so without this dep
    // the effect never re-runs and the new color never reaches the canvas.
  }, [activeIndex, citations, ready, enqueue, citationHex]);

  /**
   * Maps a pressed annotation's id back to the field index it cites, for the
   * document → sidebar direction. Returns null for an unknown id — the normal
   * answer once a rebuild's queued task has cleared the maps, and for any
   * annotation this hook did not create. Note it is not null for the whole of a
   * rebuild: between the citation-set commit and that task actually running, the
   * old ids still resolve, so a press on a highlight that is still on screen can
   * return a stale field index rather than null. Stable identity, so registering
   * it in a load-time listener never goes stale.
   */
  const resolveFieldIndex = useCallback(
    (annotationId: string | undefined) =>
      annotationId != null
        ? (idToField.current.get(annotationId) ?? null)
        : null,
    [],
  );

  /**
   * Forgets the annotation layer: called when the document goes away, at which
   * point the annotations themselves die with the instance and only the maps
   * need dropping.
   *
   * Queued rather than immediate, and that matters. This used to bump the
   * cancellation token so a restyle still mid-`update` could not write back into
   * the maps it had just cleared. With the token gone, clearing synchronously
   * would reopen exactly that hole, so the clear goes on the chain instead and
   * lands after any in-flight write-back. Callers must therefore not assume the
   * maps are empty the instant this returns — nothing reads them in between,
   * because the instance is being torn down.
   *
   * Stable identity: `enqueue` is itself stable, so this never changes.
   */
  const reset = useCallback(() => {
    void enqueue(async () => {
      idToField.current.clear();
      fieldToAnnotation.current.clear();
      styles.current.clear();
    });
  }, [enqueue]);

  return { resolveFieldIndex, reset };
}
