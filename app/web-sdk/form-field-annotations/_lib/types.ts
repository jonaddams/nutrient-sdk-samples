export type RoleId = "provider" | "patient" | "either";

export type FieldType = "text" | "checkbox" | "radio" | "signature" | "date";

export interface Role {
  id: RoleId;
  label: string;
  color: string;
}

export interface FieldCustomData {
  fieldType: FieldType;
  roleId: RoleId;
  fieldName: string;
  required: boolean;
}

export interface FieldPaletteItem {
  type: FieldType;
  label: string;
  icon: string;
  defaultSize: { width: number; height: number };
}
