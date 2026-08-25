import { describe, expect, it, vi } from "vitest";

import { analyzeResume } from "./analyze-resume.js";

describe("analyzeResume structured persona", () => {
  it("parses multi-section persona output", async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        persona: {
          candidateSummary: "3年测试经验，偏自动化。",
          strongSkills: ["Python", "接口自动化"],
          personalAdvantages: ["定位问题快"],
          workExperience: ["Keep 社区 UGC", "途牛酒店业务"],
          projectHighlights: ["搭建接口自动化框架"],
          riskPoints: ["性能测试经验较少"]
        },
        interviewQuestions: [
          {
            questionText: "你怎么设计自动化框架？",
            category: "技术问题",
            tags: ["自动化框架"]
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

    expect(result.persona.candidateSummary).toContain("测试经验");
    expect(result.persona.strongSkills).toEqual(["Python", "接口自动化"]);
    expect(result.interviewQuestions.map((item) => item.questionText)).toEqual(["你怎么设计自动化框架？"]);
  });
});
