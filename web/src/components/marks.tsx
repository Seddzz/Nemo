import {
  BookOpen,
  CircleDollarSign,
  CircleUserRound,
  FileText,
  Gauge,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  ScanText,
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

export function MarkLogo({ className }: Props) {
  return <PanelLeft className={className} {...iconProps} aria-hidden />;
}

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

export function MarkFile({ className }: Props) {
  return <ScanText className={className} {...iconProps} aria-hidden />;
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
