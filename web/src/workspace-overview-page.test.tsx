/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceOverviewPage } from "./components/WorkspaceOverviewPage";

describe("WorkspaceOverviewPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows metrics and global search results across sessions and high-frequency questions", async () => {
    render(
      <WorkspaceOverviewPage
        analyses={[
          {
            id: "analysis-1",
            fileName: "resume.txt",
            originalText: "简历原文",
            extractedTextPreview: "简历预览",
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
                questionText: "请做一下自我介绍",
                category: "人事问题",
                tags: ["开场"],
                selected: false,
                addedToHighFrequency: false,
                highFrequencyId: ""
              }
            ],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          }
        ]}
        sessions={[
          {
            id: "session-1",
            title: "某公司一面",
            sourceType: "text",
            sourceText: "本场被问到自我介绍和项目亮点",
            sourceFileName: "",
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
            questions: [
              {
                id: "q1",
                questionText: "请做一下自我介绍",
                category: "人事问题",
                tags: ["开场"],
                selected: false,
                answerSuggestion: "",
                answerGeneratedAt: "",
                addedToHighFrequency: false,
                highFrequencyId: ""
              }
            ]
          }
        ]}
        highFrequencyQuestions={[
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "",
            sourceSessionIds: ["session-1"],
            sourceSessionTitles: ["某公司一面"],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          }
        ]}
        dedupeCandidates={[
          {
            questionAId: "a1",
            questionBId: "b1",
            reason: "都在问项目亮点",
            confidence: "high",
            recommendedAction: "merge"
          }
        ]}
        prepInsight={null}
        generatingPrepInsight={false}
        onGeneratePrepInsight={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText("作战总览")).toBeTruthy();
    expect(screen.getByText("现在建议先做什么")).toBeTruthy();
    expect(screen.getByText("1 条")).toBeTruthy();
    expect(screen.getByText("1 场")).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看使用教程" })).toBeTruthy();
    expect(screen.getByText("还有 1 道题没回答稿")).toBeTruthy();
    expect(screen.getByText("有 1 组重复题待确认")).toBeTruthy();
  });

  it("shows loading feedback while generating ai prep insight", () => {
    render(
      <WorkspaceOverviewPage
        analyses={[]}
        sessions={[]}
        highFrequencyQuestions={[]}
        dedupeCandidates={[]}
        prepInsight={null}
        generatingPrepInsight
        onGeneratePrepInsight={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText("现在建议先做什么")).toBeTruthy();
    expect(screen.getByRole("button", { name: "正在生成 AI 备战建议..." })).toBeTruthy();
  });
});
