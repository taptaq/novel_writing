export type SetupFileType = "text" | "markdown" | "docx" | "pdf";

const setupFileTypeByExtension: Record<string, SetupFileType> = {
  ".txt": "text",
  ".md": "markdown",
  ".markdown": "markdown",
  ".docx": "docx",
  ".pdf": "pdf"
};

export function detectSetupFileType(filename: string): SetupFileType | null {
  const normalizedName = filename.trim().toLowerCase();

  for (const [extension, type] of Object.entries(setupFileTypeByExtension)) {
    if (normalizedName.endsWith(extension)) {
      return type;
    }
  }

  return null;
}

export function normalizeSetupSourceText(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function detectSetupFileTypeFromMime(mimeType: string) {
  const normalizedType = mimeType.trim().toLowerCase();

  if (!normalizedType) {
    return null;
  }

  if (normalizedType === "text/markdown" || normalizedType === "text/x-markdown") {
    return "markdown" satisfies SetupFileType;
  }

  if (normalizedType.startsWith("text/")) {
    return "text" satisfies SetupFileType;
  }

  if (normalizedType === "application/pdf") {
    return "pdf" satisfies SetupFileType;
  }

  if (
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx" satisfies SetupFileType;
  }

  return null;
}

export async function readSetupFileAsText(file: File) {
  const fileType = detectSetupFileType(file.name) ?? detectSetupFileTypeFromMime(file.type);

  if (fileType === "text" || fileType === "markdown") {
    return normalizeSetupSourceText(await file.text());
  }

  if (fileType === "docx" || fileType === "pdf") {
    throw new Error(`暂不支持直接解析 ${fileType} 文件，请先转换为 txt 或 md 后再上传。`);
  }

  throw new Error("暂不支持直接解析该文件，请先转换为 txt 或 md 后再上传。");
}
