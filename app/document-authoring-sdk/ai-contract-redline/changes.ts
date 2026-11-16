/** Pure helpers for the Changes panel (unit-tested). */

export type PendingRevision = { id: string; type: string; preview: string };

export type ChangeGroup = {
  /** Tool-call id for agent edits, or `manual-<revisionId>` for human edits. */
  key: string;
  ruleId: string | null;
  rationale: string;
  revisionIds: string[];
  /** The agent's review-comment thread, resolved when the edit is decided. */
  threadId?: string;
};

/**
 * The SDK records a replaced phrase as one deletion revision per word and per
 * space. Merge consecutive revisions of the same type into one readable run.
 */
export function mergeRuns(
  revisions: PendingRevision[],
): { type: string; text: string }[] {
  const runs: { type: string; text: string }[] = [];
  for (const r of revisions) {
    const last = runs.at(-1);
    if (last && last.type === r.type) last.text += r.preview;
    else runs.push({ type: r.type, text: r.preview });
  }
  return runs.map((run) => ({ ...run, text: run.text.trim() }));
}

/** "PB-3: renewal notice cut to 30 days" -> "PB-3". */
export function ruleIdOf(text: string): string | null {
  return text.match(/\bPB-\d+\b/)?.[0] ?? null;
}

/** Revisions present after a write that weren't there before it. */
export function newRevisionIds(
  before: Set<string>,
  after: PendingRevision[],
): string[] {
  return after.filter((r) => !before.has(r.id)).map((r) => r.id);
}

/**
 * Reconcile groups with what is still pending: drop decided revisions, drop
 * groups left empty, and give any pending revision no group claims (a human
 * edit, or one made before the panel loaded) its own group.
 */
export function reconcile(
  groups: ChangeGroup[],
  pending: PendingRevision[],
): ChangeGroup[] {
  const live = new Set(pending.map((r) => r.id));
  const kept = groups
    .map((g) => ({
      ...g,
      revisionIds: g.revisionIds.filter((id) => live.has(id)),
    }))
    .filter((g) => g.revisionIds.length > 0);
  const claimed = new Set(kept.flatMap((g) => g.revisionIds));
  const orphans = pending
    .filter((r) => !claimed.has(r.id))
    .map((r) => ({
      key: `manual-${r.id}`,
      ruleId: null,
      rationale: "Manual edit",
      revisionIds: [r.id],
    }));
  return [...kept, ...orphans];
}
