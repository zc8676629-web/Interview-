/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GlobalSearchPanel } from "./components/GlobalSearchPanel";

describe("GlobalSearchPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("navigates to the exact predicted question result", async () => {
    const onNavigate = vi.fn();

    render(
      <GlobalSearchPanel
        resumes={[
          {
            id: "resume-1",
            displayName: "自动化测试-V2",
            originalFileName: "resume.txt",
            version: 2,
            uploadedAt: "2026-08-21T09:00:00.000Z",
            isPrimary: true,
            parsedText: "三年测试经验",
            profile: {
              candidateSummary: "三年测试经验",
              strongSkills: ["接口自动化"],
              personalAdvantages: ["表达直接"],
              workExperience: ["负责接口和功能测试"],
              projectHighlights: ["自动化落地"],
              riskPoints: []
            },
            predictedQuestions: [
              {
                id: "prediction-1",
                questionText: "你们接口自动化里的登录态怎么处理？",
                category: "技术问题",
                tags: ["接口自动化", "鉴权"],
                linkedQuestionId: "question-1",
                favorite: false,
                ignoredAt: null,
                createdAt: "2026-08-21T09:00:00.000Z",
                updatedAt: "2026-08-21T09:00:00.000Z"
              }
            ],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
            deletedAt: null
          }
        ]}
        questions={[
          {
            id: "question-1",
            standardQuestion: "接口自动化里的登录态怎么处理？",
            category: "技术问题",
            tags: ["接口自动化", "鉴权"],
            sourceTypes: ["resume_prediction"],
            sourceRefs: [{ type: "resume_prediction", resumeId: "resume-1", label: "自动化测试-V2" }],
            favorite: false,
            masteryLevel: "未准备",
            priority: "medium",
            frequency: 0,
            firstAskedAt: null,
            lastAskedAt: null,
            relatedQuestionIds: [],
            currentAnswerId: "answer-1",
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
            deletedAt: null
          }
        ]}
        answers={[
          {
            id: "answer-1",
            questionId: "question-1",
            content: "我会把鉴权刷新和失效重试收口成公共能力。",
            version: 1,
            type: "standard",
            source: "ai_generated",
            resumeId: "resume-1",
            isCurrent: true,
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
            deletedAt: null
          }
        ]}
        sessions={[]}
        highFrequencyQuestions={[]}
        onNavigate={onNavigate}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("搜索简历、场次、题目、回答或标签"), "鉴权刷新");
    await userEvent.click(screen.getByRole("button", { name: /自动化测试-V2 · 简历预测题/ }));

    expect(onNavigate).toHaveBeenCalledWith({
      page: "resume",
      resumeId: "resume-1",
      predictionId: "prediction-1"
    });
  });

  it("navigates to the exact session question result", async () => {
    const onNavigate = vi.fn();

    render(
      <GlobalSearchPanel
        resumes={[]}
        questions={[]}
        answers={[]}
        sessions={[
          {
            id: "session-1",
            title: "某公司一面",
            sourceType: "text",
            sourceText: "原始文本",
            sourceFileName: "",
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
            questions: [
              {
                id: "q1",
                questionText: "如果接口返回抖动你怎么排查？",
                category: "技术问题",
                tags: ["稳定性"],
                selected: false,
                answerSuggestion: "我会先复现，再拆请求链路和依赖方。",
                answerGeneratedAt: "",
                addedToHighFrequency: false,
                highFrequencyId: ""
              }
            ]
          }
        ]}
        highFrequencyQuestions={[]}
        onNavigate={onNavigate}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("搜索简历、场次、题目、回答或标签"), "复现");
    await userEvent.click(screen.getByRole("button", { name: /某公司一面 · 面试场次题/ }));

    expect(onNavigate).toHaveBeenCalledWith({
      page: "interview-sessions",
      sessionId: "session-1",
      questionId: "q1"
    });
  });

  it("navigates to the exact high-frequency question result", async () => {
    const onNavigate = vi.fn();

    render(
      <GlobalSearchPanel
        resumes={[]}
        questions={[]}
        answers={[]}
        sessions={[]}
        highFrequencyQuestions={[
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "高频亮点在于真正落地了自动化。",
            sourceSessionIds: [],
            sourceSessionTitles: [],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          }
        ]}
        onNavigate={onNavigate}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("搜索简历、场次、题目、回答或标签"), "高频亮点");
    await userEvent.click(screen.getByRole("button", { name: /项目问题 · 高频题库/ }));

    expect(onNavigate).toHaveBeenCalledWith({
      page: "high-frequency",
      questionId: "hf-1"
    });
  });
});
