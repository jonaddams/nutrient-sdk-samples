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
