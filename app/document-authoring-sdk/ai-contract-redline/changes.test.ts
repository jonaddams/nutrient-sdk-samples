import { describe, expect, it } from "vitest";
import {
  type ChangeGroup,
  mergeRuns,
  newRevisionIds,
  reconcile,
  ruleIdOf,
} from "./changes";

const rev = (id: string) => ({ id, type: "insertion", preview: id });

describe("ruleIdOf", () => {
  it("pulls the playbook rule id out of a review comment", () => {
    expect(ruleIdOf("PB-3: renewal notice cut from 90 to 30 days")).toBe(
      "PB-3",
    );
    expect(ruleIdOf("Tightened wording")).toBeNull();
  });
});

describe("mergeRuns", () => {
  it("joins the per-word deletions the SDK emits into one phrase", () => {
    const words = ["fifteen", " ", "(15)", " ", "days"].map((preview, i) => ({
      id: `d${i}`,
      type: "deletion",
      preview,
    }));
    const ins = {
      id: "i0",
      type: "insertion",
      preview: "forty-five (45) days",
    };
    expect(mergeRuns([...words, ins])).toEqual([
      { type: "deletion", text: "fifteen (15) days" },
      { type: "insertion", text: "forty-five (45) days" },
    ]);
  });
});

describe("newRevisionIds", () => {
  it("returns only revisions created by the write", () => {
    expect(
      newRevisionIds(new Set(["a"]), [rev("a"), rev("b"), rev("c")]),
    ).toEqual(["b", "c"]);
  });
});

describe("reconcile", () => {
  const group: ChangeGroup = {
    key: "call-1",
    ruleId: "PB-1",
    rationale: "PB-1: 45 days",
    revisionIds: ["a", "b"],
  };

  it("drops decided revisions and empty groups", () => {
    expect(reconcile([group], [rev("b")])).toEqual([
      { ...group, revisionIds: ["b"] },
    ]);
    expect(reconcile([group], [])).toEqual([]);
  });

  it("gives unclaimed pending revisions (human edits) their own group", () => {
    const out = reconcile([group], [rev("a"), rev("b"), rev("z")]);
    expect(out.map((g) => g.key)).toEqual(["call-1", "manual-z"]);
    expect(out[1].rationale).toBe("Manual edit");
  });
});
