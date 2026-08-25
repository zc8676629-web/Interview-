import { describe, expect, it, vi } from "vitest";

import {
  extractInterviewQuestions,
  findDedupeCandidates,
  generatePrepInsights,
  generateAnswerSuggestions
} from "./interview-ai.js";

describe("extractInterviewQuestions", () => {
  it("returns a normalized question list", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        questions: [
          {
            questionText: "请介绍一下你做过的自动化项目",
            category: "项目问题",
            tags: ["自动化"]
          }
        ]
      })
    );

    const result = await extractInterviewQuestions({
      sourceText: "mock transcript",
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      callModel
    });

    expect(result.questions[0]?.questionText).toContain("自动化项目");
    expect(result.questions[0]?.category).toBe("项目问题");
  });
});

describe("generateAnswerSuggestions", () => {
  it("returns answer suggestions only for selected questions", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        answers: [
          {
            questionId: "q1",
            answerSuggestion: "先说背景，再说做法，最后说结果。"
          }
        ]
      })
    );

    const result = await generateAnswerSuggestions({
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      questions: [
        { id: "q1", questionText: "你怎么做自动化？" }
      ],
      resumeContext: {
        fileName: "resume.txt",
        originalText: "三年测试经验，做过接口自动化。",
        candidateSummary: "三年测试经验",
        strongSkills: ["接口自动化"],
        personalAdvantages: ["表达直接"],
        workExperience: ["负责接口和功能测试"],
        projectHighlights: ["主导接口自动化落地"],
        riskPoints: []
      },
      callModel
    });

    expect(result.answers[0]?.questionId).toBe("q1");
    expect(result.answers[0]?.answerSuggestion).toContain("背景");
    expect(callModel).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("简历文件：resume.txt")
          })
        ])
      })
    );
  });
});

describe("findDedupeCandidates", () => {
  it("returns candidate duplicate pairs", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        candidates: [
          {
            questionAId: "a1",
            questionBId: "b1",
            reason: "都在问自动化框架设计",
            confidence: "high",
            recommendedAction: "merge"
          }
        ]
      })
    );

    const result = await findDedupeCandidates({
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      questions: [
        { id: "a1", questionText: "你怎么设计自动化框架？" },
        { id: "b1", questionText: "自动化测试框架是怎么搭的？" }
      ],
      callModel
    });

    expect(result.candidates[0]?.reason).toContain("自动化框架");
  });
});

describe("generatePrepInsights", () => {
  it("returns structured prep guidance grounded in resume and interview data", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        summary: "最近更需要先补自我介绍和项目表达。",
        priorities: ["自我介绍", "项目经历"],
        coverageGaps: ["高频题里还有 2 题没有回答"],
        nextActions: ["先把最近一场面试的高频题补完"]
      })
    );

    const result = await generatePrepInsights({
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      resumeContext: {
        fileName: "resume.txt",
        originalText: "三年测试经验，做过接口自动化。",
        candidateSummary: "三年测试经验",
        strongSkills: ["接口自动化"],
        personalAdvantages: ["表达直接"],
        workExperience: ["负责接口和功能测试"],
        projectHighlights: ["主导接口自动化落地"],
        riskPoints: ["移动端自动化偏少"]
      },
      interviewSessions: [
        {
          title: "某公司一面",
          questions: [
            {
              questionText: "请做一下自我介绍",
              category: "人事问题",
              answerSuggestion: ""
            }
          ]
        }
      ],
      highFrequencyQuestions: [
        {
          questionText: "你们项目的亮点是什么",
          category: "项目问题",
          answerSuggestion: ""
        }
      ],
      callModel
    });

    expect(result.summary).toContain("自我介绍");
    expect(result.priorities).toContain("项目经历");
    expect(callModel).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("某公司一面")
          })
        ])
      })
    );
  });
});
