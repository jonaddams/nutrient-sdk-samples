"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
// Global CSS, deliberately scoped under .studio-shell — see styles.css.
import "./styles.css";
import { CategorySelect } from "./_components/CategorySelect";
import { DescribeConfig } from "./_components/DescribeConfig";
import { DescribeResults } from "./_components/DescribeResults";
import { DocStrip } from "./_components/DocStrip";
import { DocViewer } from "./_components/DocViewer";
import { FEATURES, FeatureRail } from "./_components/FeatureRail";
import { OcrConfig } from "./_components/OcrConfig";
import { OcrResults } from "./_components/OcrResults";
import { Segmented } from "./_components/Segmented";
import { StructuredConfig } from "./_components/StructuredConfig";
import { StructuredResults } from "./_components/StructuredResults";
import { TablesConfig } from "./_components/TablesConfig";
import { TablesResults } from "./_components/TablesResults";
import type {
  Envelope,
  FieldResult,
  StructuredData,
  StructuredRequest,
} from "./lib/api";
import { extractStructured } from "./lib/api";
import { presetFor } from "./lib/categories";
import {
  DEFAULT_CITATION_HEX,
  type IndexedCitation,
  indexCitations,
} from "./lib/citations";
import {
  type DescribeRequest,
  type DescribeResult,
  extractDescription,
} from "./lib/describe";
import { DOCUMENTS, findDoc } from "./lib/docs";
import {
  extractOcr,
  type OcrColorMode,
  type OcrRequest,
  type OcrResult,
  ocrCitationsFor,
} from "./lib/ocr";
import {
  extractTables,
  type TableColorMode,
  type TablesRequest,
  type TablesResult,
  tableCitationsFor,
} from "./lib/tables";

// Image description carries no citations — its output is prose with no
// coordinates. A literal `[]` inline in viewerCitations below would be a
// FRESH array every render, while the three sibling branches are all
// useMemo'd; see the identity rule at the `citations` useMemo above
// (page.tsx:136-142) — DocViewer's annotation-sync effect keys on `citations`
// identity, and a new array every render would thrash it exactly the way that
// comment warns against. Module-level keeps the identity stable across every
// render without needing its own useMemo.
const NO_CITATIONS: IndexedCitation[] = [];

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
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  // Shared with structured extraction's citations on purpose — one studio-wide
  // highlight colour that survives a rail switch, not two knobs that look
  // linked and are not. Only the MODE is OCR's own.
  const [ocrColorMode, setOcrColorMode] = useState<OcrColorMode>("confidence");
  const [tablesResult, setTablesResult] = useState<TablesResult | null>(null);
  // Its own mode, sharing citationHex with the other two features — one
  // studio-wide highlight colour that survives a rail switch.
  const [tableColorMode, setTableColorMode] =
    useState<TableColorMode>("confidence");
  const [describeResult, setDescribeResult] = useState<DescribeResult | null>(
    null,
  );

  // Read inside a request's continuation to detect a feature/document switch
  // that happened while the request was in flight — a plain closure over
  // `feature`/`doc` would only ever see the values from the moment the
  // request started. Neither ref causes a re-render; both are written on
  // every render, mirroring `pressRef` in DocViewer.tsx.
  const featureRef = useRef(feature);
  featureRef.current = feature;
  const docRef = useRef(doc);
  docRef.current = doc;

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

  // A new document invalidates everything derived from the previous one —
  // structured AND OCR results alike, or the previous document's boxes get
  // drawn over the new one's page at the previous document's coordinates.
  const selectDoc = (docId: string) => {
    setDoc(docId);
    setResult(null);
    setOcrResult(null);
    setTablesResult(null);
    setDescribeResult(null);
    setActiveIndex(null);
    setError(null);
    setTab("config");
  };

  // Auto-selecting the category's first document keeps the viewer from showing
  // a document from a different category than the active tab. Routing through
  // selectDoc also clears result/ocrResult/activeIndex/error, so citations
  // from the previous document cannot survive a category change.
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

  // Switching feature must not leave the previous feature's results on screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `feature` is the trigger, not a value read inside the effect — every setter here is stable. The point is to re-run this clear whenever `feature` changes, which biome can't see from the body alone.
  useEffect(() => {
    setResult(null);
    setOcrResult(null);
    setTablesResult(null);
    setDescribeResult(null);
    setError(null);
    setActiveIndex(null);
    // Only one config panel is mounted at a time, so `providersReady` is left
    // `true` by whichever mounted last. Without this reset, running
    // Structured (ready -> true) then switching to Tables would leave Run
    // enabled before TablesConfig's own provider fetch has resolved — the
    // exact early click the gate exists to prevent.
    setProvidersReady(false);
  }, [feature]);

  const ocrCitations = useMemo(
    () => ocrCitationsFor(ocrResult?.textElements ?? [], ocrColorMode),
    [ocrResult, ocrColorMode],
  );

  const tableCitations = useMemo(
    () => tableCitationsFor(tablesResult?.tables ?? [], tableColorMode),
    [tablesResult, tableColorMode],
  );

  const viewerCitations =
    feature === "structured"
      ? citations
      : feature === "tables"
        ? tableCitations
        : feature === "describe"
          ? NO_CITATIONS
          : ocrCitations;
  const viewerShow = feature === "structured" ? showCitations : showRegions;

  const currentFeature = FEATURES.find((f) => f.id === feature);

  // Shared shape for all three Run handlers below. It used to be three
  // hand-maintained copies, and hand-maintained copies drift: the inline OCR
  // version once forgot to clear activeIndex, which let a stale selection
  // survive a re-run and dim every box via styleFor(fieldIndex, activeIndex).
  // One implementation makes that class of drift impossible.
  const runFeature = async <Req, Res>(
    req: Req,
    fetcher: (r: Req) => Promise<Res>,
    setResult: (r: Res | null) => void,
    fallbackError: string,
  ) => {
    // Captured at request start and compared against the refs (which track the
    // LATEST feature/doc) once it resolves — in BOTH the success and error
    // branches. Neither the rail nor the doc strip is disabled while busy, so
    // the user can switch either mid-request, and a response landing after that
    // switch must not repopulate state the switch already cleared. Each clause
    // has its own test; removing either one turns a test red.
    const requestFeature = feature;
    const requestDocId = doc;
    setBusy(true);
    setError(null);
    setActiveIndex(null);
    try {
      const out = await fetcher(req);
      if (
        featureRef.current === requestFeature &&
        docRef.current === requestDocId
      ) {
        setResult(out);
        setTab("results");
      }
    } catch (e) {
      if (
        featureRef.current === requestFeature &&
        docRef.current === requestDocId
      ) {
        setError(e instanceof Error ? e.message : fallbackError);
        // Leaving the previous result rendered under the error callout shows
        // stale data as current — and after a document switch those citations
        // belong to a different document entirely.
        setResult(null);
        setActiveIndex(null);
      }
    } finally {
      // Unconditional: Run is disabled while busy, so at most one request is ever
      // in flight, and it just settled.
      setBusy(false);
    }
  };

  const handleOcrRun = (req: OcrRequest) =>
    runFeature(req, extractOcr, setOcrResult, "OCR failed");

  const handleTablesRun = (req: TablesRequest) =>
    runFeature(req, extractTables, setTablesResult, "Table extraction failed");

  const handleRun = (req: StructuredRequest) =>
    runFeature(req, extractStructured, setResult, "Extraction failed");

  const handleDescribeRun = (req: DescribeRequest) =>
    runFeature(
      req,
      extractDescription,
      setDescribeResult,
      "Description failed",
    );

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
        title="Extraction Studio"
        description="One shell for the Python SDK's extraction techniques: pull a JSON schema's fields out of a document, read a scan into structured content with Adaptive OCR, lift every table off the page, or describe what's on it in plain language."
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
            citations={viewerCitations}
            activeIndex={activeIndex}
            showCitations={viewerShow}
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
                label="Panel"
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
                disabled={
                  busy ||
                  ((feature === "structured" ||
                    feature === "tables" ||
                    feature === "describe") &&
                    !providersReady)
                }
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
              {feature === "structured" ? (
                <StructuredConfig
                  docPath={current.path}
                  filename={current.filename}
                  onRun={handleRun}
                  runSignal={runSignal}
                  schemaPreset={schemaPreset}
                  onProvidersReady={setProvidersReady}
                />
              ) : feature === "tables" ? (
                <TablesConfig
                  docPath={current.path}
                  filename={current.filename}
                  onRun={handleTablesRun}
                  runSignal={runSignal}
                  onProvidersReady={setProvidersReady}
                />
              ) : feature === "describe" ? (
                <DescribeConfig
                  docPath={current.path}
                  filename={current.filename}
                  onRun={handleDescribeRun}
                  runSignal={runSignal}
                  onProvidersReady={setProvidersReady}
                />
              ) : (
                <OcrConfig
                  docPath={current.path}
                  filename={current.filename}
                  runSignal={runSignal}
                  onRun={handleOcrRun}
                />
              )}
            </div>
            {tab === "results" &&
              (feature === "structured" ? (
                result ? (
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
                )
              ) : feature === "tables" ? (
                tablesResult ? (
                  <TablesResults
                    result={tablesResult}
                    activeIndex={activeIndex}
                    onSelectCell={setActiveIndex}
                    showRegions={showRegions}
                    onShowRegionsChange={setShowRegions}
                    colorMode={tableColorMode}
                    onColorModeChange={setTableColorMode}
                    citationHex={citationHex}
                    onCitationHexChange={setCitationHex}
                  />
                ) : (
                  <div className="panel-section">
                    <p className="muted">Run an extraction to see results.</p>
                  </div>
                )
              ) : feature === "describe" ? (
                describeResult ? (
                  <DescribeResults result={describeResult} />
                ) : (
                  <div className="panel-section">
                    <p className="muted">Run an extraction to see results.</p>
                  </div>
                )
              ) : ocrResult ? (
                <OcrResults
                  result={ocrResult}
                  activeIndex={activeIndex}
                  onSelectElement={setActiveIndex}
                  showRegions={showRegions}
                  onShowRegionsChange={setShowRegions}
                  colorMode={ocrColorMode}
                  onColorModeChange={setOcrColorMode}
                  citationHex={citationHex}
                  onCitationHexChange={setCitationHex}
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
