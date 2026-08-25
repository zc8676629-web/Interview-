# Interview Question Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local interview question management subsystem with interview session import, confirmed session storage, selected-question answer generation, and an AI-assisted high-frequency question library.

**Architecture:** Extend the existing local JSON-backed store with dedicated interview-session and high-frequency-question collections. Add focused backend services for extracting questions, generating selected answers, and AI deduplication. Update the React app into a left-nav workspace that switches among resume analysis, interview organization, session library, and high-frequency library pages.

**Tech Stack:** Node.js, TypeScript, Express, React, Vite, Vitest, Supertest, DeepSeek API via fetch, local JSON persistence

---

### Task 1: Extend local persistence model

**Files:**
- Modify: `server/src/lib/app-state.ts`
- Create: `server/src/lib/interview-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createAppStateStore } from "./app-state";

describe("interview persistence", () => {
  it("stores interview sessions and high frequency questions", async () => {
    const store = await createAppStateStore({ dataDir: "TEMP_DIR" });

    await store.saveInterviewSession({
      title: "XXX一面",
      sourceType: "text",
      sourceText: "question source",
      sourceFileName: "",
      questions: []
    });

    expect(store.getSnapshot().interviewSessions).toHaveLength(1);
    expect(store.getSnapshot().highFrequencyQuestions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/lib/interview-state.test.ts`
Expected: FAIL because `saveInterviewSession` and the new collections do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface InterviewSessionRecord { /* session fields */ }
export interface InterviewQuestionRecord { /* question fields */ }
export interface HighFrequencyQuestionRecord { /* library fields */ }

// Extend AppStateSnapshot with:
// interviewSessions, highFrequencyQuestions, dedupeCandidates
// Add store methods for saving sessions, updating session questions,
// upserting high-frequency records, and clearing collections.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/lib/interview-state.test.ts`
Expected: PASS

### Task 2: Add AI services for interview extraction, answer generation, and dedupe

**Files:**
- Create: `server/src/lib/interview-ai.ts`
- Create: `server/src/lib/interview-ai.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { extractInterviewQuestions } from "./interview-ai";

describe("extractInterviewQuestions", () => {
  it("returns a normalized question list", async () => {
    const callModel = vi.fn().mockResolvedValue(JSON.stringify({
      questions: [
        { questionText: "请介绍一下你做过的自动化项目", category: "项目问题", tags: ["自动化"] }
      ]
    }));

    const result = await extractInterviewQuestions({
      sourceText: "mock transcript",
      selectedModel: "deepseek-v4-flash",
      apiKey: "secret",
      callModel
    });

    expect(result.questions[0]?.questionText).toContain("自动化项目");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/lib/interview-ai.test.ts`
Expected: FAIL because the AI helpers do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function extractInterviewQuestions(...) { /* JSON question extraction */ }
export async function generateAnswerSuggestions(...) { /* selected question answers */ }
export async function findDedupeCandidates(...) { /* similar high-frequency questions */ }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/lib/interview-ai.test.ts`
Expected: PASS

### Task 3: Expose interview-session and high-frequency APIs

**Files:**
- Modify: `server/src/app.ts`
- Create: `server/src/interview-api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("POST /api/interview-sessions/extract-questions", () => {
  it("rejects empty session titles", async () => {
    const app = await createApp({ dataDir: "TEMP_DIR" });
    const response = await request(app).post("/api/interview-sessions/extract-questions").send({
      title: "",
      sourceText: "mock text",
      sourceType: "text"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("标题");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/interview-api.test.ts`
Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// Add routes:
// POST /api/interview-sessions/extract-questions
// POST /api/interview-sessions
// GET /api/interview-sessions
// GET /api/interview-sessions/:id
// PATCH /api/interview-sessions/:id/questions
// POST /api/interview-sessions/:id/questions/answer
// POST /api/interview-sessions/:id/questions/add-to-high-frequency
// GET /api/high-frequency-questions
// POST /api/high-frequency-questions/ai-deduplicate
// POST /api/high-frequency-questions/merge
// DELETE /api/interview-sessions
// DELETE /api/high-frequency-questions
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/interview-api.test.ts`
Expected: PASS

### Task 4: Add workspace navigation and interview pages

**Files:**
- Modify: `web/src/App.tsx`
- Create: `web/src/components/WorkspaceNav.tsx`
- Create: `web/src/components/InterviewOrganizerPage.tsx`
- Create: `web/src/components/InterviewSessionsPage.tsx`
- Create: `web/src/components/HighFrequencyPage.tsx`
- Modify: `web/src/lib/api.ts`
- Create: `web/src/interview-ui.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("workspace navigation", () => {
  it("switches to the interview organizer page", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "面试整理" }));
    expect(await screen.findByText("本场面试标题")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- web/src/interview-ui.test.tsx`
Expected: FAIL because the workspace navigation and pages do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// Add left navigation and page-state switching.
// Interview organizer page:
// - title input
// - pasted text area
// - optional file input
// - AI extract button
// - confirmation list and save button
// Sessions page:
// - session list
// - detail view
// - selected question actions
// High-frequency page:
// - list
// - AI dedupe trigger
// - merge decision controls
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- web/src/interview-ui.test.tsx`
Expected: PASS

### Task 5: Wire selected-answer generation and local clearing actions

**Files:**
- Modify: `web/src/components/InterviewSessionsPage.tsx`
- Modify: `web/src/components/HighFrequencyPage.tsx`
- Modify: `web/src/components/SettingsPanel.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InterviewSessionsPage } from "./components/InterviewSessionsPage";

describe("selected answer generation", () => {
  it("shows the AI answer action for selected questions", async () => {
    render(<InterviewSessionsPage /* props with selected question */ />);
    expect(await screen.findByRole("button", { name: "AI回答建议" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- web/src/interview-ui.test.tsx`
Expected: FAIL until selected question actions are rendered.

- [ ] **Step 3: Write minimal implementation**

```tsx
// Add selection state, per-question answer display, add-to-high-frequency action,
// AI dedupe results panel, and clear-library buttons with confirm().
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- web/src/interview-ui.test.tsx`
Expected: PASS

### Task 6: Full verification

**Files:**
- Verify existing files only

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: backend compile and frontend build succeed.

- [ ] **Step 3: Run start script and verify runtime**

Run: `powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\Desktop\interview_start.ps1`
Expected:
- `http://localhost:3000/api/health` returns `{"ok":true}`
- `http://localhost:3000` returns `200`
- interview pages render and local persistence remains available.
