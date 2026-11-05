import {
  BookOpen,
  CircleDollarSign,
  CircleUserRound,
  FileText,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
  type LucideProps,
} from "lucide-react";

type Props = Pick<LucideProps, "className">;

const iconProps = {
  strokeWidth: 1.75,
  absoluteStrokeWidth: true,
} as const;

export function MarkAccount({ className }: Props) {
  return <CircleUserRound className={className} {...iconProps} aria-hidden />;
}

export function MarkMoney({ className }: Props) {
  return <CircleDollarSign className={className} {...iconProps} aria-hidden />;
}

export function MarkPlus({ className }: Props) {
  return <Plus className={className} {...iconProps} aria-hidden />;
}

export function MarkBoard({ className }: Props) {
  return <Gauge className={className} {...iconProps} aria-hidden />;
}

export function MarkIncognito({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 10h16" />
      <path d="M6.5 10 8 5.7A2 2 0 0 1 9.9 4.3h4.2a2 2 0 0 1 1.9 1.4L17.5 10" />
      <circle cx="7.5" cy="15.5" r="3" />
      <circle cx="16.5" cy="15.5" r="3" />
      <path d="M10.5 15.5a1.5 1.5 0 0 1 3 0" />
    </svg>
  );
}

export function MarkNotes({ className }: Props) {
  return <BookOpen className={className} {...iconProps} aria-hidden />;
}

export function MarkKey({ className }: Props) {
  return <SlidersHorizontal className={className} {...iconProps} aria-hidden />;
}

export function MarkPencil({ className }: Props) {
  return <Pencil className={className} {...iconProps} aria-hidden />;
}

export function MarkTrash({ className }: Props) {
  return <Trash2 className={className} {...iconProps} aria-hidden />;
}

export function MarkSearch({ className }: Props) {
  return <Search className={className} {...iconProps} aria-hidden />;
}

export function MarkSidebarClose({ className }: Props) {
  return <PanelLeftClose className={className} {...iconProps} aria-hidden />;
}

export function MarkSidebarOpen({ className }: Props) {
  return <PanelLeftOpen className={className} {...iconProps} aria-hidden />;
}

export function MarkUpload({ className }: Props) {
  return <Upload className={className} {...iconProps} aria-hidden />;
}

export function MarkPaperclip({ className }: Props) {
  return <Paperclip className={className} {...iconProps} aria-hidden />;
}

export function MarkShield({ className }: Props) {
  return <ShieldCheck className={className} {...iconProps} aria-hidden />;
}

export function MarkFileText({ className }: Props) {
  return <FileText className={className} {...iconProps} aria-hidden />;
}

export function MarkX({ className }: Props) {
  return <X className={className} {...iconProps} aria-hidden />;
}
