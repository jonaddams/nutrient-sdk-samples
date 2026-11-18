"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { HighlightColor } from "@/app/python-sdk/extraction-studio/_components/HighlightColor";
import { hexToRgb } from "@/app/python-sdk/extraction-studio/lib/citations";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
import type { AskResponse } from "./api/ask/route";
import { HowItWorks } from "./how-it-works";
import { type Box, matchRows } from "./lib/chunk";
import { CORPUS, docById, PRESET_QUESTIONS } from "./lib/corpus";
import "./styles.css";

type Pipeline = "naive" | "parsed";
const PIPELINES: Pipeline[] = ["naive", "parsed"];
const LABEL: Record<Pipeline, string> = {
  naive: "Plain text extraction",
  parsed: "Nutrient parsing",
};
const DETAIL: Record<Pipeline, string> = {
  naive: "pdf.js page text, cut into 1,000-character chunks",
  parsed: "DWS Data Extraction: OCR, tables, layout, coordinates",
};

type Column =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; data: AskResponse };

type Target = { doc: string; page: number; boxes?: Box[] };

// Magenta, not amber: the yellow highlight was hard to see on these scans.
// Must be one of Extraction Studio's CITATION_PRESETS so its swatch shows active.
const DEFAULT_HIGHLIGHT = "#d63384";

// The subset of an annotation record this file touches (Immutable.js record).
type Highlight = {
  id: string;
  set: (key: string, value: unknown) => Highlight;
};

const TOOLBAR = [
  "sidebar-thumbnails",
  "pager",
  "zoom-out",
  "zoom-in",
  "zoom-mode",
  "search",
];

function toColor(NV: NonNullable<typeof window.NutrientViewer>, hex: string) {
  // HighlightColor only ever commits a valid 6-digit hex.
  const rgb = hexToRgb(hex) ?? { r: 214, g: 51, b: 132 };
  return new NV.Color(rgb);
}

async function waitForSdk() {
  for (let i = 0; i < 100 && !window.NutrientViewer; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!window.NutrientViewer) throw new Error("Nutrient Web SDK did not load.");
  return window.NutrientViewer;
}

export default function ContractRag() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const loadedDocRef = useRef<string | null>(null);
  const highlightsRef = useRef<Highlight[]>([]);
  // Read by queued viewer work, which must see the latest pick, not the value
  // captured when the work was queued.
  const colorRef = useRef(DEFAULT_HIGHLIGHT);
  const [color, setColor] = useState(DEFAULT_HIGHLIGHT);
  // Viewer work is serialized: a second click must not race a document load.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const askIdRef = useRef(0);

  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [cols, setCols] = useState<Record<Pipeline, Column>>({
    naive: { status: "idle" },
    parsed: { status: "idle" },
  });
  const [note, setNote] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<string>(CORPUS[0].id);

  async function display(t: Target) {
    const NV = await waitForSdk();
    const container = containerRef.current;
    const doc = docById(t.doc);
    if (!container || !doc) return;

    if (loadedDocRef.current !== t.doc) {
      if (instanceRef.current) NV.unload(container);
      instanceRef.current = null;
      loadedDocRef.current = null;
      instanceRef.current = await NV.load({
        container,
        document: `/documents/contract-rag/${doc.file}`,
        useCDN: true,
        licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        toolbarItems: (NV.defaultToolbarItems ?? []).filter(
          (item: { type: string }) => TOOLBAR.includes(item.type),
        ),
        initialViewState: new NV.ViewState({ currentPageIndex: t.page }),
      });
      loadedDocRef.current = t.doc;
      highlightsRef.current = [];
    }
    const instance = instanceRef.current;
    if (!instance) return;

    if (highlightsRef.current.length) {
      await instance.delete(highlightsRef.current.map((h) => h.id));
      highlightsRef.current = [];
    }
    if (!t.boxes?.length) {
      instance.setViewState((v) => v.set("currentPageIndex", t.page));
      return;
    }
    // Boxes are page fractions; the viewer works in PDF points.
    const rects = t.boxes.map((b) => {
      const info = instance.pageInfoForIndex(b.page);
      if (!info) throw new Error(`No page ${b.page}`);
      return {
        page: b.page,
        rect: new NV.Geometry.Rect({
          left: b.x * info.width,
          top: b.y * info.height,
          width: b.w * info.width,
          height: b.h * info.height,
        }),
      };
    });
    const c = toColor(NV, colorRef.current);
    const created = await instance.create(
      rects.map(
        ({ page, rect }) =>
          new NV.Annotations.RectangleAnnotation({
            pageIndex: page,
            boundingBox: rect,
            strokeColor: c,
            strokeWidth: 2,
            fillColor: c,
            opacity: 0.4,
          }),
      ),
    );
    // create() is typed as the generic Change union; these are annotations.
    highlightsRef.current = created as unknown as Highlight[];
    instance.jumpToRect(rects[0].page, rects[0].rect);
  }

  /** Recolour the highlights already on the page, in place (no re-scroll). */
  function changeColor(hex: string) {
    colorRef.current = hex;
    setColor(hex);
    queueRef.current = queueRef.current
      .then(async () => {
        const instance = instanceRef.current;
        const NV = window.NutrientViewer;
        if (!instance || !NV || !highlightsRef.current.length) return;
        const c = toColor(NV, hex);
        const updated = await instance.update(
          highlightsRef.current.map((h) =>
            h.set("strokeColor", c).set("fillColor", c),
          ) as unknown as Parameters<Instance["update"]>[0],
        );
        highlightsRef.current = updated as unknown as Highlight[];
      })
      .catch((e) => console.error("contract-rag recolour:", e));
  }

  function show(t: Target) {
    setOpenDoc(t.doc);
    queueRef.current = queueRef.current
      .then(() => display(t))
      .catch((e) => console.error("contract-rag viewer:", e));
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initial load
  useEffect(() => {
    show({ doc: CORPUS[0].id, page: 0 });
    const container = containerRef.current;
    return () => {
      if (container && instanceRef.current)
        window.NutrientViewer?.unload(container);
      instanceRef.current = null;
      loadedDocRef.current = null;
    };
  }, []);

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    const id = ++askIdRef.current;
    setQuestion(text);
    setAsked(text);
    setNote(null);
    setCols({ naive: { status: "loading" }, parsed: { status: "loading" } });
    // Two independent requests, so each column fills as soon as its answer lands.
    await Promise.all(
      PIPELINES.map(async (pipeline) => {
        let next: Column;
        try {
          const res = await fetch(
            "/ai-document-processing/contract-rag/api/ask",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: text, pipeline }),
            },
          );
          const json = await res.json();
          next = res.ok
            ? { status: "done", data: json as AskResponse }
            : { status: "error", error: json.error ?? `HTTP ${res.status}` };
        } catch (e) {
          next = {
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          };
        }
        if (id === askIdRef.current)
          setCols((c) => ({ ...c, [pipeline]: next }));
      }),
    );
  }

  function openCitation(
    pipeline: Pipeline,
    data: AskResponse,
    sourceId: string,
  ) {
    const src = data.sources[sourceId];
    if (!src) return;
    if (pipeline === "parsed") {
      setNote(null);
      // For a table, highlight just the row(s) the answer quotes when we can.
      const cited = data.segments
        .filter((s) => s.cites.includes(sourceId))
        .map((s) => s.text)
        .join(" ");
      const rows = src.rows ? matchRows(src.rows, cited) : [];
      show({
        doc: src.doc,
        page: src.page,
        boxes: rows.length ? rows : src.boxes,
      });
    } else {
      setNote(
        "Plain text has no coordinates: this citation can only open the page.",
      );
      show({ doc: src.doc, page: src.page });
    }
  }

  const panel = (
    <div className="crag-panel">
      <section className="crag-section">
        <div className="panel-section">Ask the deal room</div>
        <div className="crag-presets">
          {PRESET_QUESTIONS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip crag-preset"
              aria-pressed={asked === p.question}
              title={p.question}
              onClick={() => ask(p.question)}
            >
              <span>{p.label}</span>
              <span className="crag-why">{p.why}</span>
            </button>
          ))}
        </div>
        <form
          className="crag-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            className="crag-input"
            value={question}
            maxLength={400}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Or ask your own question about these contracts"
            aria-label="Question"
          />
          <button className="btn sm" type="submit" disabled={!question.trim()}>
            Ask both
          </button>
        </form>
        <div className="crag-highlight">
          <span className="crag-highlight-label">Highlight color</span>
          <HighlightColor
            label="Highlight color"
            embedded
            value={color}
            onChange={changeColor}
          />
        </div>
      </section>

      {asked && (
        <div className="crag-columns">
          {PIPELINES.map((p) => (
            <AnswerColumn
              key={p}
              pipeline={p}
              col={cols[p]}
              onCite={openCitation}
            />
          ))}
        </div>
      )}
      {note && <p className="crag-note">{note}</p>}

      <section className="crag-section">
        <div className="panel-section">
          Deal room: {CORPUS.length} contracts
        </div>
        <ul className="crag-docs">
          {CORPUS.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="crag-doc"
                aria-current={openDoc === d.id}
                onClick={() => show({ doc: d.id, page: 0 })}
              >
                {d.title}
              </button>
            </li>
          ))}
        </ul>
        <p className="crag-attrib">
          Contracts from{" "}
          <a
            href="https://www.atticusprojectai.org/cuad"
            target="_blank"
            rel="noreferrer"
          >
            CUAD v1
          </a>{" "}
          (The Atticus Project, CC BY 4.0), as filed on SEC EDGAR.
        </p>
      </section>
    </div>
  );

  return (
    <SampleFrame
      title="Contract Q&A with Verifiable Citations"
      description="Retrieval-augmented answers over a legal deal room. The same question runs through two identical RAG pipelines that differ only in how the PDFs were ingested, and every Nutrient citation highlights its exact source on the page."
      section={{
        label: "AI Document Processing",
        href: "/ai-document-processing",
      }}
      intro={<HowItWorks />}
      wide
      sidebar={panel}
      sidebarWidth={640}
      height="calc(100vh - 12rem)"
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </SampleFrame>
  );
}

function AnswerColumn({
  pipeline,
  col,
  onCite,
}: {
  pipeline: Pipeline;
  col: Column;
  onCite: (p: Pipeline, data: AskResponse, sourceId: string) => void;
}) {
  return (
    <section className={`crag-col crag-col-${pipeline}`} aria-live="polite">
      <header>
        <h3>{LABEL[pipeline]}</h3>
        <p>{DETAIL[pipeline]}</p>
      </header>
      {col.status === "loading" && (
        <p className="crag-muted">Retrieving and answering…</p>
      )}
      {col.status === "error" && <p className="crag-error">{col.error}</p>}
      {col.status === "done" && col.data.segments.length === 0 && (
        <p className="crag-error">
          The model returned an empty answer. Ask again.
        </p>
      )}
      {col.status === "done" && col.data.segments.length > 0 && (
        <Answer pipeline={pipeline} data={col.data} onCite={onCite} />
      )}
    </section>
  );
}

function Answer({
  pipeline,
  data,
  onCite,
}: {
  pipeline: Pipeline;
  data: AskResponse;
  onCite: (p: Pipeline, data: AskResponse, sourceId: string) => void;
}) {
  // Number sources in order of first citation.
  const order: string[] = [];
  for (const s of data.segments)
    for (const c of s.cites) if (!order.includes(c)) order.push(c);

  return (
    <>
      <p className="crag-answer">
        {data.segments.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are static per answer
          <span key={i}>
            {s.text.replace(/\*\*/g, "")}
            {s.cites.map((c) => (
              <button
                key={c}
                type="button"
                className="crag-cite"
                title={data.sources[c]?.title}
                onClick={() => onCite(pipeline, data, c)}
              >
                {order.indexOf(c) + 1}
              </button>
            ))}
          </span>
        ))}
      </p>
      {order.length > 0 && (
        <ol className="crag-sources">
          {order.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => onCite(pipeline, data, c)}>
                {data.sources[c]?.title}
                {pipeline === "parsed" ? " · highlight" : " · page only"}
              </button>
            </li>
          ))}
        </ol>
      )}
      <details className="crag-retrieved">
        <summary>Retrieved passages ({data.retrieved.length})</summary>
        <ol>
          {data.retrieved.map((r) => (
            <li key={r.id}>
              <div className="crag-muted">
                {docById(r.doc)?.title}, page {r.page + 1} · score {r.score}
              </div>
              <pre>
                {r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}
              </pre>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
