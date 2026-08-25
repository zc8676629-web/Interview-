/* @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settings: {
            hasApiKey: true,
            selectedModel: "deepseek-v4-flash",
            disclaimerAccepted: true
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
        })
      })
    );
  });

  it("shows the model options flash and pro in system settings", async () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "跳到主内容" })).toBeTruthy();
    expect(await screen.findByText("本地面试作战台")).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: "系统设置" }));
    expect(await screen.findByLabelText("deepseek-v4-flash")).toBeTruthy();
    expect(await screen.findByLabelText("deepseek-v4-pro")).toBeTruthy();
  });

  it("shows the disclaimer after opening system settings", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "系统设置" }));
    const leftRail = await screen.findByTestId("settings-left-rail");
    const rightRail = await screen.findByTestId("settings-right-rail");

    expect(within(leftRail).getByText("开源声明与免责声明")).toBeTruthy();
    expect(within(leftRail).getByText(/仅供个人学习、研究、原型验证和技术交流使用/)).toBeTruthy();
    expect(within(rightRail).getByText("本地数据管理")).toBeTruthy();
  });

  it("shows a compact overview summary in the hero area", async () => {
    render(<App />);

    const overview = await screen.findByRole("region", { name: "首页概览" });

    expect(within(overview).getByText("当前状态")).toBeTruthy();
    expect(within(overview).getByText("本地数据已加载")).toBeTruthy();
    expect(within(overview).getByText("模型")).toBeTruthy();
    expect(within(overview).getByText("deepseek-v4-flash")).toBeTruthy();
    expect(within(overview).getByText("本地边界")).toBeTruthy();
  });

  it("uses the saved key when testing connectivity with an empty input", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            hasApiKey: true,
            selectedModel: "deepseek-v4-flash",
            maskedApiKey: "sk-****7890",
            disclaimerAccepted: true
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
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "系统设置" }));
    await userEvent.click(await screen.findByRole("button", { name: "测试连通性" }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/test-connectivity",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          selectedModel: "deepseek-v4-flash"
        })
      })
    );
  });

  it("allows entering the homepage on first launch after only accepting the disclaimer", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            hasApiKey: false,
            selectedModel: "deepseek-v4-flash",
            disclaimerAccepted: false
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
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasApiKey: false,
          selectedModel: "deepseek-v4-flash",
          disclaimerAccepted: true
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("首次启动需要先完成本地配置")).toBeTruthy();

    const saveButton = screen.getByRole("button", { name: "保存并进入主页" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(screen.getByRole("checkbox", { name: /我已阅读并接受开源声明与免责声明/ }));
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(saveButton);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/settings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          selectedModel: "deepseek-v4-flash",
          acceptDisclaimer: true
        })
      })
    );
    expect(await screen.findByText("本地面试作战台")).toBeTruthy();
  });

  it("shows the setup gate again after a new installation even if local settings were kept", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            hasApiKey: true,
            selectedModel: "deepseek-v4-flash",
            maskedApiKey: "sk-****7890",
            disclaimerAccepted: true,
            requiresSetup: true
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
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasApiKey: true,
          selectedModel: "deepseek-v4-flash",
          maskedApiKey: "sk-****7890",
          disclaimerAccepted: true,
          requiresSetup: false
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("首次启动需要先完成本地配置")).toBeTruthy();
    await userEvent.click(screen.getByRole("checkbox", { name: /我已阅读并接受开源声明与免责声明/ }));
    await userEvent.click(screen.getByRole("button", { name: "保存并进入主页" }));

    expect(await screen.findByText("本地面试作战台")).toBeTruthy();
  });

  it("guides users to system settings when an AI feature is used without a saved key", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            hasApiKey: false,
            selectedModel: "deepseek-v4-flash",
            disclaimerAccepted: true
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
          highFrequencyQuestions: [
            {
              id: "hf-1",
              questionText: "你们项目最大的亮点是什么？",
              category: "项目问题",
              tags: ["项目亮点"],
              answerSuggestion: "",
              sourceSessionIds: [],
              sourceSessionTitles: [],
              createdAt: "2026-08-25T00:00:00.000Z",
              updatedAt: "2026-08-25T00:00:00.000Z"
            }
          ],
          customHighFrequencyTags: [],
          dedupeCandidates: [],
          prepInsight: null
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "请先保存 DeepSeek API Key"
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("本地面试作战台")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "作战总览" }));
    await userEvent.click(await screen.findByRole("button", { name: "生成 AI 备战建议" }));

    expect(await screen.findByText("本地设置")).toBeTruthy();
    expect((await screen.findByRole("status")).textContent).toContain(
      "当前 AI 功能依赖大模型 API，请先到系统设置配置 DeepSeek API Key，再继续使用。"
    );
  });

  it("dismisses the toast after a short delay", async () => {
    render(<App />);

    expect(screen.getByRole("status").className).toContain("status-toast-enter");
    await new Promise((resolve) => window.setTimeout(resolve, 2900));
    expect(screen.getByRole("status").className).toContain("status-toast-leave");

    await new Promise((resolve) => window.setTimeout(resolve, 320));
    expect(screen.queryByRole("status")).toBeNull();
  }, 6000);
});
