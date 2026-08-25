import { describe, expect, it } from "vitest";

import { normalizeUploadedFileName } from "./normalize-uploaded-filename.js";

describe("normalizeUploadedFileName", () => {
  it("repairs latin1-decoded chinese file names", () => {
    const mojibake = "ç®å-æµè¯.pdf";

    expect(normalizeUploadedFileName(mojibake)).toBe("简历-测试.pdf");
  });
});

