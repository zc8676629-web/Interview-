import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { extractTextFromFile } from "./extract-text.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { recursive: true, force: true });
    })
  );
});

describe("extractTextFromFile", () => {
  it("returns plain text for txt files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "interview-extract-"));
    tempRoots.push(root);
    const filePath = path.join(root, "resume.txt");
    await fs.writeFile(filePath, "hello   resume\n\n\nproject experience", "utf8");

    const result = await extractTextFromFile({
      filePath,
      mimeType: "text/plain",
      originalName: "resume.txt"
    });

    expect(result.text).toContain("hello resume");
    expect(result.preview).toContain("project experience");
  });
});
