import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  env,
  type FeatureExtractionPipeline,
  pipeline,
} from "@huggingface/transformers";

// Local embeddings: no second API key, ~33 MB model fetched once per instance.
// The index script and the API route MUST embed with this same function, or
// the stored vectors and the query vector live in different spaces.
const MODEL = "Xenova/bge-small-en-v1.5";
const QUERY_PREFIX =
  "Represent this sentence for searching relevant passages: ";

// The package's default cache sits inside node_modules, which is read-only on
// Vercel; the OS temp dir is writable everywhere.
env.cacheDir = join(tmpdir(), "transformers-cache");

let extractor: Promise<FeatureExtractionPipeline> | null = null;

async function run(texts: string[]): Promise<number[][]> {
  extractor ??= pipeline("feature-extraction", MODEL, { dtype: "q8" });
  const out = await (await extractor)(texts, {
    pooling: "cls",
    normalize: true,
  });
  return out.tolist() as number[][];
}

export const embedPassages = (texts: string[]) => run(texts);

export const embedQuery = async (q: string) =>
  (await run([QUERY_PREFIX + q]))[0];
