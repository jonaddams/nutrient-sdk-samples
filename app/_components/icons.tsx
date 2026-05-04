import type { SVGProps } from "react";

const baseProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const satisfies Omit<SVGProps<SVGSVGElement>, "children">;

type IconProps = SVGProps<SVGSVGElement>;

export function SignatureIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <path d="M3 19c2-1.5 3.2-3.5 4.4-5.7" />
      <path d="M6.7 16.5c1.7-2 3-4 3-6 0-1.2-.6-1.8-1.4-1.5-1.6.6-2 4-.5 5.4 1.3 1.2 3.5.4 5-1.2" />
      <path d="M13 13.5c.8-1.2 2-2.5 3.2-2.5 1.5 0 1.7 1.4 0 2-1 .4-1.6.8-1.6 1.5 0 .8.9 1 1.8.6 1-.4 2-1.4 2.6-2.6" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function InitialIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <path d="M5 7V5h14v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export function CheckSquareIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 12.5l3 3 5-6" />
    </svg>
  );
}

export function RadioIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <path d="M5 7V5h14v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v7" />
      <path d="M14 11v7" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function MoveIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <path d="M12 4v16" />
      <path d="M8 8l4-4 4 4" />
      <path d="M8 16l4 4 4-4" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <rect x="4.5" y="11" width="15" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

export function UnlockIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...baseProps} {...props}>
      <rect x="4.5" y="11" width="15" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </svg>
  );
}
