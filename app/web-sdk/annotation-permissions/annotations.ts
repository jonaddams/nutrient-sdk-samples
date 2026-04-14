// Pre-seeded annotation data for the annotation permissions sample.
// Each student has annotations across the four quiz sections.
// Positions are calibrated for solar-system-quiz.pdf (Letter, 0.75in margins).

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  color: string;
  role: "teacher" | "student";
}

export const USERS: UserRole[] = [
  { id: "teacher", name: "Ms. Parker", displayName: "Ms. Parker (Teacher)", color: "#6366f1", role: "teacher" },
  { id: "alex", name: "Alex", displayName: "Alex", color: "#f97316", role: "student" },
  { id: "jordan", name: "Jordan", displayName: "Jordan", color: "#22c55e", role: "student" },
  { id: "sam", name: "Sam", displayName: "Sam", color: "#3b82f6", role: "student" },
];

export const STUDENTS = USERS.filter((u) => u.role === "student");

export function getUserById(id: string): UserRole | undefined {
  return USERS.find((u) => u.id === id);
}

// Annotation JSON type matching the InstantJSON annotations array format
interface AnnotationJSON {
  v: number;
  id: string;
  type: string;
  pageIndex: number;
  bbox: [number, number, number, number];
  opacity: number;
  customData: { creatorName: string; color: string };
  [key: string]: unknown;
}

// Helper to generate deterministic IDs
function annId(student: string, section: string, index: number): string {
  return `${student}-${section}-${index}`;
}

function makeCustomData(userId: string): { creatorName: string; color: string } {
  const user = getUserById(userId);
  return { creatorName: userId, color: user?.color ?? "#888888" };
}

// --- Alex's annotations (orange, strong student — all correct) ---

const alexAnnotations: AnnotationJSON[] = [
  // Section 1: Multiple Choice — circles B (Q1), C (Q2), B (Q3) — all correct
  {
    v: 1,
    id: annId("alex", "mc", 1),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [193, 178, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[193, 189], [195, 180], [215, 178], [230, 182], [235, 192], [230, 198], [215, 200], [195, 198], [193, 189]]] },
    lineWidth: 2,
    strokeColor: "#f97316",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("alex"),
  },
  {
    v: 1,
    id: annId("alex", "mc", 2),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [293, 218, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[293, 229], [295, 220], [315, 218], [330, 222], [335, 232], [330, 238], [315, 240], [295, 238], [293, 229]]] },
    lineWidth: 2,
    strokeColor: "#f97316",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("alex"),
  },
  {
    v: 1,
    id: annId("alex", "mc", 3),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [193, 258, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[193, 269], [195, 260], [215, 258], [230, 262], [235, 272], [230, 278], [215, 280], [195, 278], [193, 269]]] },
    lineWidth: 2,
    strokeColor: "#f97316",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("alex"),
  },
  // Section 2: Label Diagram — all 4 correct
  {
    v: 1,
    id: annId("alex", "label", 1),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [148, 390, 70, 18],
    opacity: 1,
    text: "Mercury",
    fontSize: 12,
    fontColor: "#f97316",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("alex"),
  },
  {
    v: 1,
    id: annId("alex", "label", 2),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [238, 390, 70, 18],
    opacity: 1,
    text: "Venus",
    fontSize: 12,
    fontColor: "#f97316",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("alex"),
  },
  {
    v: 1,
    id: annId("alex", "label", 3),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [328, 390, 70, 18],
    opacity: 1,
    text: "Earth",
    fontSize: 12,
    fontColor: "#f97316",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("alex"),
  },
  {
    v: 1,
    id: annId("alex", "label", 4),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [418, 390, 70, 18],
    opacity: 1,
    text: "Mars",
    fontSize: 12,
    fontColor: "#f97316",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("alex"),
  },
  // Section 3: Short Answer — thorough response
  {
    v: 1,
    id: annId("alex", "short", 1),
    type: "pspdfkit/note",
    pageIndex: 0,
    bbox: [72, 470, 32, 32],
    opacity: 1,
    text: "Pluto was reclassified as a dwarf planet in 2006 by the International Astronomical Union because it has not cleared the neighborhood around its orbit, which is one of the three criteria for a full planet.",
    color: "#f97316",
    customData: makeCustomData("alex"),
  },
  // Section 4: Highlight — 2 key facts
  {
    v: 1,
    id: annId("alex", "hl", 1),
    type: "pspdfkit/markup/highlight",
    pageIndex: 0,
    bbox: [72, 570, 450, 14],
    opacity: 0.5,
    rects: [[72, 570, 450, 14]],
    color: "#f97316",
    customData: makeCustomData("alex"),
  },
  {
    v: 1,
    id: annId("alex", "hl", 2),
    type: "pspdfkit/markup/highlight",
    pageIndex: 0,
    bbox: [72, 600, 380, 14],
    opacity: 0.5,
    rects: [[72, 600, 380, 14]],
    color: "#f97316",
    customData: makeCustomData("alex"),
  },
];

// --- Jordan's annotations (green, average student — 2 of 3 MC correct) ---

const jordanAnnotations: AnnotationJSON[] = [
  // Section 1: Multiple Choice — circles B (Q1 ✓), A (Q2 ✗), B (Q3 ✓)
  {
    v: 1,
    id: annId("jordan", "mc", 1),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [193, 178, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[195, 189], [197, 181], [214, 179], [229, 183], [233, 192], [229, 198], [214, 200], [197, 197], [195, 189]]] },
    lineWidth: 2,
    strokeColor: "#22c55e",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("jordan"),
  },
  {
    v: 1,
    id: annId("jordan", "mc", 2),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [93, 218, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[95, 229], [97, 221], [114, 219], [129, 223], [133, 232], [129, 238], [114, 240], [97, 237], [95, 229]]] },
    lineWidth: 2,
    strokeColor: "#22c55e",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("jordan"),
  },
  {
    v: 1,
    id: annId("jordan", "mc", 3),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [193, 258, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[195, 269], [197, 261], [214, 259], [229, 263], [233, 272], [229, 278], [214, 280], [197, 277], [195, 269]]] },
    lineWidth: 2,
    strokeColor: "#22c55e",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("jordan"),
  },
  // Section 2: Label Diagram — 3 of 4 correct (puts "Mars" for Venus)
  {
    v: 1,
    id: annId("jordan", "label", 1),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [148, 390, 70, 18],
    opacity: 1,
    text: "Mercury",
    fontSize: 12,
    fontColor: "#22c55e",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("jordan"),
  },
  {
    v: 1,
    id: annId("jordan", "label", 2),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [238, 390, 70, 18],
    opacity: 1,
    text: "Mars",
    fontSize: 12,
    fontColor: "#22c55e",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("jordan"),
  },
  {
    v: 1,
    id: annId("jordan", "label", 3),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [328, 390, 70, 18],
    opacity: 1,
    text: "Earth",
    fontSize: 12,
    fontColor: "#22c55e",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("jordan"),
  },
  {
    v: 1,
    id: annId("jordan", "label", 4),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [418, 390, 70, 18],
    opacity: 1,
    text: "Mars",
    fontSize: 12,
    fontColor: "#22c55e",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("jordan"),
  },
  // Section 3: Short Answer — partial
  {
    v: 1,
    id: annId("jordan", "short", 1),
    type: "pspdfkit/note",
    pageIndex: 0,
    bbox: [72, 470, 32, 32],
    opacity: 1,
    text: "Pluto is too small and hasn't cleared its orbit so it's a dwarf planet now.",
    color: "#22c55e",
    customData: makeCustomData("jordan"),
  },
  // Section 4: Highlight — 1 fact
  {
    v: 1,
    id: annId("jordan", "hl", 1),
    type: "pspdfkit/markup/highlight",
    pageIndex: 0,
    bbox: [72, 570, 450, 14],
    opacity: 0.5,
    rects: [[72, 570, 450, 14]],
    color: "#22c55e",
    customData: makeCustomData("jordan"),
  },
];

// --- Sam's annotations (blue, struggling student — 1 of 3 MC correct) ---

const samAnnotations: AnnotationJSON[] = [
  // Section 1: Multiple Choice — circles A (Q1 ✗), C (Q2 ✓), A (Q3 ✗)
  {
    v: 1,
    id: annId("sam", "mc", 1),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [93, 178, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[95, 189], [97, 181], [114, 179], [129, 183], [133, 192], [129, 198], [114, 200], [97, 197], [95, 189]]] },
    lineWidth: 2,
    strokeColor: "#3b82f6",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("sam"),
  },
  {
    v: 1,
    id: annId("sam", "mc", 2),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [293, 218, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[295, 229], [297, 221], [314, 219], [329, 223], [333, 232], [329, 238], [314, 240], [297, 237], [295, 229]]] },
    lineWidth: 2,
    strokeColor: "#3b82f6",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("sam"),
  },
  {
    v: 1,
    id: annId("sam", "mc", 3),
    type: "pspdfkit/ink",
    pageIndex: 0,
    bbox: [93, 258, 45, 22],
    opacity: 1,
    lines: { intensities: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], points: [[[95, 269], [97, 261], [114, 259], [129, 263], [133, 272], [129, 278], [114, 280], [97, 277], [95, 269]]] },
    lineWidth: 2,
    strokeColor: "#3b82f6",
    isDrawnNaturally: false,
    isSignature: false,
    customData: makeCustomData("sam"),
  },
  // Section 2: Label Diagram — 2 of 4 correct (Jupiter for Venus, Venus for Mars)
  {
    v: 1,
    id: annId("sam", "label", 1),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [148, 390, 70, 18],
    opacity: 1,
    text: "Mercury",
    fontSize: 12,
    fontColor: "#3b82f6",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("sam"),
  },
  {
    v: 1,
    id: annId("sam", "label", 2),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [238, 390, 70, 18],
    opacity: 1,
    text: "Jupiter",
    fontSize: 12,
    fontColor: "#3b82f6",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("sam"),
  },
  {
    v: 1,
    id: annId("sam", "label", 3),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [328, 390, 70, 18],
    opacity: 1,
    text: "Earth",
    fontSize: 12,
    fontColor: "#3b82f6",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("sam"),
  },
  {
    v: 1,
    id: annId("sam", "label", 4),
    type: "pspdfkit/text",
    pageIndex: 0,
    bbox: [418, 390, 70, 18],
    opacity: 1,
    text: "Venus",
    fontSize: 12,
    fontColor: "#3b82f6",
    horizontalAlign: "left",
    verticalAlign: "top",
    customData: makeCustomData("sam"),
  },
  // Section 3: Short Answer — brief/incomplete
  {
    v: 1,
    id: annId("sam", "short", 1),
    type: "pspdfkit/note",
    pageIndex: 0,
    bbox: [72, 470, 32, 32],
    opacity: 1,
    text: "Because it's really small I think.",
    color: "#3b82f6",
    customData: makeCustomData("sam"),
  },
  // Section 4: No highlight (Sam didn't complete this section)
];

// All annotations keyed by student ID
const ALL_ANNOTATIONS: Record<string, AnnotationJSON[]> = {
  alex: alexAnnotations,
  jordan: jordanAnnotations,
  sam: samAnnotations,
};

/**
 * Build an InstantJSON object containing annotations for the specified student IDs.
 */
export function buildInstantJSON(studentIds: string[]): { format: string; annotations: AnnotationJSON[] } {
  const annotations = studentIds.flatMap((id) => ALL_ANNOTATIONS[id] ?? []);
  return {
    format: "https://pspdfkit.com/instant-json/v1",
    annotations,
  };
}

/**
 * Merge exported annotations back into the store.
 * Filters to only keep annotations with our customData.creatorName stamp,
 * then replaces that student's annotations in the store.
 */
export function mergeExportedAnnotations(
  exported: { annotations?: AnnotationJSON[] },
  store: Record<string, AnnotationJSON[]>,
): Record<string, AnnotationJSON[]> {
  const updated = { ...store };

  if (!exported.annotations) return updated;

  // Group exported annotations by creator
  const byCreator = new Map<string, AnnotationJSON[]>();
  for (const ann of exported.annotations) {
    const creator = ann.customData?.creatorName;
    if (creator) {
      if (!byCreator.has(creator)) byCreator.set(creator, []);
      byCreator.get(creator)!.push(ann);
    }
  }

  // Replace each creator's annotations with the exported version
  for (const [creator, anns] of byCreator) {
    updated[creator] = anns;
  }

  return updated;
}
