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

describe("POST /api/analyze-resume", () => {
  it("rejects requests when the API key is missing", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-app-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    const response = await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("resume body"), "resume.txt");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("API Key");
  });
});

describe("settings privacy boundaries", () => {
  it("requires a local key before accepting the disclaimer", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-app-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    const response = await request(app).post("/api/settings").send({
      acceptDisclaimer: true,
      selectedModel: "deepseek-v4-flash"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("API Key");
  });

  it("keeps api key and disclaimer local when exporting and importing backups", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-app-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    await request(app).post("/api/settings").send({
      apiKey: "local-secret",
      selectedModel: "deepseek-v4-pro",
      acceptDisclaimer: true
    });

    const exportResponse = await request(app).get("/api/data/export");
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.snapshot.settings.apiKey).toBe("");
    expect(exportResponse.body.snapshot.settings.disclaimerAcceptedAt).toBeNull();

    const importResponse = await request(app).post("/api/data/import").send({
      ...exportResponse.body,
      snapshot: {
        ...exportResponse.body.snapshot,
        settings: {
          apiKey: "foreign-secret",
          selectedModel: "deepseek-v4-flash",
          disclaimerAcceptedAt: "2026-08-25T00:00:00.000Z"
        }
      }
    });

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.settings.hasApiKey).toBe(true);
    expect(importResponse.body.settings.selectedModel).toBe("deepseek-v4-flash");
    expect(importResponse.body.settings.disclaimerAccepted).toBe(true);
  });
});
