// Files are read as text in the browser; nothing is uploaded anywhere.

export const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "tsv",
  "json",
  "log",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "eml",
  "rtf",
];

export const BINARY_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "png",
  "jpg",
  "jpeg",
];

export const ACCEPT = TEXT_EXTENSIONS.map((e) => "." + e).join(",") + ",text/*,application/json";
export const MAX_BYTES = 2 * 1024 * 1024;

export function readable(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (BINARY_EXTENSIONS.includes(ext)) {
    return `.${ext} files aren't supported yet. Save it as .txt or paste the text instead.`;
  }
  if (
    !TEXT_EXTENSIONS.includes(ext) &&
    !file.type.startsWith("text/") &&
    file.type !== "application/json"
  ) {
    return "That doesn't look like a text file. Try .txt, .md, .csv or .json.";
  }
  if (file.size > MAX_BYTES) return `That file is ${formatSize(file.size)}. The limit is 2 MB.`;
  return null;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}
