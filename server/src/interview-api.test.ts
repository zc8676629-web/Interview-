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

describe("POST /api/interview-sessions/extract-questions", () => {
  it("rejects empty session titles", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });
    const response = await request(app).post("/api/interview-sessions/extract-questions").send({
      title: "",
      sourceText: "mock text",
      sourceType: "text"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("标题");
  });

  it("extracts questions when input is valid", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      extractInterviewQuestions: vi.fn().mockResolvedValue({
        questions: [
          {
            questionText: "请介绍你的项目",
            category: "项目问题",
            tags: ["项目"]
          }
        ]
      })
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    const response = await request(app).post("/api/interview-sessions/extract-questions").send({
      title: "XXX一面",
      sourceText: "mock text",
      sourceType: "text"
    });

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(1);
  });
});

describe("interview session actions", () => {
  it("stores a session, generates resume-grounded answers, and adds selected questions to high frequency", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const generateAnswerSuggestions = vi.fn().mockResolvedValue({
      answers: [
        {
          questionId: "q1",
          answerSuggestion: "我一般会先简单介绍经历，再重点说我在项目里实际负责的部分。"
        }
      ]
    });
    const app = await createApp({
      dataDir,
      analyzeResume: vi.fn().mockResolvedValue({
        persona: {
          candidateSummary: "三年测试经验，做过酒店预订和社区项目。",
          strongSkills: ["接口自动化"],
          personalAdvantages: ["沟通直接"],
          workExperience: ["负责功能和接口测试"],
          projectHighlights: ["做过酒店预订和社区项目"],
          riskPoints: ["移动端自动化经验较少"]
        },
        interviewQuestions: ["请介绍你的项目经历"]
      }),
      generateAnswerSuggestions
    });

    await request(app)
      .post("/api/settings")
      .send({
        apiKey: "secret",
        selectedModel: "deepseek-v4-flash"
      });

    await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("三年测试经验，做过酒店预订和社区项目。"), {
        filename: "resume.txt",
        contentType: "text/plain"
      });

    const createResponse = await request(app).post("/api/interview-sessions").send({
      title: "XXX一面",
      sourceType: "text",
      sourceText: "原始面试文本",
      questions: [
        {
          id: "q1",
          questionText: "请介绍你的项目",
          category: "项目问题",
          tags: ["项目"],
          selected: true,
          answerSuggestion: "",
          answerGeneratedAt: "",
          addedToHighFrequency: false,
          highFrequencyId: ""
        }
      ]
    });

    const sessionId = createResponse.body.id as string;

    const answerResponse = await request(app).post(`/api/interview-sessions/${sessionId}/questions/answer`).send({
      questionIds: ["q1"]
    });
    expect(answerResponse.status).toBe(200);
    expect(answerResponse.body.session.questions[0].answerSuggestion).toContain("我一般会先简单介绍经历");
    expect(generateAnswerSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        questions: [{ id: "q1", questionText: "请介绍你的项目" }],
        resumeContext: expect.objectContaining({
          fileName: "resume.txt"
        })
      })
    );

    const addResponse = await request(app).post(`/api/interview-sessions/${sessionId}/questions/add-to-high-frequency`).send({
      questionIds: ["q1"]
    });
    expect(addResponse.status).toBe(200);
    expect(addResponse.body.highFrequencyQuestions).toHaveLength(1);
    expect(addResponse.body.highFrequencyQuestions[0].answerSuggestion).toContain("我一般会先简单介绍经历");
  });

  it("syncs answers from interview sessions into high-frequency questions and back again after editing", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      generateAnswerSuggestions: vi.fn().mockResolvedValue({
        answers: [
          {
            questionId: "q1",
            answerSuggestion: "我会先讲背景，再讲我实际负责的自动化方案。"
          }
        ]
      })
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    const createResponse = await request(app).post("/api/interview-sessions").send({
      title: "XXX一面",
      sourceType: "text",
      sourceText: "原始面试文本",
      questions: [
        {
          id: "q1",
          questionText: "你们项目里的自动化怎么做的",
          category: "技术问题",
          tags: ["自动化"],
          selected: true,
          answerSuggestion: "",
          answerGeneratedAt: "",
          addedToHighFrequency: false,
          highFrequencyId: ""
        }
      ]
    });
    const sessionId = createResponse.body.id as string;

    const addResponse = await request(app).post(`/api/interview-sessions/${sessionId}/questions/add-to-high-frequency`).send({
      questionIds: ["q1"]
    });
    const highFrequencyId = addResponse.body.highFrequencyQuestions[0].id as string;

    const answerResponse = await request(app).post(`/api/interview-sessions/${sessionId}/questions/answer`).send({
      questionIds: ["q1"]
    });

    expect(answerResponse.status).toBe(200);
    expect(answerResponse.body.highFrequencyQuestions[0].answerSuggestion).toContain("我会先讲背景");

    const editHighFrequencyResponse = await request(app).patch(`/api/high-frequency-questions/${highFrequencyId}`).send({
      answerSuggestion: "我一般会先说场景，再说我是怎么把自动化真正落下去的。"
    });

    expect(editHighFrequencyResponse.status).toBe(200);
    expect(editHighFrequencyResponse.body.question.answerSuggestion).toContain("真正落下去");
    expect(editHighFrequencyResponse.body.interviewSessions[0].questions[0].answerSuggestion).toContain("真正落下去");
  });

  it("uses the interview-bound resume instead of the latest uploaded resume when generating answers", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const analyzeResume = vi
      .fn()
      .mockResolvedValueOnce({
        persona: {
          candidateSummary: "第一份简历",
          strongSkills: ["接口自动化"],
          personalAdvantages: ["表达直接"],
          workExperience: ["负责接口和功能测试"],
          projectHighlights: ["酒店预订项目"],
          riskPoints: []
        },
        interviewQuestions: ["请介绍你的自动化项目"]
      })
      .mockResolvedValueOnce({
        persona: {
          candidateSummary: "第二份简历",
          strongSkills: ["测试开发"],
          personalAdvantages: ["沟通直接"],
          workExperience: ["负责平台测试"],
          projectHighlights: ["社区项目"],
          riskPoints: []
        },
        interviewQuestions: ["请介绍你的平台项目"]
      });
    const generateAnswerSuggestions = vi.fn().mockResolvedValue({
      answers: [
        {
          questionId: "q1",
          answerSuggestion: "我会先讲自动化方案，再说具体怎么维护登录态。"
        }
      ]
    });
    const app = await createApp({
      dataDir,
      analyzeResume,
      generateAnswerSuggestions
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    const firstResumeResponse = await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("第一份简历，酒店预订和接口自动化。"), {
        filename: "resume-a.txt",
        contentType: "text/plain"
      });

    await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("第二份简历，社区项目和平台测试。"), {
        filename: "resume-b.txt",
        contentType: "text/plain"
      });

    const createResponse = await request(app).post("/api/interview-sessions").send({
      title: "绑定第一份简历的一面",
      sourceType: "text",
      sourceText: "原始面试文本",
      resumeId: firstResumeResponse.body.id,
      questions: [
        {
          id: "q1",
          questionText: "你们接口自动化的登录态怎么处理？",
          category: "技术问题",
          tags: ["接口自动化"],
          selected: true,
          answerSuggestion: "",
          answerGeneratedAt: "",
          addedToHighFrequency: false,
          highFrequencyId: ""
        }
      ]
    });

    const sessionId = createResponse.body.id as string;
    const answerResponse = await request(app).post(`/api/interview-sessions/${sessionId}/questions/answer`).send({
      questionIds: ["q1"]
    });

    expect(answerResponse.status).toBe(200);
    expect(generateAnswerSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeContext: expect.objectContaining({
          fileName: "resume-a.txt"
        })
      })
    );
  });
});

describe("high frequency manual create", () => {
  it("creates a manual high-frequency question without source sessions", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    const response = await request(app).post("/api/high-frequency-questions").send({
      questionText: "请做一下自我介绍",
      category: "人事问题",
      tags: ["开场"],
      answerSuggestion: "先说经历，再说优势。"
    });

    expect(response.status).toBe(201);
    expect(response.body.questionText).toBe("请做一下自我介绍");
    expect(response.body.sourceSessionIds).toEqual([]);
  });
});

describe("DELETE /api/interview-sessions/:id", () => {
  it("removes a saved interview session", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    const createResponse = await request(app).post("/api/interview-sessions").send({
      title: "XXX一面",
      sourceType: "text",
      sourceText: "原始面试文本",
      questions: []
    });

    const sessionId = createResponse.body.id as string;
    const deleteResponse = await request(app).delete(`/api/interview-sessions/${sessionId}`);
    expect(deleteResponse.status).toBe(200);

    const listResponse = await request(app).get("/api/interview-sessions");
    expect(listResponse.body).toEqual([]);
  });
});

describe("analysis actions", () => {
  it("deletes a saved resume analysis", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      analyzeResume: vi.fn().mockResolvedValue({
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
            questionText: "请介绍一下你的自动化项目",
            category: "项目问题",
            tags: ["自动化项目"]
          }
        ]
      })
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    const analyzeResponse = await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("三年测试经验，负责接口自动化。"), {
        filename: "resume.txt",
        contentType: "text/plain"
      });

    const analysisId = analyzeResponse.body.id as string;
    const deleteResponse = await request(app).delete(`/api/analyses/${analysisId}`);

    expect(deleteResponse.status).toBe(200);
    const bootstrapResponse = await request(app).get("/api/bootstrap");
    expect(bootstrapResponse.body.analyses).toEqual([]);
  });

  it("expands resume questions without appending duplicates and adds selected ones to high frequency", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      analyzeResume: vi.fn().mockResolvedValue({
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
            questionText: "请介绍一下你的自动化项目",
            category: "项目问题",
            tags: ["自动化项目"]
          }
        ]
      }),
      expandResumeInterviewQuestions: vi.fn().mockResolvedValue([
        {
          questionText: "请介绍一下你的自动化项目",
          category: "项目问题",
          tags: ["重复题"]
        },
        {
          questionText: "你们项目里的业务指标和验证重点是什么",
          category: "业务问题",
          tags: ["业务指标"]
        }
      ])
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    const analyzeResponse = await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("三年测试经验，负责接口自动化。"), {
        filename: "resume.txt",
        contentType: "text/plain"
      });

    const analysisId = analyzeResponse.body.id as string;

    const expandResponse = await request(app)
      .post(`/api/analyses/${analysisId}/questions/expand`)
      .send({ focus: "业务问题" });

    expect(expandResponse.status).toBe(200);
    expect(expandResponse.body.analysis.interviewQuestions).toHaveLength(2);
    expect(expandResponse.body.analysis.interviewQuestions[1].questionText).toContain("业务指标");

    const questionId = expandResponse.body.analysis.interviewQuestions[0].id as string;
    const addResponse = await request(app)
      .post(`/api/analyses/${analysisId}/questions/add-to-high-frequency`)
      .send({ questionIds: [questionId] });

    expect(addResponse.status).toBe(200);
    expect(addResponse.body.analysis.interviewQuestions[0].addedToHighFrequency).toBe(true);
    expect(addResponse.body.highFrequencyQuestions[0].questionText).toContain("自动化项目");
  });

  it("renames a resume, marks it as primary, generates an answer directly from a predicted question, and restores it from recycle bin", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      analyzeResume: vi.fn().mockResolvedValue({
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
            questionText: "你们接口自动化里的登录态怎么处理？",
            category: "技术问题",
            tags: ["接口自动化", "鉴权"]
          }
        ]
      }),
      generateAnswerSuggestions: vi.fn().mockResolvedValue({
        answers: [
          {
            questionId: "question-1",
            answerSuggestion: "我一般会把登录态获取、刷新和失效重试都封装成公共能力。"
          }
        ]
      })
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    const analyzeResponse = await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("三年测试经验，负责接口自动化。"), {
        filename: "resume.txt",
        contentType: "text/plain"
      });

    const resumeId = analyzeResponse.body.id as string;
    const predictionId = analyzeResponse.body.interviewQuestions[0].id as string;

    const renameResponse = await request(app).patch(`/api/resumes/${resumeId}`).send({
      displayName: "自动化测试-V3",
      isPrimary: true
    });

    expect(renameResponse.status).toBe(200);
    expect(renameResponse.body.resume.displayName).toBe("自动化测试-V3");
    expect(renameResponse.body.resume.isPrimary).toBe(true);

    const answerResponse = await request(app)
      .post(`/api/resumes/${resumeId}/predicted-questions/${predictionId}/answer`)
      .send({});

    expect(answerResponse.status).toBe(200);
    expect(answerResponse.body.resume.predictedQuestions[0].linkedQuestionId).toBeTruthy();
    expect(answerResponse.body.question.standardQuestion).toContain("登录态");
    expect(answerResponse.body.answer.content).toContain("公共能力");

    const deleteResponse = await request(app).delete(`/api/resumes/${resumeId}`);
    expect(deleteResponse.status).toBe(200);

    const restoreResponse = await request(app).post(`/api/recycle-bin/resume/${resumeId}/restore`).send({});
    expect(restoreResponse.status).toBe(200);
    expect(restoreResponse.body.resume.deletedAt).toBeNull();
  });

  it("rejects predicted-answer generation when the target resume is not the current ai resume", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({
      dataDir,
      analyzeResume: vi
        .fn()
        .mockResolvedValueOnce({
          persona: {
            candidateSummary: "第一份简历",
            strongSkills: ["接口自动化"],
            personalAdvantages: ["表达直接"],
            workExperience: ["负责接口和功能测试"],
            projectHighlights: ["自动化落地"],
            riskPoints: []
          },
          interviewQuestions: [
            {
              questionText: "你们接口自动化里的登录态怎么处理？",
              category: "技术问题",
              tags: ["接口自动化", "鉴权"]
            }
          ]
        })
        .mockResolvedValueOnce({
          persona: {
            candidateSummary: "第二份简历",
            strongSkills: ["平台测试"],
            personalAdvantages: ["沟通直接"],
            workExperience: ["负责平台质量"],
            projectHighlights: ["平台项目"],
            riskPoints: []
          },
          interviewQuestions: [
            {
              questionText: "你们平台项目里最复杂的链路是什么？",
              category: "项目问题",
              tags: ["平台项目"]
            }
          ]
        })
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("第一份简历"), {
        filename: "resume-a.txt",
        contentType: "text/plain"
      });

    const secondResumeResponse = await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("第二份简历"), {
        filename: "resume-b.txt",
        contentType: "text/plain"
      });

    const secondResumeId = secondResumeResponse.body.id as string;
    const predictionId = secondResumeResponse.body.interviewQuestions[0].id as string;

    const answerResponse = await request(app)
      .post(`/api/resumes/${secondResumeId}/predicted-questions/${predictionId}/answer`)
      .send({});

    expect(answerResponse.status).toBe(409);
    expect(answerResponse.body.error).toContain("当前 AI 回答依据");
    expect(answerResponse.body.error).toContain("resume-a");
  });
});

describe("prep insight and local backup", () => {
  it("generates prep insight from resume, sessions, and high-frequency questions", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const generatePrepInsights = vi.fn().mockResolvedValue({
      summary: "优先补自我介绍和项目亮点表达。",
      priorities: ["自我介绍", "项目亮点"],
      coverageGaps: ["高频题里仍有未回答问题"],
      nextActions: ["先补最近一场面试里被重复问到的题"]
    });
    const app = await createApp({
      dataDir,
      generatePrepInsights,
      analyzeResume: vi.fn().mockResolvedValue({
        persona: {
          candidateSummary: "三年测试经验，做过酒店预订和社区项目。",
          strongSkills: ["接口自动化"],
          personalAdvantages: ["沟通直接"],
          workExperience: ["负责功能和接口测试"],
          projectHighlights: ["做过酒店预订和社区项目"],
          riskPoints: ["移动端自动化经验较少"]
        },
        interviewQuestions: ["请介绍你的项目经历"]
      })
    });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-flash"
    });

    await request(app)
      .post("/api/analyze-resume")
      .attach("resume", Buffer.from("三年测试经验，做过酒店预订和社区项目。"), {
        filename: "resume.txt",
        contentType: "text/plain"
      });

    const sessionResponse = await request(app).post("/api/interview-sessions").send({
      title: "某公司一面",
      sourceType: "text",
      sourceText: "原始面试文本",
      questions: [
        {
          id: "q1",
          questionText: "请做一下自我介绍",
          category: "人事问题",
          tags: ["开场"],
          selected: true,
          answerSuggestion: "",
          answerGeneratedAt: "",
          addedToHighFrequency: false,
          highFrequencyId: ""
        }
      ]
    });

    await request(app).post("/api/high-frequency-questions").send({
      questionText: "你们项目最大的亮点是什么",
      category: "项目问题",
      tags: ["项目"],
      answerSuggestion: ""
    });

    const response = await request(app).post("/api/prep-insights/generate").send();

    expect(response.status).toBe(200);
    expect(response.body.summary).toContain("自我介绍");
    expect(generatePrepInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeContext: expect.objectContaining({
          fileName: "resume.txt"
        }),
        interviewSessions: expect.arrayContaining([
          expect.objectContaining({
            title: "某公司一面"
          })
        ])
      })
    );

    expect(sessionResponse.status).toBe(201);
  });

  it("exports local data without api key and imports it back while keeping the local key", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "interview-api-"));
    tempRoots.push(dataDir);
    const app = await createApp({ dataDir });

    await request(app).post("/api/settings").send({
      apiKey: "secret",
      selectedModel: "deepseek-v4-pro"
    });

    await request(app).post("/api/interview-sessions").send({
      title: "已存在场次",
      sourceType: "text",
      sourceText: "原始面试文本",
      questions: []
    });

    const exportResponse = await request(app).get("/api/data/export");
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.snapshot.settings.apiKey).toBe("");
    expect(exportResponse.body.snapshot.settings.selectedModel).toBe("deepseek-v4-pro");

    const importResponse = await request(app).post("/api/data/import").send({
      version: 1,
      exportedAt: "2026-08-21T12:00:00.000Z",
      snapshot: {
        settings: {
          apiKey: "",
          selectedModel: "deepseek-v4-flash"
        },
        analyses: [],
        interviewSessions: [
          {
            id: "imported-session",
            title: "导入的一面",
            sourceType: "text",
            sourceText: "导入文本",
            sourceFileName: "",
            createdAt: "2026-08-21T12:00:00.000Z",
            updatedAt: "2026-08-21T12:00:00.000Z",
            questions: []
          }
        ],
        highFrequencyQuestions: [],
        customHighFrequencyTags: ["自定义标签"],
        dedupeCandidates: [],
        prepInsight: {
          generatedAt: "2026-08-21T12:00:00.000Z",
          summary: "先补开场题",
          priorities: ["自我介绍"],
          coverageGaps: [],
          nextActions: ["先补 1 题"]
        }
      }
    });

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.settings.hasApiKey).toBe(true);
    expect(importResponse.body.settings.selectedModel).toBe("deepseek-v4-flash");
    expect(importResponse.body.interviewSessions[0].title).toBe("导入的一面");
    expect(importResponse.body.customHighFrequencyTags).toEqual(expect.arrayContaining(["自定义标签"]));
    expect(importResponse.body.prepInsight.summary).toContain("开场题");
  });
});
