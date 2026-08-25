import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import multer from "multer";

import {
  analyzeResume as defaultAnalyzeResume,
  expandResumeInterviewQuestions as defaultExpandResumeInterviewQuestions,
  testDeepSeekConnectivity
} from "./lib/analyze-resume.js";
import {
  createAnalysisQuestionRecord,
  createAppStateStore,
  type AnalysisRecord,
  type AnswerRecord,
  type AppSettings,
  type AppStateSnapshot,
  type DeepSeekModel,
  type EntityKind,
  type QuestionCategory
} from "./lib/app-state.js";
import { extractTextFromFile } from "./lib/extractors/extract-text.js";
import { isSupportedResumeFile } from "./lib/file-types.js";
import {
  extractInterviewQuestions as defaultExtractInterviewQuestions,
  findDedupeCandidates as defaultFindDedupeCandidates,
  generatePrepInsights as defaultGeneratePrepInsights,
  generateAnswerSuggestions as defaultGenerateAnswerSuggestions
} from "./lib/interview-ai.js";
import { normalizeUploadedFileName } from "./lib/normalize-uploaded-filename.js";

const MODELS: DeepSeekModel[] = ["deepseek-v4-flash", "deepseek-v4-pro"];
const serverSrcDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverSrcDir, "..", "..");
const webDistDir = path.join(projectRoot, "web", "dist");

export async function createApp(options?: {
  dataDir?: string;
  installSignature?: string;
  testDeepSeekConnection?: typeof testDeepSeekConnectivity;
  analyzeResume?: typeof defaultAnalyzeResume;
  expandResumeInterviewQuestions?: typeof defaultExpandResumeInterviewQuestions;
  extractInterviewQuestions?: typeof defaultExtractInterviewQuestions;
  generateAnswerSuggestions?: typeof defaultGenerateAnswerSuggestions;
  findDedupeCandidates?: typeof defaultFindDedupeCandidates;
  generatePrepInsights?: typeof defaultGeneratePrepInsights;
}) {
  const app = express();
  const store = await createAppStateStore({ dataDir: options?.dataDir });

  const upload = multer({
    dest: store.uploadsDir,
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/bootstrap", (_request, response) => {
    response.json(toBootstrapPayload(store.getSnapshot(), options?.installSignature));
  });

  app.patch("/api/resumes/:id", async (request, response, next) => {
    try {
      const resume = store.getSnapshot().resumes.find((item) => item.id === request.params.id);
      if (!resume) {
        response.status(404).json({ error: "未找到该份简历" });
        return;
      }

      const body = request.body as {
        displayName?: string;
        isPrimary?: boolean;
      };

      const updatedResume = await store.replaceResume({
        ...resume,
        displayName: body.displayName?.trim() || resume.displayName,
        isPrimary: typeof body.isPrimary === "boolean" ? body.isPrimary : resume.isPrimary,
        updatedAt: new Date().toISOString()
      });

      response.json({
        resume: updatedResume
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/resumes/:id", async (request, response, next) => {
    try {
      const resume = store.getSnapshot().resumes.find((item) => item.id === request.params.id);
      if (!resume) {
        response.status(404).json({ error: "未找到该份简历" });
        return;
      }

      await store.softDeleteEntity("resume", request.params.id);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/resumes", async (_request, response, next) => {
    try {
      await store.clearResumes();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/recycle-bin/:kind/:id/restore", async (request, response, next) => {
    try {
      const kind = normalizeEntityKind(request.params.kind);
      if (!kind) {
        response.status(400).json({ error: "不支持的回收站类型" });
        return;
      }

      await store.restoreEntity(kind, request.params.id);
      const snapshot = store.getSnapshot();

      response.json({
        resume: kind === "resume" ? snapshot.resumes.find((item) => item.id === request.params.id) ?? null : null,
        interview: kind === "interview" ? snapshot.interviews.find((item) => item.id === request.params.id) ?? null : null,
        question: kind === "question" ? snapshot.questions.find((item) => item.id === request.params.id) ?? null : null,
        answer: kind === "answer" ? snapshot.answers.find((item) => item.id === request.params.id) ?? null : null
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/recycle-bin/:kind/:id", async (request, response, next) => {
    try {
      const kind = normalizeEntityKind(request.params.kind);
      if (!kind) {
        response.status(400).json({ error: "不支持的回收站类型" });
        return;
      }

      await store.permanentlyDeleteEntity(kind, request.params.id);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/settings", async (request, response, next) => {
    try {
      const body = request.body as { apiKey?: string; selectedModel?: DeepSeekModel; acceptDisclaimer?: boolean };
      const nextModel = body.selectedModel;
      if (nextModel && !MODELS.includes(nextModel)) {
        response.status(400).json({ error: "Unsupported model" });
        return;
      }

      const settings = await store.updateSettings({
        apiKey: typeof body.apiKey === "string" ? body.apiKey.trim() : undefined,
        selectedModel: nextModel,
        disclaimerAcceptedAt: body.acceptDisclaimer ? new Date().toISOString() : undefined,
        acknowledgedInstallSignature: body.acceptDisclaimer ? options?.installSignature ?? null : undefined
      });

      response.json(toSettingsPayload(settings, options?.installSignature));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/test-connectivity", async (request, response, next) => {
    try {
      const body = request.body as { apiKey?: string; selectedModel?: DeepSeekModel };
      const snapshot = store.getSnapshot();
      const resolvedApiKey = body.apiKey?.trim() || snapshot.settings.apiKey;
      if (!resolvedApiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const resolvedModel = body.selectedModel ?? snapshot.settings.selectedModel;
      if (!resolvedModel || !MODELS.includes(resolvedModel)) {
        response.status(400).json({ error: "请选择合法模型" });
        return;
      }

      const connectivityCheck = options?.testDeepSeekConnection ?? testDeepSeekConnectivity;
      await connectivityCheck({
        apiKey: resolvedApiKey,
        selectedModel: resolvedModel
      });

      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/interview-sessions/extract-questions", async (request, response, next) => {
    try {
      const body = request.body as {
        title?: string;
        sourceText?: string;
        sourceType?: "text" | "file";
      };

      if (!body.title?.trim()) {
        response.status(400).json({ error: "请先填写本场面试标题" });
        return;
      }

      if (!body.sourceText?.trim()) {
        response.status(400).json({ error: "请先输入面试文本" });
        return;
      }

      const settings = store.getSnapshot().settings;
      if (!settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const extractInterviewQuestions = options?.extractInterviewQuestions ?? defaultExtractInterviewQuestions;
      const result = await extractInterviewQuestions({
        sourceText: body.sourceText.trim(),
        selectedModel: settings.selectedModel,
        apiKey: settings.apiKey
      });

      response.json({
        title: body.title.trim(),
        sourceType: body.sourceType ?? "text",
        questions: result.questions.map((item) => ({
          id: crypto.randomUUID(),
          questionText: item.questionText,
          originalQuestion: "originalQuestion" in item ? item.originalQuestion : item.questionText,
          category: item.category,
          tags: item.tags,
          confidence: "confidence" in item ? item.confidence : "medium",
          selected: false,
          answerSuggestion: "",
          answerGeneratedAt: "",
          addedToHighFrequency: false,
          highFrequencyId: ""
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/interview-sessions", async (request, response, next) => {
    try {
      const body = request.body as {
        title?: string;
        sourceType?: "text" | "file";
        sourceText?: string;
        sourceFileName?: string;
        company?: string;
        position?: string;
        interviewDate?: string;
        round?: string;
        interviewType?: "线上" | "线下" | "电话" | "其他";
        status?: "待面试" | "已完成" | "待反馈" | "通过" | "进入下一轮" | "未通过" | "Offer" | "主动放弃";
        jobDescription?: string;
        resumeId?: string | null;
        notes?: string;
        questions?: Array<{
          id: string;
          questionText: string;
          category: "人事问题" | "项目问题" | "技术问题" | "业务问题" | "其他";
          tags: string[];
          selected?: boolean;
          answerSuggestion?: string;
          answerGeneratedAt?: string;
          addedToHighFrequency?: boolean;
          highFrequencyId?: string;
        }>;
      };

      if (!body.title?.trim()) {
        response.status(400).json({ error: "请先填写本场面试标题" });
        return;
      }

      let saved;
      if (
        body.resumeId !== undefined ||
        body.company?.trim() ||
        body.position?.trim() ||
        body.interviewDate?.trim() ||
        body.round?.trim()
      ) {
        const interview = await store.saveInterview({
          company: body.company?.trim() ?? "",
          position: body.position?.trim() ?? "",
          interviewDate: body.interviewDate?.trim() ?? "",
          round: body.round?.trim() ?? "",
          interviewType: body.interviewType ?? "其他",
          status: body.status ?? "已完成",
          jobDescription: body.jobDescription?.trim() ?? "",
          resumeId: body.resumeId ?? null,
          title: body.title.trim(),
          notes: body.notes?.trim() ?? "",
          sourceType: body.sourceType ?? "text",
          sourceText: body.sourceText?.trim() ?? "",
          sourceFileName: body.sourceFileName ?? "",
          occurrences:
            body.questions?.map((item) => ({
              id: item.id,
              originalQuestion: item.questionText,
              category: item.category,
              tags: item.tags,
              questionId: item.highFrequencyId || null,
              answerOverride: item.answerSuggestion ?? "",
              answerOverrideUpdatedAt: item.answerGeneratedAt || null,
              confidence: "high" as const
            })) ?? []
        });
        saved = store.getSnapshot().interviewSessions.find((item) => item.id === interview.id);
      } else {
        saved = await store.saveInterviewSession({
          title: body.title.trim(),
          sourceType: body.sourceType ?? "text",
          sourceText: body.sourceText?.trim() ?? "",
          sourceFileName: body.sourceFileName ?? "",
          questions:
            body.questions?.map((item) => ({
              id: item.id,
              questionText: item.questionText,
              category: item.category,
              tags: item.tags,
              selected: Boolean(item.selected),
              answerSuggestion: item.answerSuggestion ?? "",
              answerGeneratedAt: item.answerGeneratedAt ?? "",
              addedToHighFrequency: Boolean(item.addedToHighFrequency),
              highFrequencyId: item.highFrequencyId ?? ""
            })) ?? []
        });
      }

      response.status(201).json(saved);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/interview-sessions", (_request, response) => {
    response.json(store.getSnapshot().interviewSessions);
  });

  app.get("/api/interview-sessions/:id", (request, response) => {
    const session = store.getSnapshot().interviewSessions.find((item) => item.id === request.params.id);
    if (!session) {
      response.status(404).json({ error: "未找到该场面试" });
      return;
    }
    response.json(session);
  });

  app.patch("/api/interview-sessions/:id/questions", async (request, response, next) => {
    try {
      const session = store.getSnapshot().interviewSessions.find((item) => item.id === request.params.id);
      if (!session) {
        response.status(404).json({ error: "未找到该场面试" });
        return;
      }

      const body = request.body as { questions?: typeof session.questions };
      const updated = {
        ...session,
        questions: body.questions ?? session.questions,
        updatedAt: new Date().toISOString()
      };

      await store.replaceInterviewSession(updated);
      const highFrequencyQuestions = await syncHighFrequencyAnswersFromSession(updated);
      response.json({
        session: updated,
        highFrequencyQuestions
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/interview-sessions/:id/questions/answer", async (request, response, next) => {
    try {
      const session = store.getSnapshot().interviewSessions.find((item) => item.id === request.params.id);
      if (!session) {
        response.status(404).json({ error: "未找到该场面试" });
        return;
      }

      const body = request.body as { questionIds?: string[] };
      const questionIds = body.questionIds ?? [];
      const selectedQuestions = session.questions.filter((item) => questionIds.includes(item.id));

      if (selectedQuestions.length === 0) {
        response.status(400).json({ error: "请先勾选问题" });
        return;
      }

      const settings = store.getSnapshot().settings;
      if (!settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const generateAnswerSuggestions = options?.generateAnswerSuggestions ?? defaultGenerateAnswerSuggestions;
      const snapshot = store.getSnapshot();
      const result = await generateAnswerSuggestions({
        selectedModel: settings.selectedModel,
        apiKey: settings.apiKey,
        questions: selectedQuestions.map((item) => ({
          id: item.id,
          questionText: item.questionText
        })),
        resumeContext: getAiResumeContext(snapshot)
      });

      const answerMap = new Map(result.answers.map((item) => [item.questionId, item.answerSuggestion]));
      const updatedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
        questions: session.questions.map((item) =>
          answerMap.has(item.id)
            ? {
                ...item,
                answerSuggestion: answerMap.get(item.id) ?? "",
                answerGeneratedAt: new Date().toISOString()
              }
            : item
        )
      };

      await store.replaceInterviewSession(updatedSession);
      const highFrequencyQuestions = await syncHighFrequencyAnswersFromSession(updatedSession);
      response.json({
        session: updatedSession,
        highFrequencyQuestions
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/interview-sessions/:id/questions/add-to-high-frequency", async (request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      const session = snapshot.interviewSessions.find((item) => item.id === request.params.id);
      if (!session) {
        response.status(404).json({ error: "未找到该场面试" });
        return;
      }

      const body = request.body as { questionIds?: string[] };
      const questionIds = body.questionIds ?? [];
      const selectedQuestions = session.questions.filter((item) => questionIds.includes(item.id));

      if (selectedQuestions.length === 0) {
        response.status(400).json({ error: "请先勾选问题" });
        return;
      }

      const highFrequencyMap = new Map(snapshot.highFrequencyQuestions.map((item) => [item.questionText, item]));
      const questionToHighFrequency = new Map<string, string>();

      for (const question of selectedQuestions) {
        const existing = highFrequencyMap.get(question.questionText);
        if (existing) {
          const merged = await store.upsertHighFrequencyQuestion({
            ...existing,
            sourceSessionIds: Array.from(new Set([...existing.sourceSessionIds, session.id])),
            sourceSessionTitles: Array.from(new Set([...existing.sourceSessionTitles, session.title])),
            answerSuggestion: question.answerSuggestion || existing.answerSuggestion
          });
          questionToHighFrequency.set(question.id, merged.id);
        } else {
          const created = await store.upsertHighFrequencyQuestion({
            questionText: question.questionText,
            category: question.category,
            tags: question.tags,
            answerSuggestion: question.answerSuggestion,
            sourceSessionIds: [session.id],
            sourceSessionTitles: [session.title]
          });
          questionToHighFrequency.set(question.id, created.id);
          highFrequencyMap.set(created.questionText, created);
        }
      }

      const updatedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
        questions: session.questions.map((item) =>
          questionToHighFrequency.has(item.id)
            ? {
                ...item,
                addedToHighFrequency: true,
                highFrequencyId: questionToHighFrequency.get(item.id) ?? ""
              }
            : item
        )
      };

      await store.replaceInterviewSession(updatedSession);
      response.json({
        session: updatedSession,
        highFrequencyQuestions: store.getSnapshot().highFrequencyQuestions
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/high-frequency-questions", (_request, response) => {
    const snapshot = store.getSnapshot();
    response.json({
      questions: snapshot.highFrequencyQuestions,
      dedupeCandidates: snapshot.dedupeCandidates
    });
  });

  app.post("/api/high-frequency-questions", async (request, response, next) => {
    try {
      const body = request.body as {
        questionText?: string;
        category?: "人事问题" | "项目问题" | "技术问题" | "业务问题" | "其他";
        tags?: string[];
        answerSuggestion?: string;
      };

      if (!body.questionText?.trim()) {
        response.status(400).json({ error: "请先填写问题内容" });
        return;
      }

      if (!body.category) {
        response.status(400).json({ error: "请选择问题分类" });
        return;
      }

      const created = await store.upsertHighFrequencyQuestion({
        questionText: body.questionText.trim(),
        category: body.category,
        tags: body.tags ?? [],
        answerSuggestion: body.answerSuggestion?.trim() ?? "",
        sourceSessionIds: [],
        sourceSessionTitles: []
      });

      response.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/high-frequency-questions/:id", async (request, response, next) => {
    try {
      const existing = store.getSnapshot().highFrequencyQuestions.find((item) => item.id === request.params.id);
      if (!existing) {
        response.status(404).json({ error: "未找到该高频问题" });
        return;
      }

      const body = request.body as {
        questionText?: string;
        category?: "人事问题" | "项目问题" | "技术问题" | "业务问题" | "其他";
        tags?: string[];
        answerSuggestion?: string;
        pinned?: boolean;
      };

      const updatedQuestion = await store.upsertHighFrequencyQuestion({
        ...existing,
        questionText: body.questionText?.trim() || existing.questionText,
        category: body.category ?? existing.category,
        tags: body.tags ?? existing.tags,
        answerSuggestion: body.answerSuggestion?.trim() ?? existing.answerSuggestion,
        pinned: typeof body.pinned === "boolean" ? body.pinned : existing.pinned
      });

      const interviewSessions = await syncSessionAnswersFromHighFrequency(updatedQuestion);

      response.json({
        question: updatedQuestion,
        interviewSessions
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/high-frequency-questions/:id/answer", async (request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      const existing = snapshot.highFrequencyQuestions.find((item) => item.id === request.params.id);
      if (!existing) {
        response.status(404).json({ error: "未找到该高频问题" });
        return;
      }

      if (!snapshot.settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const generateAnswerSuggestions = options?.generateAnswerSuggestions ?? defaultGenerateAnswerSuggestions;
      const generated = await generateAnswerSuggestions({
        selectedModel: snapshot.settings.selectedModel,
        apiKey: snapshot.settings.apiKey,
        questions: [
          {
            id: existing.id,
            questionText: existing.questionText
          }
        ],
        resumeContext: getAiResumeContext(snapshot)
      });

      const answerText = generated.answers[0]?.answerSuggestion;
      if (!answerText) {
        response.status(500).json({ error: "AI 没有返回回答内容" });
        return;
      }

      const updatedQuestion = await store.upsertHighFrequencyQuestion({
        ...existing,
        answerSuggestion: answerText.trim()
      });
      const interviewSessions = await syncSessionAnswersFromHighFrequency(updatedQuestion);

      response.json({
        question: updatedQuestion,
        interviewSessions
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/high-frequency-questions/:id", async (request, response, next) => {
    try {
      const existing = store.getSnapshot().highFrequencyQuestions.find((item) => item.id === request.params.id);
      if (!existing) {
        response.status(404).json({ error: "未找到该高频问题" });
        return;
      }

      await store.softDeleteEntity("question", request.params.id);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/high-frequency-questions/ai-deduplicate", async (_request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      const settings = snapshot.settings;
      if (!settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const findDedupeCandidates = options?.findDedupeCandidates ?? defaultFindDedupeCandidates;
      const result = await findDedupeCandidates({
        selectedModel: settings.selectedModel,
        apiKey: settings.apiKey,
        questions: snapshot.highFrequencyQuestions.map((item) => ({
          id: item.id,
          questionText: item.questionText
        }))
      });

      await store.setDedupeCandidates(result.candidates);
      response.json({ candidates: result.candidates });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/prep-insights/generate", async (_request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      if (!snapshot.settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      if (
        snapshot.analyses.length === 0 &&
        snapshot.interviewSessions.length === 0 &&
        snapshot.highFrequencyQuestions.length === 0
      ) {
        response.status(400).json({ error: "请先积累一些简历、场次或高频问题数据" });
        return;
      }

      const generatePrepInsights = options?.generatePrepInsights ?? defaultGeneratePrepInsights;
      const insight = await generatePrepInsights({
        selectedModel: snapshot.settings.selectedModel,
        apiKey: snapshot.settings.apiKey,
        resumeContext: getAiResumeContext(snapshot),
        interviewSessions: snapshot.interviewSessions.map((session) => ({
          title: session.title,
          questions: session.questions.map((question) => ({
            questionText: question.questionText,
            category: question.category,
            answerSuggestion: question.answerSuggestion
          }))
        })),
        highFrequencyQuestions: snapshot.highFrequencyQuestions.map((question) => ({
          questionText: question.questionText,
          category: question.category,
          answerSuggestion: question.answerSuggestion
        }))
      });

      const saved = await store.savePrepInsight(insight);
      response.json(saved);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/data/export", (_request, response) => {
    const snapshot = store.getSnapshot();
      response.json({
        version: 1,
        exportedAt: new Date().toISOString(),
        snapshot: {
          ...snapshot,
          settings: {
            ...snapshot.settings,
            apiKey: "",
            disclaimerAcceptedAt: null,
            acknowledgedInstallSignature: null
          }
        }
      });
  });

  app.post("/api/data/import", async (request, response, next) => {
    try {
      const body = request.body as {
        version?: number;
        exportedAt?: string;
        snapshot?: AppStateSnapshot;
      };

      if (!body.snapshot || typeof body.snapshot !== "object") {
        response.status(400).json({ error: "导入文件格式不正确" });
        return;
      }

      const current = store.getSnapshot();
      await store.replaceSnapshot({
        ...body.snapshot,
        settings: {
          apiKey: body.snapshot.settings?.apiKey || current.settings.apiKey,
          selectedModel: body.snapshot.settings?.selectedModel ?? current.settings.selectedModel,
          disclaimerAcceptedAt: current.settings.disclaimerAcceptedAt,
          acknowledgedInstallSignature: current.settings.acknowledgedInstallSignature
        }
      });

      response.json(toBootstrapPayload(store.getSnapshot(), options?.installSignature));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/interview-sessions", async (_request, response, next) => {
    try {
      await store.clearInterviewSessions();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/interview-sessions/:id", async (request, response, next) => {
    try {
      const session = store.getSnapshot().interviewSessions.find((item) => item.id === request.params.id);
      if (!session) {
        response.status(404).json({ error: "未找到该场面试" });
        return;
      }

      await store.deleteInterviewSession(request.params.id);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/high-frequency-questions", async (_request, response, next) => {
    try {
      await store.clearHighFrequencyQuestions();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/analyze-resume", upload.single("resume"), async (request, response, next) => {
    try {
      const file = request.file;
      if (!file) {
        response.status(400).json({ error: "请先上传简历文件" });
        return;
      }

      const normalizedFileName = normalizeUploadedFileName(file.originalname);

      if (!isSupportedResumeFile(normalizedFileName)) {
        response.status(400).json({ error: "只支持 txt、docx、pdf 简历文件" });
        await fs.rm(file.path, { force: true });
        return;
      }

      const settings = store.getSnapshot().settings;
      if (!settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        await fs.rm(file.path, { force: true });
        return;
      }

      const extracted = await extractTextFromFile({
        filePath: file.path,
        mimeType: file.mimetype,
        originalName: normalizedFileName
      });

      const analyzeResume = options?.analyzeResume ?? defaultAnalyzeResume;
      const analyzed = await analyzeResume({
        extractedText: extracted.text,
        selectedModel: settings.selectedModel,
        apiKey: settings.apiKey
      });

      const saved = await store.saveAnalysis({
        fileName: normalizedFileName,
        originalText: extracted.text,
        extractedTextPreview: extracted.preview,
        persona: analyzed.persona,
        interviewQuestions: analyzed.interviewQuestions
      });

      response.json(saved);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/analyses/:id", async (request, response, next) => {
    try {
      const analysis = store.getSnapshot().analyses.find((item) => item.id === request.params.id);
      if (!analysis) {
        response.status(404).json({ error: "未找到该份简历分析" });
        return;
      }

      await store.deleteAnalysis(request.params.id);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/analyses/:id/questions/expand", async (request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      const analysis = snapshot.analyses.find((item) => item.id === request.params.id);
      if (!analysis) {
        response.status(404).json({ error: "未找到该份简历分析" });
        return;
      }

      if (!snapshot.settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const body = request.body as { focus?: QuestionCategory };
      const expandResumeInterviewQuestions =
        options?.expandResumeInterviewQuestions ?? defaultExpandResumeInterviewQuestions;
      const expandedQuestions = await expandResumeInterviewQuestions({
        extractedText: analysis.originalText,
        existingQuestions: analysis.interviewQuestions.map((item) => item.questionText),
        focus: body.focus,
        selectedModel: snapshot.settings.selectedModel,
        apiKey: snapshot.settings.apiKey
      });

      const existingQuestionSet = new Set(analysis.interviewQuestions.map((item) => normalizeQuestionText(item.questionText)));
      const nextQuestions = expandedQuestions
        .filter((item) => !existingQuestionSet.has(normalizeQuestionText(item.questionText)))
        .map((item) => createAnalysisQuestionRecord(item));
      const updatedAnalysis = {
        ...analysis,
        interviewQuestions: [...analysis.interviewQuestions, ...nextQuestions],
        updatedAt: new Date().toISOString()
      };

      await store.replaceAnalysis(updatedAnalysis);
      response.json({ analysis: updatedAnalysis });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/analyses/:id/questions/add-to-high-frequency", async (request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      const analysis = snapshot.analyses.find((item) => item.id === request.params.id);
      if (!analysis) {
        response.status(404).json({ error: "未找到该份简历分析" });
        return;
      }

      const body = request.body as { questionIds?: string[] };
      const questionIds = body.questionIds ?? [];
      const selectedQuestions = analysis.interviewQuestions.filter((item) => questionIds.includes(item.id));

      if (selectedQuestions.length === 0) {
        response.status(400).json({ error: "请先勾选问题" });
        return;
      }

      const highFrequencyMap = new Map(snapshot.highFrequencyQuestions.map((item) => [item.questionText, item]));
      const questionToHighFrequency = new Map<string, string>();

      for (const question of selectedQuestions) {
        const existing = highFrequencyMap.get(question.questionText);
        if (existing) {
          questionToHighFrequency.set(question.id, existing.id);
          continue;
        }

        const created = await store.upsertHighFrequencyQuestion({
          questionText: question.questionText,
          category: question.category,
          tags: question.tags,
          answerSuggestion: "",
          sourceSessionIds: [],
          sourceSessionTitles: []
        });
        questionToHighFrequency.set(question.id, created.id);
        highFrequencyMap.set(created.questionText, created);
      }

      const updatedAnalysis = {
        ...analysis,
        updatedAt: new Date().toISOString(),
        interviewQuestions: analysis.interviewQuestions.map((item) =>
          questionToHighFrequency.has(item.id)
            ? {
                ...item,
                addedToHighFrequency: true,
                highFrequencyId: questionToHighFrequency.get(item.id) ?? ""
              }
            : item
        )
      };

      await store.replaceAnalysis(updatedAnalysis);
      response.json({
        analysis: updatedAnalysis,
        highFrequencyQuestions: store.getSnapshot().highFrequencyQuestions
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/resumes/:resumeId/predicted-questions/:predictionId/answer", async (request, response, next) => {
    try {
      const snapshot = store.getSnapshot();
      const resume = snapshot.resumes.find((item) => item.id === request.params.resumeId && !item.deletedAt);
      if (!resume) {
        response.status(404).json({ error: "未找到该份简历" });
        return;
      }

      const prediction = resume.predictedQuestions.find((item) => item.id === request.params.predictionId);
      if (!prediction) {
        response.status(404).json({ error: "未找到该预测问题" });
        return;
      }

      if (!snapshot.settings.apiKey) {
        response.status(400).json({ error: "请先保存 DeepSeek API Key" });
        return;
      }

      const aiResume = getAiResume(snapshot);
      if (aiResume && aiResume.id !== resume.id) {
        response.status(409).json({
          error: `当前 AI 回答依据是“${aiResume.displayName}”，请先切换到这份简历再生成回答`
        });
        return;
      }

      const question = await ensureQuestionFromPrediction(resume.id, prediction.id);
      const generateAnswerSuggestions = options?.generateAnswerSuggestions ?? defaultGenerateAnswerSuggestions;
      const generated = await generateAnswerSuggestions({
        selectedModel: snapshot.settings.selectedModel,
        apiKey: snapshot.settings.apiKey,
        questions: [
          {
            id: question.id,
            questionText: question.standardQuestion
          }
        ],
        resumeContext: toResumeContextFromResume(resume)
      });
      const answerText = generated.answers[0]?.answerSuggestion;
      if (!answerText) {
        response.status(500).json({ error: "AI 没有返回回答内容" });
        return;
      }

      const answer = await store.saveAnswerVersion({
        questionId: question.id,
        content: answerText,
        type: "standard",
        source: "ai_generated",
        resumeId: resume.id
      });
      const latestSnapshot = store.getSnapshot();

      response.json({
        resume: latestSnapshot.resumes.find((item) => item.id === resume.id),
        question: latestSnapshot.questions.find((item) => item.id === question.id),
        answer
      });
    } catch (error) {
      next(error);
    }
  });

  async function syncHighFrequencyAnswersFromSession(session: AppStateSnapshot["interviewSessions"][number]) {
    const snapshot = store.getSnapshot();
    const linkedQuestions = session.questions.filter((item) => item.highFrequencyId);
    let highFrequencyQuestions = snapshot.highFrequencyQuestions;

    for (const question of linkedQuestions) {
      const existing = highFrequencyQuestions.find((item) => item.id === question.highFrequencyId);
      if (!existing || existing.answerSuggestion === question.answerSuggestion) {
        continue;
      }

      const updated = await store.upsertHighFrequencyQuestion({
        ...existing,
        answerSuggestion: question.answerSuggestion
      });
      highFrequencyQuestions = highFrequencyQuestions.map((item) => (item.id === updated.id ? updated : item));
    }

    return highFrequencyQuestions;
  }

  async function syncSessionAnswersFromHighFrequency(question: AppStateSnapshot["highFrequencyQuestions"][number]) {
    const snapshot = store.getSnapshot();
    const now = new Date().toISOString();
    const changedSessions: AppStateSnapshot["interviewSessions"] = [];

    for (const session of snapshot.interviewSessions) {
      let changed = false;
      const questions = session.questions.map((item) => {
        if (item.highFrequencyId !== question.id || item.answerSuggestion === question.answerSuggestion) {
          return item;
        }

        changed = true;
        return {
          ...item,
          answerSuggestion: question.answerSuggestion,
          answerGeneratedAt: question.answerSuggestion ? now : item.answerGeneratedAt
        };
      });

      if (!changed) {
        continue;
      }

      changedSessions.push({
        ...session,
        updatedAt: now,
        questions
      });
    }

    for (const session of changedSessions) {
      await store.replaceInterviewSession(session);
    }

    return store.getSnapshot().interviewSessions;
  }

  async function sendIndexHtml(request: express.Request, response: express.Response, next: express.NextFunction) {
    if (request.path.startsWith("/api")) {
      next();
      return;
    }

    try {
      await fs.access(path.join(webDistDir, "index.html"));
      response.sendFile(path.join(webDistDir, "index.html"));
    } catch {
      next();
    }
  }

  app.use(express.static(webDistDir));
  app.get("/", sendIndexHtml);
  app.get("/{*path}", sendIndexHtml);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown server error";
    response.status(500).json({ error: message });
  });

  async function ensureQuestionFromPrediction(resumeId: string, predictionId: string) {
    const snapshot = store.getSnapshot();
    const resume = snapshot.resumes.find((item) => item.id === resumeId && !item.deletedAt);
    if (!resume) {
      throw new Error("未找到该份简历");
    }

    const prediction = resume.predictedQuestions.find((item) => item.id === predictionId);
    if (!prediction) {
      throw new Error("未找到该预测问题");
    }

    if (prediction.linkedQuestionId) {
      const existing = snapshot.questions.find((item) => item.id === prediction.linkedQuestionId && !item.deletedAt);
      if (existing) {
        return existing;
      }
    }

    const question = await store.upsertQuestion({
      standardQuestion: prediction.questionText,
      category: prediction.category,
      tags: prediction.tags,
      sourceTypes: ["resume_prediction"],
      sourceRefs: [
        {
          type: "resume_prediction",
          resumeId: resume.id,
          label: resume.displayName
        }
      ],
      favorite: prediction.favorite,
      masteryLevel: "未准备",
      priority: "medium"
    });

    const updatedResume = await store.replaceResume({
      ...resume,
      predictedQuestions: resume.predictedQuestions.map((item) =>
        item.id === prediction.id
          ? {
              ...item,
              linkedQuestionId: question.id,
              updatedAt: new Date().toISOString()
            }
          : item
      ),
      updatedAt: new Date().toISOString()
    });

    return store.getSnapshot().questions.find((item) => item.id === question.id) ?? question;
  }

  return app;
}

function toResumeContext(analysis: AnalysisRecord) {
  return {
    fileName: analysis.fileName,
    originalText: analysis.originalText,
    candidateSummary: analysis.persona.candidateSummary,
    strongSkills: analysis.persona.strongSkills,
    personalAdvantages: analysis.persona.personalAdvantages,
    workExperience: analysis.persona.workExperience,
    projectHighlights: analysis.persona.projectHighlights,
    riskPoints: analysis.persona.riskPoints
  };
}

function toBootstrapPayload(snapshot: AppStateSnapshot, installSignature?: string) {
  return {
    settings: toSettingsPayload(snapshot.settings, installSignature),
    resumes: snapshot.resumes.filter((item) => !item.deletedAt),
    interviews: snapshot.interviews.filter((item) => !item.deletedAt),
    questions: snapshot.questions.filter((item) => !item.deletedAt),
    answers: snapshot.answers.filter((item) => !item.deletedAt),
    recycleBin: buildRecycleBin(snapshot),
    analyses: snapshot.analyses,
    interviewSessions: snapshot.interviewSessions,
    highFrequencyQuestions: snapshot.highFrequencyQuestions,
    customHighFrequencyTags: snapshot.customHighFrequencyTags,
    dedupeCandidates: snapshot.dedupeCandidates,
    prepInsight: snapshot.prepInsight
  };
}

function toSettingsPayload(settings: AppSettings, installSignature?: string) {
  return {
    hasApiKey: Boolean(settings.apiKey),
    selectedModel: settings.selectedModel,
    maskedApiKey: maskApiKey(settings.apiKey),
    disclaimerAccepted: Boolean(settings.disclaimerAcceptedAt),
    requiresSetup: requiresSetupForInstall(settings, installSignature)
  };
}

function requiresSetupForInstall(settings: AppSettings, installSignature?: string) {
  if (!settings.disclaimerAcceptedAt) {
    return true;
  }

  if (!installSignature) {
    return false;
  }

  return settings.acknowledgedInstallSignature !== installSignature;
}

function normalizeQuestionText(input: string) {
  return input.trim().replace(/\s+/g, "");
}

function toResumeContextFromResume(resume: AppStateSnapshot["resumes"][number]) {
  return {
    fileName: resume.originalFileName,
    originalText: resume.parsedText,
    candidateSummary: resume.profile.candidateSummary,
    strongSkills: resume.profile.strongSkills,
    personalAdvantages: resume.profile.personalAdvantages,
    workExperience: resume.profile.workExperience,
    projectHighlights: resume.profile.projectHighlights,
    riskPoints: resume.profile.riskPoints
  };
}

function getAiResume(snapshot: AppStateSnapshot) {
  return (
    snapshot.resumes.find((item) => item.isPrimary && !item.deletedAt) ??
    snapshot.resumes.find((item) => !item.deletedAt) ??
    null
  );
}

function getAiResumeContext(snapshot: AppStateSnapshot) {
  const aiResume = getAiResume(snapshot);
  if (aiResume) {
    return toResumeContextFromResume(aiResume);
  }

  const latestAnalysis = snapshot.analyses[0];
  return latestAnalysis ? toResumeContext(latestAnalysis) : undefined;
}

function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return "";
  }
  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}****`;
  }
  return `${apiKey.slice(0, 3)}****${apiKey.slice(-4)}`;
}

function normalizeEntityKind(input: string): EntityKind | null {
  if (input === "resume" || input === "interview" || input === "question" || input === "answer") {
    return input;
  }
  return null;
}

function buildRecycleBin(snapshot: AppStateSnapshot) {
  return {
    resumes: snapshot.resumes.filter((item) => item.deletedAt),
    interviews: snapshot.interviews.filter((item) => item.deletedAt),
    questions: snapshot.questions.filter((item) => item.deletedAt),
    answers: snapshot.answers.filter((item) => item.deletedAt)
  };
}
