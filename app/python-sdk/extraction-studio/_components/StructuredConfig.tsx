"use client";
import { useEffect, useRef, useState } from "react";
import type { StructuredRequest } from "../lib/api";
import { buildSchema, newSchemaProp, type SchemaProp } from "../lib/schema";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

export function StructuredConfig({
  docPath,
  filename,
  onRun,
  runSignal,
  schemaPreset,
}: {
  docPath: string;
  filename: string;
  onRun: (req: StructuredRequest) => void;
  runSignal: number;
  /** MUST be referentially stable per category — see the effect below. */
  schemaPreset: SchemaProp[];
}) {
  const [mode, setMode] = useState("builder");
  const [props, setProps] = useState<SchemaProp[]>(schemaPreset);
  const [instructions, setInstructions] = useState("");
  const [provider, setProvider] = useState("openai");
  const [citations, setCitations] = useState(true);
  const [strict, setStrict] = useState(false);
  const [multimodal, setMultimodal] = useState(false);
  const [json, setJson] = useState(() => buildSchema(schemaPreset));

  // Switching category replaces the schema wholesale, discarding hand-edits.
  // That is deliberate: a demo-er changing category wants that category's
  // schema, not their last experiment.
  //
  // Keyed on schemaPreset's IDENTITY, so the caller must memoise it per
  // category. presetFor returns a fresh array every call, so calling it inline
  // during render would fire this effect every render and loop forever. On
  // mount it is a no-op: both setters receive values equal to current state, so
  // React bails out.
  useEffect(() => {
    setProps(schemaPreset);
    setJson(buildSchema(schemaPreset));
  }, [schemaPreset]);

  const update = (i: number, patch: Partial<SchemaProp>) =>
    setProps((p) =>
      p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );

  // `Run extraction` lives in the panel head so it is reachable from the
  // Results tab too, so the click arrives as an incrementing signal rather
  // than a direct call. Skip the initial render: 0 is not a request to run.
  const lastSignal = useRef(runSignal);
  useEffect(() => {
    if (runSignal === lastSignal.current) return;
    lastSignal.current = runSignal;
    onRun({
      docPath,
      filename,
      schema: mode === "builder" ? buildSchema(props) : json,
      instructions,
      provider,
      includeSourceLocations: citations,
      strict,
      includePageImages: multimodal,
    });
  }, [
    runSignal,
    docPath,
    filename,
    mode,
    props,
    json,
    instructions,
    provider,
    citations,
    strict,
    multimodal,
    onRun,
  ]);

  return (
    <div>
      <PanelSection title="Schema builder">
        <div className="studio-sec-head">
          <Segmented
            options={[
              { label: "Builder", value: "builder" },
              { label: "JSON", value: "json" },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        {mode === "builder" ? (
          <>
            <div className="schema-cols eyebrow">
              <span>Property key</span>
              <span>Type</span>
              <span>Optional</span>
              <span />
            </div>
            {props.map((p, i) => (
              <div className="schema-prop" key={p.id}>
                <div className="schema-cols">
                  <input
                    type="text"
                    placeholder="property key"
                    aria-label={`Property key ${i + 1}`}
                    value={p.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                  />
                  <select
                    value={p.type}
                    onChange={(e) => update(i, { type: e.target.value })}
                    aria-label={`Type for ${p.key || `property ${i + 1}`}`}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={p.optional}
                    aria-label={`${p.key || `Property ${i + 1}`} is optional`}
                    onChange={(e) => update(i, { optional: e.target.checked })}
                  />
                  <button
                    type="button"
                    className="btn ghost sm"
                    aria-label={`Remove ${p.key || `property ${i + 1}`}`}
                    onClick={() =>
                      setProps((x) => x.filter((_, idx) => idx !== i))
                    }
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  className="schema-prop-desc"
                  placeholder="description"
                  aria-label={`Description for ${p.key || `property ${i + 1}`}`}
                  value={p.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn sm"
              onClick={() => setProps((x) => [...x, newSchemaProp()])}
            >
              + Add property
            </button>
          </>
        ) : (
          <Field
            label="Schema JSON"
            htmlFor="cfg-schema-json"
            help="Edited directly; the builder is ignored while this tab is active."
          >
            <textarea
              id="cfg-schema-json"
              className="mono"
              rows={12}
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
          </Field>
        )}
      </PanelSection>

      <PanelSection title="Extraction rules">
        <Field
          label="Instructions"
          htmlFor="cfg-instructions"
          help="Optional natural-language guidance for the model, applied on top of the schema."
        >
          <textarea
            id="cfg-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Amounts are plain numbers without currency symbols."
          />
        </Field>
        <Field
          label="Provider"
          htmlFor="cfg-provider"
          help="Which model backend runs the extraction."
        >
          <select
            id="cfg-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="openai">OpenAI</option>
            <option value="local">Local (LM Studio)</option>
          </select>
        </Field>
      </PanelSection>

      <PanelSection title="Advanced options">
        <Toggle
          checked={citations}
          onChange={setCitations}
          label="Include citations"
          description="Return source rectangles so each value can be located on the document."
        />
        <Toggle
          checked={strict}
          onChange={setStrict}
          label="Strict schema"
          description="Enforce the JSON schema at the model provider (provider-enforced structured output)."
        />
        <Toggle
          checked={multimodal}
          onChange={setMultimodal}
          label="Multimodal"
          description="Send page images to the model alongside the parsed text."
        />
      </PanelSection>
    </div>
  );
}
