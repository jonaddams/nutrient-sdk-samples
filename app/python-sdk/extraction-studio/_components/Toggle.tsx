"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="toggle-row">
      <div className="toggle-row-text">
        <div className="toggle-row-label">{label}</div>
        {description && <p className="hint">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch"
        data-on={checked ? "1" : "0"}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  );
}
