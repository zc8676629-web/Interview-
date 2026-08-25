import fs from "node:fs/promises";
import path from "node:path";

import mammoth from "mammoth";
import pdfParse from "pdf-parse";

import type { UploadedResumeFile } from "../file-types.js";

export interface ExtractedTextResult {
  text: string;
  preview: string;
}

export async function extractTextFromFile(input: UploadedResumeFile): Promise<ExtractedTextResult> {
  const extension = path.extname(input.originalName).toLowerCase();

  let rawText = "";

  if (extension === ".txt") {
    rawText = await fs.readFile(input.filePath, "utf8");
  } else if (extension === ".docx") {
    const result = await mammoth.extractRawText({ path: input.filePath });
    rawText = result.value;
  } else if (extension === ".pdf") {
    const buffer = await fs.readFile(input.filePath);
    const result = await pdfParse(buffer);
    rawText = result.text;
  } else {
    throw new Error("Unsupported file type");
  }

  const text = normalizeText(rawText);
  const preview = text.slice(0, 400);

  if (!text) {
    throw new Error("Extracted text is empty");
  }

  return { text, preview };
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

