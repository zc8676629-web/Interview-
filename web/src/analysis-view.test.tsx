/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisView } from "./components/AnalysisView";
import {
  answerPredictedQuestion,
  updateResume,
  type AnswerRecord,
  type QuestionRecord,
  type ResumeRecord
} from "./lib/api";

vi.mock("./lib/api", async () => {
  const actual = await vi.importActual<typeof import("./lib/api")>("./lib/api");
  return {
    ...actual,
    answerPredictedQuestion: vi.fn(),
    updateResume: vi.fn()
  };
});

const baseResume: ResumeRecord = {
  id: "resume-1",
  displayName: "自动化测试-V2",
  originalFileName: "resume.txt",
  version: 2,
  uploadedAt: "2026-08-21T09:00:00.000Z",
  isPrimary: false,
  parsedText: "三年测试经验，负责接口自动化。",
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
      id: "prediction-1",
      questionText: "你们接口自动化里的登录态怎么处理？",
      category: "技术问题",
      tags: ["接口自动化", "鉴权"],
      linkedQuestionId: "",
      favorite: false,
      ignoredAt: null,
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z"
    }
  ],
  createdAt: "2026-08-21T09:00:00.000Z",
  updatedAt: "2026-08-21T09:00:00.000Z",
  deletedAt: null
};

const baseQuestion: QuestionRecord = {
  id: "question-1",
  standardQuestion: "接口自动化中的登录态和 Token 如何管理？",
  category: "技术问题",
  tags: ["接口自动化", "鉴权"],
  sourceTypes: ["resume_prediction"],
  sourceRefs: [
    {
      type: "resume_prediction",
      resumeId: "resume-1",
      label: "自动化测试-V2"
    }
  ],
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
};

const baseAnswer: AnswerRecord = {
  id: "answer-1",
  questionId: "question-1",
  content: "我一般会把登录态获取、刷新和失效重试封装成公共能力。",
  version: 1,
  type: "standard",
  source: "ai_generated",
  resumeId: "resume-1",
  isCurrent: true,
  createdAt: "2026-08-21T09:00:00.000Z",
  updatedAt: "2026-08-21T09:00:00.000Z",
  deletedAt: null
};

describe("AnalysisView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("marks a resume as the current AI resume", async () => {
    vi.mocked(updateResume).mockResolvedValue({
      resume: {
        ...baseResume,
        isPrimary: true,
        displayName: "自动化测试-V3"
      }
    });

    const onResumesChange = vi.fn();
    const onMessage = vi.fn();

    render(
      <AnalysisView
        resumes={[baseResume]}
        questions={[]}
        answers={[]}
        onBootstrapSync={vi.fn()}
        onResumesChange={onResumesChange}
        onQuestionsChange={vi.fn()}
        onAnswersChange={vi.fn()}
        onMessage={onMessage}
      />
    );

    expect(screen.getByText("简历画像与预测题")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "使用这份简历" }));

    expect(updateResume).toHaveBeenCalledWith("resume-1", { isPrimary: true });
    expect(onResumesChange).toHaveBeenCalled();
    expect(onMessage).toHaveBeenLastCalledWith("已切换为当前用于 AI 回答的简历");
  });

  it("switches to the viewed resume before generating a predicted answer", async () => {
    vi.mocked(updateResume).mockResolvedValue({
      resume: {
        ...baseResume,
        isPrimary: true
      }
    });
    vi.mocked(answerPredictedQuestion).mockResolvedValue({
      resume: {
        ...baseResume,
        isPrimary: true,
        predictedQuestions: [
          {
            ...baseResume.predictedQuestions[0],
            linkedQuestionId: "question-1"
          }
        ]
      },
      question: baseQuestion,
      answer: baseAnswer
    });

    const onResumesChange = vi.fn();
    const onQuestionsChange = vi.fn();
    const onAnswersChange = vi.fn();
    const onMessage = vi.fn();

    render(
      <AnalysisView
        resumes={[
          baseResume,
          {
            ...baseResume,
            id: "resume-2",
            displayName: "当前AI简历",
            isPrimary: true,
            predictedQuestions: []
          }
        ]}
        questions={[]}
        answers={[]}
        onBootstrapSync={vi.fn()}
        onResumesChange={onResumesChange}
        onQuestionsChange={onQuestionsChange}
        onAnswersChange={onAnswersChange}
        onMessage={onMessage}
      />
    );

    expect(screen.getByText("简历画像与预测题")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "使用这份简历后生成" }));

    expect(updateResume).toHaveBeenCalledWith("resume-1", { isPrimary: true });
    expect(answerPredictedQuestion).toHaveBeenCalledWith("resume-1", "prediction-1");
    expect(onResumesChange).toHaveBeenCalled();
    expect(onQuestionsChange).toHaveBeenCalled();
    expect(onAnswersChange).toHaveBeenCalled();
    expect(onMessage).toHaveBeenLastCalledWith("预测题回答已生成");
  });
});
