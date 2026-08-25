import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("styles performance guard", () => {
  it("avoids expensive backdrop filters on large layout surfaces", () => {
    const stylesPath = path.resolve(process.cwd(), "web/src/styles.css");
    const css = fs.readFileSync(stylesPath, "utf8");

    expect(css).not.toContain("backdrop-filter");
  });

  it("avoids sticky navigation and excessive radial gradients on the main shell", () => {
    const stylesPath = path.resolve(process.cwd(), "web/src/styles.css");
    const css = fs.readFileSync(stylesPath, "utf8");
    const radialCount = (css.match(/radial-gradient\(/g) ?? []).length;

    expect(css).not.toContain("position: sticky");
    expect(radialCount).toBe(0);
  });

  it("uses content visibility on long scrolling regions", () => {
    const stylesPath = path.resolve(process.cwd(), "web/src/styles.css");
    const css = fs.readFileSync(stylesPath, "utf8");

    expect(css).toContain("--color-primary");
    expect(css).toContain("--layout-sidebar");
    expect(css).toContain("content-visibility: auto");
    expect(css).toContain("contain-intrinsic-size");
  });
});
