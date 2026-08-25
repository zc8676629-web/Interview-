# Resume Web Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real local web demo that uploads a resume, extracts text, stores user data locally, calls DeepSeek, and shows persisted persona and interview questions.

**Architecture:** Use a single Node.js repository with an Express backend and a Vite React frontend. The backend owns all sensitive local persistence, including the DeepSeek API key, selected model, uploaded resume records, and generated analysis results. The frontend is a thin local UI that reads and updates server-managed state.

**Tech Stack:** Node.js, TypeScript, Express, React, Vite, Vitest, Supertest, Mammoth, pdf-parse, OpenAI SDK, Multer

---

### Task 1: Initialize workspace and local-safety boundaries

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Write the failing test**

```text
This task is configuration-only. No production behavior exists yet, so no executable test applies.
```

- [ ] **Step 2: Create repository-level ignore and config files**

```gitignore
node_modules/
dist/
coverage/
uploads/
.env
.env.local
.local/
temp/
*.log
desktop.ini
Thumbs.db
```

```dotenv
PORT=3000
DATA_DIR=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEFAULT_MODEL=deepseek-v4-flash
```

- [ ] **Step 3: Add workspace package manifest**

```json
{
  "name": "interview-plus-plus",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm:dev:server\" \"npm:dev:web\"",
    "dev:server": "tsx watch server/src/index.ts",
    "dev:web": "vite --config web/vite.config.ts",
    "build": "npm run build:server && npm run build:web",
    "build:server": "tsc -p server/tsconfig.json",
    "build:web": "vite build --config web/vite.config.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node server/dist/index.js"
  }
}
```

- [ ] **Step 4: Verify files exist and are tracked**

Run: `git status --short`
Expected: shows the new config files as untracked or added.

### Task 2: Build backend state store with local persistence

**Files:**
- Create: `server/tsconfig.json`
- Create: `server/src/lib/app-paths.ts`
- Create: `server/src/lib/json-store.ts`
- Create: `server/src/lib/app-state.ts`
- Test: `server/src/lib/app-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createAppStateStore } from './app-state';

describe('app state store', () => {
  it('persists settings and analysis history to disk', async () => {
    const store = await createAppStateStore({ dataDir: 'TEMP_DIR' });

    await store.updateSettings({
      apiKey: 'secret',
      selectedModel: 'deepseek-v4-pro',
    });
    await store.saveAnalysis({
      fileName: 'resume.txt',
      originalText: 'resume body',
      extractedTextPreview: 'resume body',
      persona: 'persona output',
      interviewQuestions: ['q1'],
    });

    const reloaded = await createAppStateStore({ dataDir: 'TEMP_DIR' });

    expect(reloaded.getSnapshot().settings.apiKey).toBe('secret');
    expect(reloaded.getSnapshot().settings.selectedModel).toBe('deepseek-v4-pro');
    expect(reloaded.getSnapshot().analyses).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/lib/app-state.test.ts`
Expected: FAIL because `createAppStateStore` is undefined or missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function createAppStateStore({ dataDir }: { dataDir?: string }) {
  // Resolve %APPDATA% or env override, create data dir, load app-state.json,
  // expose getSnapshot(), updateSettings(), saveAnalysis(), and clearApiKey().
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/lib/app-state.test.ts`
Expected: PASS

### Task 3: Add file extraction pipeline

**Files:**
- Create: `server/src/lib/file-types.ts`
- Create: `server/src/lib/extractors/extract-text.ts`
- Create: `server/src/lib/extractors/extract-text.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { extractTextFromFile } from './extract-text';

describe('extractTextFromFile', () => {
  it('returns plain text for txt files', async () => {
    const result = await extractTextFromFile({
      filePath: 'TEMP_FILE',
      mimeType: 'text/plain',
      originalName: 'resume.txt',
    });

    expect(result.text).toContain('hello resume');
    expect(result.preview).toContain('hello resume');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/lib/extractors/extract-text.test.ts`
Expected: FAIL because the extractor does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function extractTextFromFile(input: UploadedResumeFile) {
  // Route .txt to fs.readFile, .docx to mammoth.extractRawText,
  // and .pdf to pdf-parse; then normalize whitespace and create preview.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/lib/extractors/extract-text.test.ts`
Expected: PASS

### Task 4: Add DeepSeek client and analysis orchestration

**Files:**
- Create: `server/src/lib/deepseek-client.ts`
- Create: `server/src/lib/analyze-resume.ts`
- Create: `server/src/lib/analyze-resume.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { analyzeResume } from './analyze-resume';

describe('analyzeResume', () => {
  it('returns parsed persona and questions from a DeepSeek response', async () => {
    const callModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        persona: 'Candidate persona',
        interviewQuestions: ['Question 1', 'Question 2']
      })
    );

    const result = await analyzeResume({
      extractedText: 'resume body',
      selectedModel: 'deepseek-v4-flash',
      callModel,
    });

    expect(result.persona).toBe('Candidate persona');
    expect(result.interviewQuestions).toEqual(['Question 1', 'Question 2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/lib/analyze-resume.test.ts`
Expected: FAIL because the analysis module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function analyzeResume(input: AnalyzeResumeInput) {
  // Build a strict JSON prompt, call DeepSeek, parse JSON,
  // validate persona and interviewQuestions, and return normalized output.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/lib/analyze-resume.test.ts`
Expected: PASS

### Task 5: Expose backend API endpoints

**Files:**
- Create: `server/src/routes/health.ts`
- Create: `server/src/routes/settings.ts`
- Create: `server/src/routes/analyze.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Test: `server/src/app.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('POST /api/analyze-resume', () => {
  it('rejects requests when the API key is missing', async () => {
    const app = await createApp({ dataDir: 'TEMP_DIR' });
    const response = await request(app)
      .post('/api/analyze-resume')
      .attach('resume', Buffer.from('resume body'), 'resume.txt');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('API Key');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/src/app.test.ts`
Expected: FAIL because the app factory does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function createApp(options?: { dataDir?: string }) {
  // Register JSON middleware, settings endpoints, upload endpoint,
  // health endpoint, and central error handling.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/src/app.test.ts`
Expected: PASS

### Task 6: Build frontend demo with persisted state UX

**Files:**
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/styles.css`
- Create: `web/src/lib/api.ts`
- Create: `web/src/components/SettingsPanel.tsx`
- Create: `web/src/components/UploadPanel.tsx`
- Create: `web/src/components/AnalysisView.tsx`
- Test: `web/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('shows the model options flash and pro', async () => {
    render(<App />);
    expect(await screen.findByLabelText('deepseek-v4-flash')).toBeInTheDocument();
    expect(await screen.findByLabelText('deepseek-v4-pro')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- web/src/App.test.tsx`
Expected: FAIL because the React app does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
export default function App() {
  // Load settings and last analysis from the backend on mount,
  // render API key form, model selector, upload form, and analysis panels.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- web/src/App.test.tsx`
Expected: PASS

### Task 7: Add desktop start script

**Files:**
- Create: `scripts/start-interview-demo.ps1`
- Create: `$env:USERPROFILE\Desktop\interview_start.ps1`

- [ ] **Step 1: Write the failing test**

```text
This task is operational packaging. Verification is done by executing the script.
```

- [ ] **Step 2: Write start script**

```powershell
Set-Location <repo>
npm install
Start-Process "http://localhost:3000"
npm run dev
```

- [ ] **Step 3: Run script to verify it starts the demo**

Run: `powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\Desktop\interview_start.ps1`
Expected: server starts, frontend opens locally, and the health endpoint responds.

### Task 8: Final verification

**Files:**
- Verify existing project files only

- [ ] **Step 1: Run backend and frontend tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: backend compiles and frontend build succeeds.

- [ ] **Step 3: Run local demo manually**

Run:
- `npm run dev`
- Open `http://localhost:3000` or the Vite port shown in the console.

Expected:
- API key can be saved locally.
- Model selector only shows `deepseek-v4-flash` and `deepseek-v4-pro`.
- Uploaded resume is analyzed.
- Results survive page refresh and app restart.
