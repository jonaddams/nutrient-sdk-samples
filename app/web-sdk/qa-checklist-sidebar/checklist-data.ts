export interface ChecklistItem {
  id: string;
  label: string;
  pageIndex: number | null;
  checked: boolean;
}

export interface ChecklistCategory {
  id: string;
  label: string;
  color: string;
  items: ChecklistItem[];
}

export interface PrePopulatedComment {
  threadCategory: string;
  severity: "critical" | "warning" | "info";
  text: string;
  pageIndex: number;
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    id: "structure",
    label: "Structure",
    color: "#6366f1",
    items: [
      { id: "s1", label: "Table of contents present", pageIndex: 0, checked: true },
      { id: "s2", label: "Section headings consistent", pageIndex: null, checked: true },
      { id: "s3", label: "Page numbers present", pageIndex: null, checked: false },
    ],
  },
  {
    id: "content",
    label: "Content Quality",
    color: "#10b981",
    items: [
      { id: "c1", label: "Executive summary accurate", pageIndex: 1, checked: true },
      { id: "c2", label: "Data references cited", pageIndex: 2, checked: false },
      { id: "c3", label: "Conclusion aligns with findings", pageIndex: 4, checked: true },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    color: "#f59e0b",
    items: [
      { id: "r1", label: "Confidentiality notice included", pageIndex: 0, checked: true },
      { id: "r2", label: "Version number displayed", pageIndex: 0, checked: true },
    ],
  },
  {
    id: "formatting",
    label: "Formatting",
    color: "#ef4444",
    items: [
      { id: "f1", label: "Consistent font usage", pageIndex: null, checked: false },
      { id: "f2", label: "Images have captions", pageIndex: 2, checked: false },
    ],
  },
];

export const PRE_POPULATED_COMMENTS: PrePopulatedComment[] = [
  {
    threadCategory: "content",
    severity: "critical",
    text: "Data in table 2.1 doesn't match the executive summary figures",
    pageIndex: 2,
  },
  {
    threadCategory: "formatting",
    severity: "warning",
    text: "Caption missing on figure 3",
    pageIndex: 3,
  },
  {
    threadCategory: "compliance",
    severity: "info",
    text: "Consider adding revision date to the confidentiality notice",
    pageIndex: 0,
  },
];

export const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  warning: { label: "Warning", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  info: { label: "Info", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
} as const;
