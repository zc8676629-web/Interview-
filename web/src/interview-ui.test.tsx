/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("workspace navigation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            settings: {
              hasApiKey: true,
              selectedModel: "deepseek-v4-flash",
              disclaimerAccepted: true
            },
            analyses: [],
            interviewSessions: [],
            highFrequencyQuestions: [],
            dedupeCandidates: []
          })
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({})
        })
    );
  });

  it("opens the embedded interview organizer inside interview sessions page", async () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "面试整理" })).toBeNull();
    expect(await screen.findByRole("button", { name: "作战总览" })).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: "面试场次库" }));
    await userEvent.click(await screen.findByRole("button", { name: "新建面试场次" }));
    expect(await screen.findByText("本场面试标题")).toBeTruthy();
  });

  it("shows manual add entry in high-frequency page", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "高频问题库" }));
    expect(await screen.findByRole("button", { name: "手动添加问题" })).toBeTruthy();
  });
});
