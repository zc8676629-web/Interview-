export function normalizeUploadedFileName(originalName: string): string {
  const repaired = Buffer.from(originalName, "latin1").toString("utf8");

  // If conversion produces replacement chars, keep the original input.
  if (repaired.includes("\uFFFD")) {
    return originalName;
  }

  return repaired;
}

