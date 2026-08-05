"use client";
import { useMemo, useState } from "react";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
// Global CSS, deliberately scoped under .studio-shell — see styles.css.
import "./styles.css";
import { CategorySelect } from "./_components/CategorySelect";
import { DocStrip } from "./_components/DocStrip";
import { DocViewer } from "./_components/DocViewer";
import { FEATURES, FeatureRail } from "./_components/FeatureRail";
import { Segmented } from "./_components/Segmented";
import { StructuredConfig } from "./_components/StructuredConfig";
import { StructuredResults } from "./_components/StructuredResults";
import type {
  Envelope,
  FieldResult,
  StructuredData,
  StructuredRequest,
} from "./lib/api";
import { extractStructured } from "./lib/api";
import { presetFor } from "./lib/categories";
import { DEFAULT_CITATION_HEX, indexCitations } from "./lib/citations";
import { DOCUMENTS, findDoc } from "./lib/docs";

export default function ExtractionStudio() {
  const [feature, setFeature] = useState("structured");
  const [doc, setDoc] = useState(DOCUMENTS[0].docId);
  const [category, setCategory] = useState(DOCUMENTS[0].category);
  const [tab, setTab] = useState("config");
  const [result, setResult] = useState<Envelope | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runSignal, setRunSignal] = useState(0);
  // False until StructuredConfig's providers fetch resolves successfully, and
  // forced back to false if that fetch fails. Gates Run: clicking before this
  // is true would send the hardcoded initial `provider: "openai"` from
  // StructuredConfig, which is wrong on any deployment where OpenAI isn't the
  // one configured — and Bedrock is currently the only provider with its own
  // not-configured guard.
  const [providersReady, setProvidersReady] = useState(false);
  const [showCitations, setShowCitations] = useState(true);
  // Session state on purpose, not persisted: every demo then opens in the
  // same known-good colour rather than whatever the last viewer picked.
  const [citationHex, setCitationHex] = useState(DEFAULT_CITATION_HEX);

  // The document list is a code manifest, not a fetch — the backend is
  // stateless and Next serves these from public/. Nothing to load, so no
  // loading state and no fallback list.
  const current = findDoc(doc) ?? DOCUMENTS[0];

  const visibleDocs = useMemo(
    () => DOCUMENTS.filter((d) => d.category === category),
    [category],
  );

  // MUST be memoised on [category]. StructuredConfig's preset effect keys on
  // this value's identity and presetFor returns a fresh array every call, so an
  // inline call here would re-fire that effect every render and loop forever.
  const schemaPreset = useMemo(() => presetFor(category), [category]);

  // A new document invalidates everything derived from the previous one.
  const selectDoc = (docId: string) => {
    setDoc(docId);
    setResult(null);
    setActiveIndex(null);
    setError(null);
    setTab("config");
  };

  // Auto-selecting the category's first document keeps the viewer from showing
  // a document from a different category than the active tab. Routing through
  // selectDoc also clears result/activeIndex/error, so citations from the
  // previous document cannot survive a category change.
  const selectCategory = (next: string) => {
    setCategory(next);
    const first = DOCUMENTS.find((d) => d.category === next);
    if (first) selectDoc(first.docId);
  };

  const fields = (result?.data?.fields as FieldResult[] | undefined) ?? [];

  // Deps are [result], NOT [fields]. `fields` is rebuilt on every render
  // (`result?.data?.fields ?? []`), so keying on it hands DocViewer a new array
  // identity every render — and its annotation-sync effect, which keys on
  // `citations`, would delete and recreate every annotation continuously.
  // `result` only changes when an extraction actually returns.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `fields` is a fresh array every render, so keying on it would thrash the annotation layer; `result` is the real input.
  const citations = useMemo(() => indexCitations(fields), [result]);

  const currentFeature = FEATURES.find((f) => f.id === feature);

  const handleRun = async (req: StructuredRequest) => {
    setBusy(true);
    setError(null);
    setActiveIndex(null);
    try {
      const envelope = await extractStructured(req);
      setResult(envelope);
      setTab("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
      // Leaving the previous result rendered under the error callout shows
      // stale data as current — and after a document switch those citations
      // belong to a different document entirely.
      setResult(null);
      setActiveIndex(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    // A DEFINITE height, not min-height: .studio-shell is `flex: 1;
    // min-height: 0`, so it needs a parent of definite height to fill.
    // With min-height the viewer and results panes cannot resolve their own
    // scroll containers.
    //
    // Height is 100dvh MINUS the host's sticky `header.topbar`, because this
    // element starts below it — plain `h-screen` (100vh) overflowed the viewport
    // by exactly the topbar's height, which pushed the bottom of the rail and
    // the results panel off-screen where `overflow-hidden` made them
    // unreachable.
    //
    // The topbar has no fixed height: it comes from `.topbar-inner`'s padding in
    // app/globals.css, which is 16px below 768px and 18px at/above it — 67px and
    // 71px including the 1px bottom border. Tailwind's `md` is that same 768px,
    // so these two values track the host's own breakpoint. If `.topbar-inner`
    // padding changes, change these.
    <div
      className="h-[calc(100dvh-67px)] md:h-[calc(100dvh-71px)] flex flex-col overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <PythonSampleHeader
        title="Structured Extraction"
        description="Pull a JSON schema's fields out of a document with the SDK's native structured extraction — every value carries a citation you can click to find it on the page."
      />
      <div className="studio-shell">
        {/* Rail column: features, then the category control, then the documents
            for that category. Document selection lives here rather than under
            the viewer because there it sat below the fold — the page is
            h-screen/overflow-hidden, so anything past the viewport is not
            merely unscrolled but unreachable. Each stays its own landmark
            (`nav[aria-label="Sample documents"]`) rather than being folded into
            "Features". */}
        <div className="studio-rail">
          <FeatureRail
            features={FEATURES}
            value={feature}
            onSelect={setFeature}
          />
          <CategorySelect
            docs={DOCUMENTS}
            value={category}
            onSelect={selectCategory}
          />
          <DocStrip
            docs={visibleDocs}
            value={doc}
            category={category}
            onSelect={selectDoc}
          />
        </div>

        <section className="studio-viewer">
          <DocViewer
            docPath={current.path}
            citations={citations}
            activeIndex={activeIndex}
            showCitations={showCitations}
            citationHex={citationHex}
            onCitationPress={(i) => {
              setActiveIndex(i);
              setTab("results");
            }}
          />
        </section>

        <aside className="studio-panel">
          <div className="studio-panel-head">
            <div className="feature-title">
              <strong>{currentFeature?.label ?? "Feature"}</strong>
              {currentFeature?.blurb && (
                <p className="muted">{currentFeature.blurb}</p>
              )}
            </div>
            <div className="studio-panel-actions">
              <Segmented
                options={[
                  { label: "Configuration", value: "config" },
                  { label: "Results", value: "results" },
                ]}
                value={tab}
                onChange={setTab}
              />
              <button
                type="button"
                className="panel-button primary"
                disabled={busy || !providersReady}
                onClick={() => setRunSignal((n) => n + 1)}
              >
                {busy ? "Running…" : "Run extraction"}
              </button>
            </div>
          </div>
          <div className="studio-panel-body">
            {error && (
              <div
                className="callout"
                role="alert"
                style={{
                  borderColor: "var(--danger, #C8553C)",
                  marginBottom: "var(--space-3)",
                }}
              >
                Extraction failed: {error}
              </div>
            )}
            {/* Hidden, never unmounted. StructuredConfig owns both the schema
                the user built and the `runSignal` consumer, so unmounting it
                on the Results tab reset the schema to defaults on every round
                trip and left `Run extraction` inert. */}
            <div hidden={tab !== "config"}>
              <StructuredConfig
                docPath={current.path}
                filename={current.filename}
                onRun={handleRun}
                runSignal={runSignal}
                schemaPreset={schemaPreset}
                onProvidersReady={setProvidersReady}
              />
            </div>
            {tab === "results" &&
              (result ? (
                <StructuredResults
                  data={result.data as StructuredData}
                  code={result.code}
                  timingMs={result.timingMs}
                  activeIndex={activeIndex}
                  onSelectField={setActiveIndex}
                  showCitations={showCitations}
                  citationHex={citationHex}
                  onCitationHexChange={setCitationHex}
                  onShowCitationsChange={setShowCitations}
                />
              ) : (
                <div className="panel-section">
                  <p className="muted">Run an extraction to see results.</p>
                </div>
              ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
