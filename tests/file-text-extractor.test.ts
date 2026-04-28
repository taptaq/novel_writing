import { describe, expect, it } from "vitest";
import {
  detectSetupFileType,
  normalizeSetupSourceText,
  readSetupFileAsText
} from "@/lib/file-text-extractor";

describe("detectSetupFileType", () => {
  it('returns "text" for .txt files', () => {
    expect(detectSetupFileType("setup.txt")).toBe("text");
  });

  it('returns "markdown" for .md files', () => {
    expect(detectSetupFileType("setup.md")).toBe("markdown");
  });

  it('returns "docx" for .docx files', () => {
    expect(detectSetupFileType("setup.docx")).toBe("docx");
  });

  it('returns "pdf" for .pdf files', () => {
    expect(detectSetupFileType("setup.pdf")).toBe("pdf");
  });
});

describe("normalizeSetupSourceText", () => {
  it("normalizes CRLF to LF and trims outer whitespace", () => {
    expect(normalizeSetupSourceText("  第一行\r\n第二行\r\n  ")).toBe("第一行\n第二行");
  });

  it("normalizes lone carriage returns to LF too", () => {
    expect(normalizeSetupSourceText("  第一行\r第二行\r  ")).toBe("第一行\n第二行");
  });
});

describe("readSetupFileAsText", () => {
  it("reads and normalizes txt and markdown files", async () => {
    const textFile = new File(["  第一行\r\n第二行  "], "setup.txt", {
      type: "text/plain"
    });
    const markdownFile = new File(["  # 标题\r内容  "], "setup.md", {
      type: "text/markdown"
    });

    await expect(readSetupFileAsText(textFile)).resolves.toBe("第一行\n第二行");
    await expect(readSetupFileAsText(markdownFile)).resolves.toBe("# 标题\n内容");
  });

  it("falls back to MIME type for text and markdown files without a supported extension", async () => {
    const textFile = new File(["  第一行\r\n第二行  "], "setup", {
      type: "text/plain"
    });
    const markdownFile = new File(["  # 标题\r内容  "], "outline", {
      type: "text/markdown"
    });

    await expect(readSetupFileAsText(textFile)).resolves.toBe("第一行\n第二行");
    await expect(readSetupFileAsText(markdownFile)).resolves.toBe("# 标题\n内容");
  });

  it("rejects docx and pdf files with a clear conversion message", async () => {
    const docxFile = new File(["binary"], "setup", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const pdfFile = new File(["binary"], "setup", {
      type: "application/pdf"
    });

    await expect(readSetupFileAsText(docxFile)).rejects.toThrow(
      "暂不支持直接解析 docx 文件，请先转换为 txt 或 md 后再上传。"
    );
    await expect(readSetupFileAsText(pdfFile)).rejects.toThrow(
      "暂不支持直接解析 pdf 文件，请先转换为 txt 或 md 后再上传。"
    );
  });
});
