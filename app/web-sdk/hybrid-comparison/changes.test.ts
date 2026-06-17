import { describe, expect, it } from "vitest";
import { extractChanges } from "./changes";

const fixture = {
  documentComparisonResults: [
    {
      comparisonResults: [
        {
          hunks: [
            {
              operations: [
                {
                  type: "equal",
                  text: "Suite 200",
                  originalTextBlocks: [],
                  changedTextBlocks: [],
                },
                {
                  type: "delete",
                  text: "24'-0\"",
                  originalTextBlocks: [{ rect: [100, 200, 40, 12] }],
                  changedTextBlocks: [],
                },
                {
                  type: "insert",
                  text: "26'-0\"",
                  originalTextBlocks: [],
                  changedTextBlocks: [{ rect: [100, 200, 40, 12] }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("extractChanges", () => {
  it("returns one entry per non-equal operation, tagged by type, with rects and the page index", () => {
    const changes = extractChanges(fixture, 0);
    expect(changes).toHaveLength(2);
    expect(changes[0]).toMatchObject({
      type: "delete",
      text: "24'-0\"",
      pageIndex: 0,
      rect: [100, 200, 40, 12],
    });
    expect(changes[1]).toMatchObject({
      type: "insert",
      text: "26'-0\"",
      pageIndex: 0,
      rect: [100, 200, 40, 12],
    });
    expect(changes[0].id).toBeTypeOf("string");
    expect(changes[0].id).not.toEqual(changes[1].id);
  });

  it("ignores equal operations and tolerates a missing/empty result", () => {
    expect(extractChanges({}, 0)).toEqual([]);
    expect(extractChanges({ documentComparisonResults: [] }, 2)).toEqual([]);
  });
});
