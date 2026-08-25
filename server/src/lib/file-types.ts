export const SUPPORTED_EXTENSIONS = [".txt", ".docx", ".pdf"] as const;

export interface UploadedResumeFile {
  filePath: string;
  mimeType: string;
  originalName: string;
}

export function isSupportedResumeFile(originalName: string): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) => originalName.toLowerCase().endsWith(ext));
}

