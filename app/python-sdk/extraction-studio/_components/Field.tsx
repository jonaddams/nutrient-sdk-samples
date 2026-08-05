"use client";
import type { ReactNode } from "react";

// Label above a control, optional muted helper text beneath. The `.field`
// class is a CONTAINER (globals.css:1019) — its input styling is written as
// `.field input[type=...]`, so controls must be nested inside, never given
// the class themselves.
export function Field({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {help && <span className="hint">{help}</span>}
    </div>
  );
}
