/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InterviewSessionsPage } from "./components/InterviewSessionsPage";
import { createInterviewSession, extractInterviewQuestions } from "./lib/api";

vi.mock("./lib/api", () => ({
  addQuestionsToHighFrequency: vi.fn(),
  createInterviewSession: vi.fn(),
  deleteInterviewSession: vi.fn().mockResolvedValue({ ok: true }),
  extractInterviewQuestions: vi.fn(),
  fetchBootstrap: vi.fn(async () => ({
    settings: {
      hasApiKey: false,
      selectedModel: "deepseek-v4-flash",
      maskedApiKey: ""
    },
    resumes: [],
    interviews: [],
    questions: [],
    answers: [],
    recycleBin: {
      resumes: [],
      interviews: [],
      questions: [],
      answers: []
    },
    analyses: [],
    interviewSessions: [],
    highFrequencyQuestions: [],
    customHighFrequencyTags: [],
    dedupeCandidates: [],
    prepInsight: null
  })),
  generateInterviewAnswers: vi.fn(
    () =>
      new Promise(() => {
        // Keep pending to verify loading feedback.
      })
  ),
  updateInterviewSessionQuestions: vi.fn(async (sessionId: string, questions: unknown[]) => ({
    session: {
      id: sessionId,
      title: "XXX一面",
      sourceType: "text",
      sourceText: "原始文本",
      sourceFileName: "",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      questions
    },
    highFrequencyQuestions: []
  }))
}));

describe("InterviewSessionsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters questions by category", async () => {
    render(
      <InterviewSessionsPage
        sessions={[
          {
            id: "session-1",
            title: "XXX一面",
            sourceType: "text",
            sourceText: "原始文本",
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
              },
              {
                id: "q2",
                questionText: "你们项目的接口自动化怎么做的",
                category: "技术问题",
                tags: ["接口自动化"],
                selected: false,
                answerSuggestion: "",
                answerGeneratedAt: "",
                addedToHighFrequency: false,
                highFrequencyId: ""
              }
            ]
          }
        ]}
        onBootstrapSync={vi.fn()}
        onSessionsChange={vi.fn()}
        onHighFrequencyChange={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    expect(screen.getByText("场次指挥台")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "技术" }));
    expect(screen.queryByText("请做一下自我介绍")).toBeNull();
    expect(screen.getByText("你们项目的接口自动化怎么做的")).toBeTruthy();
  });

  it("shows loading feedback after clicking AI answer suggestion", async () => {
    render(
      <InterviewSessionsPage
        sessions={[
          {
            id: "session-1",
            title: "XXX一面",
            sourceType: "text",
            sourceText: "原始文本",
            sourceFileName: "",
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
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
          }
        ]}
        onBootstrapSync={vi.fn()}
        onSessionsChange={vi.fn()}
        onHighFrequencyChange={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    expect(screen.getByText("场次指挥台")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "AI回答建议" }));
    expect(screen.getByRole("button", { name: "正在生成回答..." })).toBeTruthy();
  });

  it("renders session questions inside their own scroll region", () => {
    render(
      <InterviewSessionsPage
        sessions={[
          {
            id: "session-1",
            title: "XXX一面",
            sourceType: "text",
            sourceText: "原始文本",
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
        onBootstrapSync={vi.fn()}
        onSessionsChange={vi.fn()}
        onHighFrequencyChange={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    const region = screen.getByRole("region", { name: "本场问题列表" });
    expect(region.getAttribute("class")).toContain("question-list-scroll-region");
    expect(region.querySelector(".question-list")).toBeTruthy();
  });

  it("supports editing and deleting a session question", async () => {
    const onSessionsChange = vi.fn();
    render(
      <InterviewSessionsPage
        sessions={[
          {
            id: "session-1",
            title: "XXX一面",
            sourceType: "text",
            sourceText: "原始文本",
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
        onBootstrapSync={vi.fn()}
        onSessionsChange={onSessionsChange}
        onHighFrequencyChange={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "编辑问题" }));
    const input = screen.getByDisplayValue("请做一下自我介绍");
    await userEvent.clear(input);
    await userEvent.type(input, "请你先做一个简短的自我介绍");
    await userEvent.click(screen.getByRole("button", { name: "保存问题" }));
    expect(onSessionsChange).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "删除场次" }));
  });

  it("passes the selected resume when saving a new interview session", async () => {
    vi.mocked(extractInterviewQuestions).mockResolvedValue({
      title: "A公司一面",
      questions: [
        {
          id: "draft-1",
          questionText: "你们接口自动化里的登录态怎么处理？",
          category: "技术问题",
          tags: ["接口自动化"],
          selected: false,
          answerSuggestion: "",
          answerGeneratedAt: "",
          addedToHighFrequency: false,
          highFrequencyId: ""
        }
      ]
    });
    vi.mocked(createInterviewSession).mockResolvedValue({
      id: "session-2",
      title: "A公司一面",
      sourceType: "text",
      sourceText: "原始文本",
      sourceFileName: "",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      questions: []
    });

    render(
      <InterviewSessionsPage
        sessions={[]}
        resumes={[
          {
            id: "resume-1",
            displayName: "自动化测试-V3",
            originalFileName: "resume.txt",
            version: 3,
            uploadedAt: "2026-08-21T09:00:00.000Z",
            isPrimary: true,
            parsedText: "简历正文",
            profile: {
              candidateSummary: "三年测试经验",
              strongSkills: ["接口自动化"],
              personalAdvantages: ["表达直接"],
              workExperience: ["负责接口和功能测试"],
              projectHighlights: ["自动化落地"],
              riskPoints: []
            },
            predictedQuestions: [],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z",
            deletedAt: null
          }
        ]}
        onBootstrapSync={vi.fn()}
        onSessionsChange={vi.fn()}
        onHighFrequencyChange={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "新建面试场次" }));
    await userEvent.type(screen.getByLabelText("本场面试标题"), "A公司一面");
    await userEvent.type(screen.getByLabelText("面试文本"), "面试官问了接口自动化和登录态。");
    await userEvent.selectOptions(screen.getByLabelText("关联简历记录（可选）"), "resume-1");
    await userEvent.click(screen.getByRole("button", { name: "AI整理问题" }));
    await userEvent.click(screen.getByRole("button", { name: "确认保存" }));

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeId: "resume-1"
      })
    );
  });
});
