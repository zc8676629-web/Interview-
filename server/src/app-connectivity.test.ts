import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { recursive: true, force: true });
    })
  );
});

describe("POST /api/test-connectivity", () => {
  it("returns success when DeepSeek connectivity works", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-connectivity-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      testDeepSeekConnection: vi.fn().mockResolvedValue(undefined)
    });

    const response = await request(app).post("/api/test-connectivity").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-pro"
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("falls back to the saved api key when the request body leaves it empty", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-connectivity-"));
    tempRoots.push(dataDir);
    const testDeepSeekConnection = vi.fn().mockResolvedValue(undefined);
    const app = await createApp({
      dataDir,
      testDeepSeekConnection
    });

    await request(app).post("/api/settings").send({
      apiKey: "stored-secret",
      selectedModel: "deepseek-v4-flash"
    });

    const response = await request(app).post("/api/test-connectivity").send({
      selectedModel: "deepseek-v4-flash"
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(testDeepSeekConnection).toHaveBeenCalledWith({
      apiKey: "stored-secret",
      selectedModel: "deepseek-v4-flash"
    });
  });
});
