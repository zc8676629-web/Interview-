import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createAppStateStore } from "./app-state.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { recursive: true, force: true });
    })
  );
});

describe("interview persistence", () => {
  it("stores interview sessions and high frequency questions", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-session-store-"));
    tempRoots.push(dataDir);
    const store = await createAppStateStore({ dataDir });

    await store.saveInterviewSession({
      title: "XXX一面",
      sourceType: "text",
      sourceText: "question source",
      sourceFileName: "",
      questions: []
    });

    expect(store.getSnapshot().interviewSessions).toHaveLength(1);
    expect(store.getSnapshot().interviewSessions[0]?.title).toBe("XXX一面");
    expect(store.getSnapshot().highFrequencyQuestions).toHaveLength(0);
  });
});
