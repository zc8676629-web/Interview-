import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { recursive: true, force: true });
    })
  );
});

describe("GET /api/bootstrap", () => {
  it("returns empty interview collections for old or fresh state", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-bootstrap-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    const response = await request(app).get("/api/bootstrap");

    expect(response.status).toBe(200);
    expect(response.body.settings.disclaimerAccepted).toBe(false);
    expect(response.body.interviewSessions).toEqual([]);
    expect(response.body.highFrequencyQuestions).toEqual([]);
    expect(response.body.customHighFrequencyTags).toEqual([]);
    expect(response.body.dedupeCandidates).toEqual([]);
  });
});
