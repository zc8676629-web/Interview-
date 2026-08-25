/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BootstrapPayload } from "./lib/api";
import { HighFrequencyPage } from "./components/HighFrequencyPage";
import * as api from "./lib/api";

vi.mock("./lib/api", () => ({
  fetchBootstrap: vi.fn(),
  createHighFrequencyQuestion: vi.fn(),
  deleteHighFrequencyQuestion: vi.fn(),
  runHighFrequencyDedupe: vi.fn(),
  updateHighFrequencyQuestion: vi.fn(async (questionId: string, input: Record<string, unknown>) => ({
    question: {
      id: questionId,
      questionText: String(input.questionText ?? "你们项目最大的亮点是什么"),
      category: String(input.category ?? "项目问题"),
      tags: Array.isArray(input.tags) ? input.tags : ["项目亮点"],
      answerSuggestion: String(input.answerSuggestion ?? "我会先说业务场景，再说我负责的部分。"),
      pinned: Boolean(input.pinned),
      sourceSessionIds: ["session-1"],
      sourceSessionTitles: ["某公司一面"],
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z"
    },
    interviewSessions: [
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
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            selected: false,
            answerSuggestion: String(input.answerSuggestion ?? "我会先说业务场景，再说我负责的部分。"),
            answerGeneratedAt: "",
            addedToHighFrequency: true,
            highFrequencyId: questionId
          }
        ]
      }
    ]
  }))
}));

function createBootstrapPayload(
  overrides?: Partial<BootstrapPayload> & {
    highFrequencyQuestions?: BootstrapPayload["highFrequencyQuestions"];
    recycleBin?: Partial<BootstrapPayload["recycleBin"]>;
  }
): BootstrapPayload {
  return {
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
      answers: [],
      ...overrides?.recycleBin
    },
    analyses: [],
    interviewSessions: [],
    highFrequencyQuestions: overrides?.highFrequencyQuestions ?? [],
    customHighFrequencyTags: [],
    dedupeCandidates: [],
    prepInsight: null,
    ...overrides
  };
}

describe("HighFrequencyPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows synced answers and supports editing them", async () => {
    const onQuestionsChange = vi.fn();
    const onSessionsChange = vi.fn();

    render(
      <HighFrequencyPage
        questions={[
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "我会先说业务场景，再说我负责的部分。",
            sourceSessionIds: ["session-1"],
            sourceSessionTitles: ["某公司一面"],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          }
        ]}
        dedupeCandidates={[]}
        onDedupeCandidatesChange={vi.fn()}
        onQuestionsChange={onQuestionsChange}
        onSessionsChange={onSessionsChange}
        onBootstrapSync={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    expect(screen.getByText("高频题管理台")).toBeTruthy();
    expect(screen.getByText("我会先说业务场景，再说我负责的部分。")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "编辑问题" }));
    const answerField = screen.getByDisplayValue("我会先说业务场景，再说我负责的部分。");
    await userEvent.clear(answerField);
    await userEvent.type(answerField, "我会先交代业务目标，再说我是怎么推进落地的。");
    await userEvent.click(screen.getByRole("button", { name: "保存修改" }));

    expect(onQuestionsChange).toHaveBeenCalled();
    expect(onSessionsChange).toHaveBeenCalled();
  });

  it("renders the question list inside its own scroll region", () => {
    render(
      <HighFrequencyPage
        questions={[
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "我会先说业务场景，再说我负责的部分。",
            sourceSessionIds: ["session-1"],
            sourceSessionTitles: ["某公司一面"],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          }
        ]}
        dedupeCandidates={[]}
        onDedupeCandidatesChange={vi.fn()}
        onQuestionsChange={vi.fn()}
        onSessionsChange={vi.fn()}
        onBootstrapSync={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    const region = screen.getByRole("region", { name: "高频问题列表" });
    expect(region.getAttribute("class")).toContain("question-list-scroll-region");
    expect(region.querySelector(".question-list")).toBeTruthy();
  });

  it("sorts pinned questions first and supports pinning them", async () => {
    const onBootstrapSync = vi.fn();
    vi.mocked(api.fetchBootstrap).mockResolvedValue(
      createBootstrapPayload({
        highFrequencyQuestions: [
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "我会先说业务场景，再说我负责的部分。",
            pinned: true,
            sourceSessionIds: ["session-1"],
            sourceSessionTitles: ["某公司一面"],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          },
          {
            id: "hf-2",
            questionText: "你们接口自动化里的登录态怎么管理？",
            category: "技术问题",
            tags: ["接口自动化"],
            answerSuggestion: "",
            pinned: true,
            sourceSessionIds: [],
            sourceSessionTitles: [],
            createdAt: "2026-08-22T09:00:00.000Z",
            updatedAt: "2026-08-22T09:00:00.000Z"
          }
        ]
      })
    );

    const { container } = render(
      <HighFrequencyPage
        questions={[
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "我会先说业务场景，再说我负责的部分。",
            pinned: true,
            sourceSessionIds: ["session-1"],
            sourceSessionTitles: ["某公司一面"],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          },
          {
            id: "hf-2",
            questionText: "你们接口自动化里的登录态怎么管理？",
            category: "技术问题",
            tags: ["接口自动化"],
            answerSuggestion: "",
            pinned: false,
            sourceSessionIds: [],
            sourceSessionTitles: [],
            createdAt: "2026-08-22T09:00:00.000Z",
            updatedAt: "2026-08-22T09:00:00.000Z"
          }
        ]}
        dedupeCandidates={[]}
        onDedupeCandidatesChange={vi.fn()}
        onQuestionsChange={vi.fn()}
        onSessionsChange={vi.fn()}
        onBootstrapSync={onBootstrapSync}
        onMessage={vi.fn()}
      />
    );

    const titles = Array.from(container.querySelectorAll(".question-card strong")).map((item) => item.textContent?.trim());
    expect(titles[0]).toBe("你们项目最大的亮点是什么");

    await userEvent.click(screen.getByRole("button", { name: "置顶" }));

    expect(api.updateHighFrequencyQuestion).toHaveBeenCalledWith(
      "hf-2",
      expect.objectContaining({
        pinned: true
      })
    );
    expect(onBootstrapSync).toHaveBeenCalled();
  });

  it("deletes a high-frequency question into recycle bin", async () => {
    const onBootstrapSync = vi.fn();
    vi.mocked(api.fetchBootstrap).mockResolvedValue(
      createBootstrapPayload({
        highFrequencyQuestions: [],
        recycleBin: {
          questions: [
            {
              id: "hf-1",
              standardQuestion: "你们项目最大的亮点是什么",
              category: "项目问题",
              tags: ["项目亮点"],
              sourceTypes: ["manual"],
              sourceRefs: [{ type: "manual", label: "手动添加" }],
              favorite: false,
              masteryLevel: "未准备",
              priority: "medium",
              frequency: 0,
              firstAskedAt: null,
              lastAskedAt: null,
              relatedQuestionIds: [],
              currentAnswerId: null,
              createdAt: "2026-08-21T09:00:00.000Z",
              updatedAt: "2026-08-21T09:00:00.000Z",
              deletedAt: "2026-08-25T09:00:00.000Z"
            }
          ]
        }
      })
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <HighFrequencyPage
        questions={[
          {
            id: "hf-1",
            questionText: "你们项目最大的亮点是什么",
            category: "项目问题",
            tags: ["项目亮点"],
            answerSuggestion: "我会先说业务场景，再说我负责的部分。",
            pinned: false,
            sourceSessionIds: ["session-1"],
            sourceSessionTitles: ["某公司一面"],
            createdAt: "2026-08-21T09:00:00.000Z",
            updatedAt: "2026-08-21T09:00:00.000Z"
          }
        ]}
        dedupeCandidates={[]}
        onDedupeCandidatesChange={vi.fn()}
        onQuestionsChange={vi.fn()}
        onSessionsChange={vi.fn()}
        onBootstrapSync={onBootstrapSync}
        onMessage={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "删除问题" }));

    expect(api.deleteHighFrequencyQuestion).toHaveBeenCalledWith("hf-1");
    expect(onBootstrapSync).toHaveBeenCalled();
  });
});
