import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { createAppStateStore } from "./lib/app-state.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { recursive: true, force: true });
    })
  );
});

describe("high frequency question API", () => {
  it("supports pinning and deleting a single high-frequency question", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-app-"));
    tempRoots.push(dataDir);

    const store = await createAppStateStore({ dataDir });
    const question = await store.upsertHighFrequencyQuestion({
      questionText: "你们项目最大的亮点是什么",
      category: "项目问题",
      tags: ["项目亮点"],
      answerSuggestion: "我会先说业务场景，再说我负责的部分。",
      pinned: false,
      sourceSessionIds: [],
      sourceSessionTitles: []
    });

    await store.saveInterview({
      company: "A公司",
      position: "测试开发工程师",
      interviewDate: "2026-08-25",
      round: "一面",
      interviewType: "线上",
      status: "已完成",
      jobDescription: "负责测试开发和接口自动化。",
      resumeId: null,
      title: "A公司一面",
      notes: "",
      sourceType: "text",
      sourceText: "问了项目亮点。",
      sourceFileName: "",
      occurrences: [
        {
          originalQuestion: "你们项目最大的亮点是什么",
          category: "项目问题",
          tags: ["项目亮点"],
          questionId: question.id,
          confidence: "high",
          notes: "",
          answerOverride: ""
        }
      ]
    });

    const app = await createApp({ dataDir });

    const pinResponse = await request(app).patch(`/api/high-frequency-questions/${question.id}`).send({
      pinned: true
    });

    expect(pinResponse.status).toBe(200);
    expect(pinResponse.body.question.pinned).toBe(true);

    const deleteResponse = await request(app).delete(`/api/high-frequency-questions/${question.id}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.ok).toBe(true);

    const bootstrapResponse = await request(app).get("/api/bootstrap");
    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrapResponse.body.highFrequencyQuestions).toHaveLength(0);
    expect(bootstrapResponse.body.recycleBin.questions).toHaveLength(1);
    expect(bootstrapResponse.body.recycleBin.answers).toHaveLength(1);
    expect(bootstrapResponse.body.recycleBin.questions[0].favorite).toBe(true);
    expect(bootstrapResponse.body.interviewSessions[0].questions[0].addedToHighFrequency).toBe(false);
    expect(bootstrapResponse.body.interviewSessions[0].questions[0].highFrequencyId).toBe("");
  });
});
