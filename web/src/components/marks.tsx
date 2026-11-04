type Props = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};

export function MarkPlus({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M8 2.5v11M2.5 8h11" {...stroke} />
    </svg>
  );
}

export function MarkBoard({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2 13.5V8.5M6 13.5V4.5M10 13.5V6.5M14 13.5V2.5" {...stroke} />
    </svg>
  );
}

export function MarkFile({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M3.5 1.5h6L13 5v9.5h-9.5zM9.5 1.5V5H13" {...stroke} />
    </svg>
  );
}

export function MarkNotes({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h7" {...stroke} />
    </svg>
  );
}

export function MarkKey({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="5" cy="8" r="2.25" {...stroke} />
      <path d="M7.2 8H14M11.5 8v2.2M13.4 8v1.6" {...stroke} />
    </svg>
  );
}

export function MarkPencil({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5zM8.75 4.25l3 3" {...stroke} />
    </svg>
  );
}

export function MarkTrash({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.75 9h6.5l.75-9M6.75 7v4M9.25 7v4" {...stroke} />
    </svg>
  );
}

export function MarkSearch({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="7" cy="7" r="4" {...stroke} />
      <path d="M10.2 10.2 13.5 13.5" {...stroke} />
    </svg>
  );
}

export function MarkSidebar({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2 3h12v10H2zM6 3v10" {...stroke} />
    </svg>
  );
}

export function MarkUpload({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M8 10.5V2.5M4.75 5.5 8 2.25l3.25 3.25M2.5 10v3.5h11V10" {...stroke} />
    </svg>
  );
}
