import { describe, expect, it, vi } from "vitest";

import { analyzeResume, expandResumeInterviewQuestions } from "./analyze-resume.js";

describe("analyzeResume", () => {
  it("returns parsed persona and questions from a DeepSeek response", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        persona: {
          candidateSummary: "Candidate persona",
          strongSkills: ["Skill A"],
          personalAdvantages: ["Advantage A"],
          workExperience: ["Experience A"],
          projectHighlights: ["Highlight A"],
          riskPoints: ["Risk A"]
        },
        interviewQuestions: [
          {
            questionText: "Question 1",
            category: "技术问题",
            tags: ["技术"]
          },
          {
            questionText: "Question 2",
            category: "业务问题",
            tags: ["业务"]
          }
        ]
      })
    );

    const result = await analyzeResume({
      extractedText: "resume body",
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      callModel
    });

    expect(result.persona.candidateSummary).toBe("Candidate persona");
    expect(result.interviewQuestions.map((item) => item.questionText)).toEqual(["Question 1", "Question 2"]);
    expect(result.interviewQuestions[0]?.category).toBe("技术问题");
  });

  it("expands analysis questions without keeping duplicate items", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        interviewQuestions: [
          {
            questionText: "你怎么设计自动化框架？",
            category: "技术问题",
            tags: ["自动化"]
          },
          {
            questionText: "你们项目里的业务指标是什么？",
            category: "业务问题",
            tags: ["业务"]
          }
        ]
      })
    );

    const result = await expandResumeInterviewQuestions({
      extractedText: "resume body",
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      focus: "技术问题",
      existingQuestions: ["你怎么设计自动化框架？"],
      callModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.questionText).toContain("业务指标");
  });
});
