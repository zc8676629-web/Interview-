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

describe("app state store", () => {
  it("persists resumes, interviews, questions, and answer versions to disk", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-store-"));
    tempRoots.push(dataDir);

    const store = await createAppStateStore({ dataDir });
    const resume = await store.saveResume({
      displayName: "自动化测试-V3",
      originalFileName: "resume-v3.txt",
      parsedText: "三年测试经验，做过接口自动化和酒店预订业务。",
      profile: {
        candidateSummary: "三年测试经验",
        strongSkills: ["接口自动化"],
        personalAdvantages: ["表达直接"],
        workExperience: ["负责接口和功能测试"],
        projectHighlights: ["自动化落地"],
        riskPoints: ["移动端自动化偏少"]
      },
      predictedQuestions: [
        {
          questionText: "你们接口自动化里的登录态怎么管理？",
          category: "技术问题",
          tags: ["接口自动化", "鉴权"]
        }
      ],
      isPrimary: true
    });

    const question = await store.upsertQuestion({
      standardQuestion: "接口自动化中的登录态和 Token 如何管理？",
      category: "技术问题",
      tags: ["接口自动化", "鉴权"],
      sourceTypes: ["resume_prediction", "interview"],
      sourceRefs: [
        {
          type: "resume_prediction",
          resumeId: resume.id,
          label: "自动化测试-V3"
        }
      ],
      favorite: false,
      masteryLevel: "未准备",
      priority: "medium"
    });

    const answer = await store.saveAnswerVersion({
      questionId: question.id,
      content: "我一般会把登录态获取和刷新收口成公共能力，避免每条用例重复处理。",
      type: "standard",
      source: "ai_generated",
      resumeId: resume.id
    });

    await store.saveInterview({
      company: "A公司",
      position: "测试开发工程师",
      interviewDate: "2026-08-21",
      round: "一面",
      interviewType: "线上",
      status: "已完成",
      jobDescription: "负责测试开发和接口自动化。",
      resumeId: resume.id,
      title: "A公司-测试开发工程师-一面",
      notes: "重点问了自动化和鉴权。",
      sourceType: "text",
      sourceText: "问了接口自动化里的登录态和 Token 过期处理。",
      sourceFileName: "",
      occurrences: [
        {
          originalQuestion: "你们接口自动化里的登录态和 Token 过期怎么处理？",
          category: "技术问题",
          tags: ["接口自动化", "Token"],
          questionId: question.id,
          confidence: "high",
          notes: "",
          answerOverride: ""
        }
      ]
    });

    const reloaded = await createAppStateStore({ dataDir });
    const snapshot = reloaded.getSnapshot();

    expect(snapshot.resumes).toHaveLength(1);
    expect(snapshot.questions).toHaveLength(1);
    expect(snapshot.answers).toHaveLength(1);
    expect(snapshot.interviews).toHaveLength(1);
    expect(snapshot.answers[0]?.isCurrent).toBe(true);
    expect(snapshot.questions[0]?.currentAnswerId).toBe(answer.id);
    expect(snapshot.questions[0]?.frequency).toBe(1);
    expect(snapshot.interviews[0]?.resumeId).toBe(resume.id);
    expect(snapshot.customHighFrequencyTags).toEqual(expect.arrayContaining(["接口自动化", "鉴权"]));
  });

  it("migrates legacy analyses, interview sessions, and high frequency questions into the phase2 model", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-store-"));
    tempRoots.push(dataDir);

    const store = await createAppStateStore({ dataDir });

    await store.replaceSnapshot({
      settings: {
        apiKey: "secret",
        selectedModel: "deepseek-v4-flash"
      },
      analyses: [
        {
          id: "analysis-1",
          fileName: "resume.txt",
          originalText: "三年测试经验，负责接口自动化。",
          extractedTextPreview: "三年测试经验，负责接口自动化。",
          persona: {
            candidateSummary: "三年测试经验",
            strongSkills: ["接口自动化"],
            personalAdvantages: ["表达直接"],
            workExperience: ["负责接口和功能测试"],
            projectHighlights: ["自动化落地"],
            riskPoints: ["移动端自动化偏少"]
          },
          interviewQuestions: [
            {
              id: "analysis-q1",
              questionText: "你们接口自动化的登录态怎么处理？",
              category: "技术问题",
              tags: ["接口自动化", "鉴权"],
              selected: false,
              addedToHighFrequency: true,
              highFrequencyId: "hf-1"
            }
          ],
          createdAt: "2026-08-21T09:00:00.000Z",
          updatedAt: "2026-08-21T09:00:00.000Z"
        }
      ],
      interviewSessions: [
        {
          id: "session-1",
          title: "A公司一面",
          sourceType: "text",
          sourceText: "问了自动化里的 Token 管理。",
          sourceFileName: "",
          createdAt: "2026-08-21T10:00:00.000Z",
          updatedAt: "2026-08-21T10:00:00.000Z",
          questions: [
            {
              id: "q1",
              questionText: "Token 过期以后你们怎么处理？",
              category: "技术问题",
              tags: ["Token"],
              selected: false,
              answerSuggestion: "我会统一封装登录态刷新逻辑。",
              answerGeneratedAt: "2026-08-21T10:00:00.000Z",
              addedToHighFrequency: true,
              highFrequencyId: "hf-1"
            }
          ]
        }
      ],
      highFrequencyQuestions: [
        {
          id: "hf-1",
          questionText: "接口自动化中的登录态和 Token 如何管理？",
          category: "技术问题",
          tags: ["接口自动化", "Token"],
          answerSuggestion: "我一般会把登录态获取、刷新和失效重试收口成公共能力。",
          sourceSessionIds: ["session-1"],
          sourceSessionTitles: ["A公司一面"],
          createdAt: "2026-08-21T10:00:00.000Z",
          updatedAt: "2026-08-21T10:00:00.000Z"
        }
      ],
      dedupeCandidates: [],
      prepInsight: null
    });

    const snapshot = store.getSnapshot();

    expect(snapshot.backupVersion).toBe(2);
    expect(snapshot.resumes).toHaveLength(1);
    expect(snapshot.interviews).toHaveLength(1);
    expect(snapshot.questions).toHaveLength(1);
    expect(snapshot.answers).toHaveLength(1);
    expect(snapshot.resumes[0]?.displayName).toBe("resume");
    expect(snapshot.interviews[0]?.occurrences[0]?.questionId).toBe(snapshot.questions[0]?.id);
    expect(snapshot.questions[0]?.frequency).toBe(1);
    expect(snapshot.questions[0]?.sourceTypes).toEqual(expect.arrayContaining(["resume_prediction", "interview"]));
  });

  it("supports soft delete, restore, and permanent delete for questions", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-store-"));
    tempRoots.push(dataDir);

    const store = await createAppStateStore({ dataDir });
    const question = await store.upsertQuestion({
      standardQuestion: "请做一下自我介绍",
      category: "人事问题",
      tags: ["开场"],
      sourceTypes: ["manual"],
      sourceRefs: [
        {
          type: "manual",
          label: "手动添加"
        }
      ],
      favorite: true,
      masteryLevel: "已整理",
      priority: "high"
    });

    await store.softDeleteEntity("question", question.id);
    expect(store.getSnapshot().questions[0]?.deletedAt).toBeTruthy();

    await store.restoreEntity("question", question.id);
    expect(store.getSnapshot().questions[0]?.deletedAt).toBeNull();

    await store.softDeleteEntity("question", question.id);
    await store.permanentlyDeleteEntity("question", question.id);
    expect(store.getSnapshot().questions).toHaveLength(0);
  });

  it("retains custom high-frequency tags after the source question is deleted", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-store-"));
    tempRoots.push(dataDir);

    const store = await createAppStateStore({ dataDir });
    const question = await store.upsertHighFrequencyQuestion({
      questionText: "接口波动时你怎么做稳定性排查？",
      category: "技术问题",
      tags: ["稳定性排查"],
      answerSuggestion: "",
      sourceSessionIds: [],
      sourceSessionTitles: []
    });

    await store.softDeleteEntity("question", question.id);

    expect(store.getSnapshot().customHighFrequencyTags).toEqual(expect.arrayContaining(["稳定性排查"]));
  });
});
