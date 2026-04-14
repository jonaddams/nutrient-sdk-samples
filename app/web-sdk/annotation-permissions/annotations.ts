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

// --- Student annotations ---
// These will be populated from exported InstantJSON after manually
// creating annotations in the viewer for each student.

const alexAnnotations: AnnotationJSON[] = [];

const jordanAnnotations: AnnotationJSON[] = [];

const samAnnotations: AnnotationJSON[] = [];

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
