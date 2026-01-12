// TypeScript interfaces for Simple Signing Demo

export type UserRole = "Editor" | "Signer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface FormFieldData {
  signerID: string;
  signerEmail: string;
  signerName: string;
  signerColor: string;
  type: FieldType;
}

export type FieldType =
  | "name"
  | "signature"
  | "initial"
  | "date"
  | "digitalSignature";

export interface DragData {
  name: string;
  email: string;
  instantId: string;
  type: FieldType;
  color: string;
}
