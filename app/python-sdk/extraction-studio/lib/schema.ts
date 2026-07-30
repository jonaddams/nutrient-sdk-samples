export type SchemaProp = {
  /** Stable across reorders and removals, so React keys don't reuse DOM nodes
   *  (which lands focus and IME state on the wrong row). Never serialised. */
  id: string;
  key: string;
  type: string;
  description: string;
  optional: boolean;
};

let nextPropId = 0;

export function newSchemaProp(
  partial?: Partial<Omit<SchemaProp, "id">>,
): SchemaProp {
  nextPropId += 1;
  return {
    key: "",
    type: "string",
    description: "",
    optional: false,
    ...partial,
    id: `prop-${nextPropId}`,
  };
}

export function buildSchema(props: SchemaProp[]): string {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];
  for (const p of props) {
    if (!p.key) continue;
    properties[p.key] = { type: p.type, description: p.description };
    if (!p.optional) required.push(p.key);
  }
  return JSON.stringify({ schema: { type: "object", properties, required } });
}
