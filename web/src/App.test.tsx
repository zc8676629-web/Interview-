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

  it("blocks the homepage on first launch until the key and disclaimer are completed", async () => {
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
          hasApiKey: true,
          selectedModel: "deepseek-v4-flash",
          maskedApiKey: "sk-****7890",
          disclaimerAccepted: true
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("首次启动需要先完成本地配置")).toBeTruthy();

    const saveButton = screen.getByRole("button", { name: "保存并进入主页" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    await userEvent.type(screen.getByLabelText("DeepSeek API Key"), "sk-test");
    await userEvent.click(screen.getByRole("checkbox", { name: /我已阅读并接受开源声明与免责声明/ }));
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(saveButton);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/settings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          apiKey: "sk-test",
          selectedModel: "deepseek-v4-flash",
          acceptDisclaimer: true
        })
      })
    );
    expect(await screen.findByText("本地面试作战台")).toBeTruthy();
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
