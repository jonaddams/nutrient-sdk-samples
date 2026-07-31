"use client";
import { useMemo, useState } from "react";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
// Global CSS, deliberately scoped under .studio-shell — see styles.css.
import "./styles.css";
import { CategoryTabs } from "./_components/CategoryTabs";
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
import { indexCitations } from "./lib/citations";
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
  const [showCitations, setShowCitations] = useState(true);

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
    // h-screen, not min-h-screen: .studio-shell is `flex: 1; min-height: 0`, so
    // it needs a parent of DEFINITE height to fill. With min-height the viewer
    // and results panes cannot resolve their own scroll containers.
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <PythonSampleHeader
        title="Structured Extraction"
        description="Pull a JSON schema's fields out of a document with the SDK's native structured extraction — every value carries a citation you can click to find it on the page."
      />
      <div className="studio-shell">
        <FeatureRail
          features={FEATURES}
          value={feature}
          onSelect={setFeature}
        />

        <section className="studio-viewer">
          <DocViewer
            docPath={current.path}
            citations={citations}
            activeIndex={activeIndex}
            showCitations={showCitations}
            onCitationPress={(i) => {
              setActiveIndex(i);
              setTab("results");
            }}
          />
          <CategoryTabs
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
                disabled={busy}
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
