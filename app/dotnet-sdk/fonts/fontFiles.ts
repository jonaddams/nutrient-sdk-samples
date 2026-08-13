/**
 * The API returns font NAMES; the viewer needs font FILES. The two document
 * formats name the same font differently, so an exact-string lookup is not
 * enough:
 *
 *   DOCX -> family name as authored      "Alfa Slab One"
 *   PDF  -> PostScript name, and subset-embedded fonts carry a six-letter tag
 *           prefix                        "ABCDEE+EBGaramond-Regular"
 *
 * Normalizing strips the tag, then spaces and hyphens, then lowercases — so all
 * spellings collapse onto one key.
 */
export function normalizeFontName(name: string): string {
  return name
    .replace(/^[A-Z]{6}\+/, "")
    .replace(/[\s-]/g, "")
    .toLowerCase();
}

const FILES: Record<string, string> = {
  alfaslabone: "/fonts/AlfaSlabOne-Regular.ttf",
  alfaslaboneregular: "/fonts/AlfaSlabOne-Regular.ttf",
  ebgaramond: "/fonts/EBGaramond-Regular.ttf",
  ebgaramondregular: "/fonts/EBGaramond-Regular.ttf",
};

/** The file this app ships for a font name, or undefined if it has none. */
export function fontFileFor(name: string): string | undefined {
  return FILES[normalizeFontName(name)];
}

// Keyed by normalized name, one entry per font FILE (not per raw name/style
// combination). Module-level and never cleared: NutrientViewer.Font
// instances, once built, are reused for the lifetime of the page.
const fontInstanceCache = new Map<string, unknown>();

/**
 * Builds the `customFonts` array for NutrientViewer.load(), reusing the
 * exact same Font instance (and the exact same fetch callback closure) on
 * every call for a given font.
 *
 * This matters because NutrientViewer snapshots its Standalone
 * configuration — customFonts included — on the FIRST load() call on a
 * page, and asserts if a later load() passes a different configuration.
 * "Different" includes object/closure identity, not just equivalent
 * values, so rebuilding `new NutrientViewer.Font({...})` on every render or
 * effect re-run trips the assertion even when the font list itself hasn't
 * changed. Caching by normalized name keeps the identity stable across
 * re-runs.
 *
 * Also de-dupes by normalized name: a document's font inventory can list
 * the same family more than once (e.g. Regular and Bold both reporting
 * "EB Garamond"), and passing more than one Font record for the same file
 * is redundant.
 */
export function buildCustomFonts(
  NutrientViewer: {
    Font: new (options: {
      name: string;
      callback: () => Promise<Blob>;
    }) => unknown;
  },
  names: string[],
): unknown[] {
  const seen = new Set<string>();
  const fonts: unknown[] = [];

  for (const name of names) {
    const key = normalizeFontName(name);
    if (seen.has(key)) continue;
    seen.add(key);

    const file = FILES[key];
    if (!file) continue;

    let font = fontInstanceCache.get(key);
    if (!font) {
      font = new NutrientViewer.Font({
        name,
        callback: () => fetch(file).then((r) => r.blob()),
      });
      fontInstanceCache.set(key, font);
    }
    fonts.push(font);
  }

  return fonts;
}
