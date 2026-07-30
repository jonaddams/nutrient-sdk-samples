import { expect, test } from "vitest";
import { buildSchema, newSchemaProp } from "../schema";

test("buildSchema wraps properties in the schema envelope", () => {
  const s = JSON.parse(
    buildSchema([
      {
        id: "p1",
        key: "invoiceNumber",
        type: "string",
        description: "the number",
        optional: false,
      },
    ]),
  );
  expect(s.schema.type).toBe("object");
  expect(s.schema.properties.invoiceNumber.type).toBe("string");
  expect(s.schema.properties.invoiceNumber.description).toBe("the number");
});

test("buildSchema ignores the row id", () => {
  const withId = buildSchema([
    {
      id: "a",
      key: "total",
      type: "number",
      description: "d",
      optional: false,
    },
  ]);
  expect(JSON.parse(withId).schema.properties.total).toEqual({
    type: "number",
    description: "d",
  });
  expect(withId).not.toContain('"id"');
});

test("newSchemaProp gives every row a distinct id", () => {
  const ids = [newSchemaProp(), newSchemaProp(), newSchemaProp()].map(
    (p) => p.id,
  );
  expect(new Set(ids).size).toBe(3);
});

test("newSchemaProp defaults to an empty string row and accepts overrides", () => {
  const blank = newSchemaProp();
  expect(blank).toMatchObject({
    key: "",
    type: "string",
    description: "",
    optional: false,
  });
  expect(newSchemaProp({ key: "total", type: "number" })).toMatchObject({
    key: "total",
    type: "number",
  });
});
