import type { ContentEditing, Instance } from "@nutrient-sdk/viewer";
import {
  type Box,
  findRange,
  layoutWarnings,
  type ToolName,
  toolSchemas,
} from "./tools";

type Block = ContentEditing.TextBlockSummary;

/**
 * Members added to `instance.contentEditor` after the repo's pinned
 * @nutrient-sdk/viewer typings (1.16.1). Signatures copied from 1.25.0's
 * index.d.ts. ponytail: delete once the repo's typings move to >=1.25 (that
 * bump currently surfaces 13 type errors in six other samples).
 */
type ContentEditor125 = ContentEditing.ContentEditor & {
  createTextBlock(input: {
    pageIndex: number;
    anchor: { x: number; y: number };
  }): Promise<string>;
  deleteBlock(id: string): Promise<void>;
  selectAllText(id: string): Promise<void>;
  setTextSelection(
    id: string,
    range: { begin: number; end: number } | null,
  ): Promise<void>;
  insertText(text: string): void;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll `check` until truthy or `timeoutMs` elapses. Editor updates land asynchronously. */
async function waitFor(check: () => boolean, timeoutMs = 2000) {
  const end = Date.now() + timeoutMs;
  while (!check() && Date.now() < end) await sleep(50);
}

/**
 * Runs model tool calls against the live UI content-editor session.
 *
 * Why a UI session and not `beginContentEditingSession()`: the programmatic
 * session can only change text, anchor, and maxWidth. Styling, alignment,
 * creating, and deleting blocks (`instance.contentEditor.*`, Web SDK 1.25)
 * require the UI session. A side effect the demo benefits from: every agent
 * edit is visible as it happens, and the user still decides Save or Discard.
 */
export function createExecutor(instance: Instance) {
  const ce = instance.contentEditor as ContentEditor125;

  async function ensureSession() {
    if (ce.isActive()) return;
    const NV = window.NutrientViewer;
    if (!NV) throw new Error("Nutrient Web SDK is not loaded.");
    instance.setViewState((vs) =>
      vs.set("interactionMode", NV.InteractionMode.CONTENT_EDITOR),
    );
    await waitFor(() => ce.isActive(), 5000);
    if (!ce.isActive()) throw new Error("Content editor did not start.");
  }

  /** A UI session detects a page's blocks only once the page is displayed. */
  async function ensurePage(pageIndex: number): Promise<Block[]> {
    if (pageIndex >= instance.totalPageCount) {
      throw new Error(
        `Page ${pageIndex} does not exist; the document has ${instance.totalPageCount} pages (0-based).`,
      );
    }
    await ensureSession();
    if (ce.getBlocks(pageIndex).length === 0) {
      instance.setViewState((vs) => vs.set("currentPageIndex", pageIndex));
      await waitFor(() => ce.getBlocks(pageIndex).length > 0, 4000);
    }
    return ce.getBlocks(pageIndex) as Block[];
  }

  async function getBlock(id: string): Promise<Block> {
    await ensureSession();
    const block = ce.getBlock(id);
    if (!block) {
      throw new Error(
        `Unknown block id "${id}". Ids change after a save; call list_elements or search_elements again.`,
      );
    }
    // Scroll the edit into view so the user watches it happen.
    instance.setViewState((vs) => vs.set("currentPageIndex", block.pageIndex));
    return block;
  }

  function summarize(b: Block) {
    return {
      id: b.id,
      text: b.text,
      boundingBox: roundBox(b.boundingBox),
      style: b.style,
      layout: b.layout,
    };
  }

  /** Re-read a block after a write and report any new overlap or overflow. */
  function afterWrite(id: string, before: Box | null) {
    const block = ce.getBlock(id);
    if (!block) return { ok: true, deleted: true };
    const page = instance.pageInfoForIndex(block.pageIndex);
    const others = (ce.getBlocks(block.pageIndex) as Block[]).filter(
      (b) => b.id !== id,
    );
    ce.focusBlock(null);
    ce.selectBlock(null);
    return {
      ok: true,
      block: summarize(block),
      warnings: page
        ? layoutWarnings(before, block.boundingBox, others, page)
        : [],
    };
  }

  async function selectRange(block: Block, find: string, occurrence = 1) {
    const range = findRange(block.text, find, occurrence);
    if (!range) {
      throw new Error(
        `"${find}" (occurrence ${occurrence}) not found in block ${block.id}. Current text: ${JSON.stringify(block.text)}`,
      );
    }
    ce.focusBlock(block.id);
    await waitFor(() => ce.getActiveBlock() === block.id, 1000);
    await ce.setTextSelection(block.id, range);
  }

  const handlers: {
    [K in ToolName]: (
      input: ReturnType<(typeof toolSchemas)[K]["parse"]>,
    ) => Promise<unknown>;
  } = {
    async list_elements({ pageIndex }) {
      const blocks = await ensurePage(pageIndex);
      const page = instance.pageInfoForIndex(pageIndex);
      return {
        pageIndex,
        pageCount: instance.totalPageCount,
        pageSize: page ? { width: page.width, height: page.height } : null,
        paragraphs: blocks.map(summarize),
      };
    },

    async search_elements({ query }) {
      const needle = query.toLowerCase();
      const matches = [];
      for (let p = 0; p < instance.totalPageCount; p++) {
        for (const b of await ensurePage(p)) {
          if (b.text.toLowerCase().includes(needle)) {
            matches.push({ pageIndex: p, id: b.id, text: b.text });
          }
        }
      }
      return { query, matches };
    },

    async replace_paragraph({ id, edit, text }) {
      const block = await getBlock(id);
      if (edit) {
        await selectRange(block, edit.find, edit.occurrence);
        ce.insertText(edit.replace);
      } else {
        ce.focusBlock(id);
        await ce.selectAllText(id);
        ce.insertText(text ?? "");
      }
      await waitFor(() => ce.getBlock(id)?.text !== block.text);
      return afterWrite(id, block.boundingBox);
    },

    async set_paragraph_text_style({ ids, find, style }) {
      const results = [];
      for (const id of ids) {
        const block = await getBlock(id);
        if (find) await selectRange(block, find);
        else await ce.selectAllText(id);
        ce.setTextStyle(style);
        await sleep(150); // style changes emit no text change to wait on
        results.push(afterWrite(id, block.boundingBox));
      }
      return { ok: true, results };
    },

    async set_paragraph_layout({ id, ...layout }) {
      const block = await getBlock(id);
      await ce.setLayout(id, layout);
      return afterWrite(id, block.boundingBox);
    },

    async add_paragraph({ pageIndex, x, y, text, style }) {
      await ensurePage(pageIndex);
      const id = await ce.createTextBlock({ pageIndex, anchor: { x, y } });
      ce.focusBlock(id);
      await waitFor(() => ce.getActiveBlock() === id, 1000);
      ce.insertText(text);
      await waitFor(() => (ce.getBlock(id)?.text ?? "") === text);
      if (style) {
        await ce.selectAllText(id);
        ce.setTextStyle(style);
        await sleep(150);
      }
      return afterWrite(id, null);
    },

    async delete_element({ id }) {
      await getBlock(id);
      await ce.deleteBlock(id);
      return { ok: true, deleted: id };
    },
  };

  return {
    /** Validate model-supplied input (untrusted) and run the tool. */
    async execute(name: string, input: unknown): Promise<unknown> {
      if (!(name in toolSchemas)) throw new Error(`Unknown tool "${name}".`);
      const tool = name as ToolName;
      const parsed = toolSchemas[tool].safeParse(input);
      if (!parsed.success) {
        throw new Error(`Invalid input for ${tool}: ${parsed.error.message}`);
      }
      // biome-ignore lint/suspicious/noExplicitAny: input narrowed by the schema lookup above
      return handlers[tool](parsed.data as any);
    },
  };
}

function roundBox(b: Box): Box {
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    left: r(b.left),
    top: r(b.top),
    width: r(b.width),
    height: r(b.height),
  };
}
