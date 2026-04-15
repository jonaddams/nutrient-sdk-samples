import type { FieldPaletteItem, Role, RoleId } from "./types";

export const ROLES: Record<RoleId, Role> = {
  provider: { id: "provider", label: "Provider", color: "#3b82f6" },
  patient: { id: "patient", label: "Patient", color: "#ec4899" },
  either: { id: "either", label: "Either", color: "#8b5cf6" },
};

export const EDITOR_COLOR = "#6366f1";

export const FIELD_PALETTE: FieldPaletteItem[] = [
  {
    type: "text",
    label: "Text field",
    icon: "Aa",
    defaultSize: { width: 200, height: 30 },
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: "☑",
    defaultSize: { width: 24, height: 24 },
  },
  {
    type: "radio",
    label: "Radio button",
    icon: "◉",
    defaultSize: { width: 24, height: 24 },
  },
  {
    type: "signature",
    label: "Signature",
    icon: "✍",
    defaultSize: { width: 200, height: 50 },
  },
  {
    type: "date",
    label: "Date",
    icon: "📅",
    defaultSize: { width: 150, height: 30 },
  },
];
