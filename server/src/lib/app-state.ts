import fs from "node:fs/promises";

import { resolveDataDir, resolveStateFile, resolveUploadsDir } from "./app-paths.js";
import { readJsonFile, writeJsonFile } from "./json-store.js";

export type DeepSeekModel = "deepseek-v4-flash" | "deepseek-v4-pro";
export type QuestionCategory = "人事问题" | "项目问题" | "技术问题" | "业务问题" | "其他";
export type QuestionSourceType = "resume_prediction" | "interview" | "manual";
export type MasteryLevel = "未准备" | "已整理" | "基本掌握" | "熟练" | "需要加强";
export type PriorityLevel = "low" | "medium" | "high";
export type AnswerSource = "ai_generated" | "user_edited" | "ai_polished" | "ai_shortened" | "ai_expanded";
export type AnswerType = "standard";
export type InterviewQuestionConfidence = "high" | "medium" | "low";
export type InterviewType = "线上" | "线下" | "电话" | "其他";
export type InterviewStatus =
  | "待面试"
  | "已完成"
  | "待反馈"
  | "通过"
  | "进入下一轮"
  | "未通过"
  | "Offer"
  | "主动放弃";
export type EntityKind = "resume" | "interview" | "question" | "answer";

export interface PersonaProfile {
  candidateSummary: string;
  strongSkills: string[];
  personalAdvantages: string[];
  workExperience: string[];
  projectHighlights: string[];
  riskPoints: string[];
}

export interface AnalysisQuestionRecord {
  id: string;
  questionText: string;
  category: QuestionCategory;
  tags: string[];
  selected: boolean;
  addedToHighFrequency: boolean;
  highFrequencyId: string;
}

export interface AnalysisQuestionDraft {
  questionText: string;
  category: QuestionCategory;
  tags: string[];
}

export interface AnalysisRecord {
  id: string;
  fileName: string;
  originalText: string;
  extractedTextPreview: string;
  persona: PersonaProfile;
  interviewQuestions: AnalysisQuestionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewQuestionRecord {
  id: string;
  questionText: string;
  category: QuestionCategory;
  tags: string[];
  selected: boolean;
  answerSuggestion: string;
  answerGeneratedAt: string;
  addedToHighFrequency: boolean;
  highFrequencyId: string;
}

export interface InterviewSessionRecord {
  id: string;
  title: string;
  sourceType: "text" | "file";
  sourceText: string;
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
  questions: InterviewQuestionRecord[];
}

export interface HighFrequencyQuestionRecord {
  id: string;
  questionText: string;
  category: QuestionCategory;
  tags: string[];
  answerSuggestion: string;
  pinned?: boolean;
  sourceSessionIds: string[];
  sourceSessionTitles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DedupeCandidateRecord {
  questionAId: string;
  questionBId: string;
  reason: string;
  confidence: string;
  recommendedAction: string;
}

export interface PrepInsightRecord {
  generatedAt: string;
  summary: string;
  priorities: string[];
  coverageGaps: string[];
  nextActions: string[];
}

export interface AppSettings {
  apiKey: string;
  selectedModel: DeepSeekModel;
  disclaimerAcceptedAt: string | null;
}

export interface PredictedQuestionRecord {
  id: string;
  questionText: string;
  category: QuestionCategory;
  tags: string[];
  linkedQuestionId: string;
  favorite: boolean;
  ignoredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeRecord {
  id: string;
  displayName: string;
  originalFileName: string;
  version: number;
  uploadedAt: string;
  isPrimary: boolean;
  parsedText: string;
  profile: PersonaProfile;
  predictedQuestions: PredictedQuestionRecord[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface QuestionSourceRef {
  type: QuestionSourceType;
  resumeId?: string;
  label: string;
}

export interface QuestionOccurrenceRecord {
  id: string;
  questionId: string | null;
  interviewId: string;
  originalQuestion: string;
  category: QuestionCategory;
  tags: string[];
  askedAt: string;
  notes: string;
  confidence: InterviewQuestionConfidence;
  answerOverride: string;
  answerOverrideUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface InterviewRecord {
  id: string;
  company: string;
  position: string;
  interviewDate: string;
  round: string;
  interviewType: InterviewType;
  status: InterviewStatus;
  jobDescription: string;
  resumeId: string | null;
  title: string;
  notes: string;
  sourceType: "text" | "file";
  sourceText: string;
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  occurrences: QuestionOccurrenceRecord[];
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  content: string;
  version: number;
  type: AnswerType;
  source: AnswerSource;
  resumeId: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface QuestionRecord {
  id: string;
  standardQuestion: string;
  category: QuestionCategory;
  tags: string[];
  sourceTypes: QuestionSourceType[];
  sourceRefs: QuestionSourceRef[];
  favorite: boolean;
  masteryLevel: MasteryLevel;
  priority: PriorityLevel;
  frequency: number;
  firstAskedAt: string | null;
  lastAskedAt: string | null;
  relatedQuestionIds: string[];
  currentAnswerId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PersistedAppStateSnapshot {
  backupVersion: 2;
  settings: AppSettings;
  resumes: ResumeRecord[];
  interviews: InterviewRecord[];
  questions: QuestionRecord[];
  answers: AnswerRecord[];
  customHighFrequencyTags: string[];
  dedupeCandidates: DedupeCandidateRecord[];
  prepInsight: PrepInsightRecord | null;
}

export interface LegacyAppStateSnapshot {
  settings: AppSettings;
  analyses: AnalysisRecord[];
  interviewSessions: InterviewSessionRecord[];
  highFrequencyQuestions: HighFrequencyQuestionRecord[];
  customHighFrequencyTags?: string[];
  dedupeCandidates: DedupeCandidateRecord[];
  prepInsight: PrepInsightRecord | null;
}

export interface AppStateSnapshot extends PersistedAppStateSnapshot {
  analyses: AnalysisRecord[];
  interviewSessions: InterviewSessionRecord[];
  highFrequencyQuestions: HighFrequencyQuestionRecord[];
}

export interface NewAnalysisRecord {
  fileName: string;
  originalText: string;
  extractedTextPreview: string;
  persona: PersonaProfile;
  interviewQuestions: Array<string | AnalysisQuestionDraft>;
}

export interface NewInterviewSessionRecord {
  title: string;
  sourceType: "text" | "file";
  sourceText: string;
  sourceFileName: string;
  questions: InterviewQuestionRecord[];
}

export interface NewResumeRecord {
  displayName: string;
  originalFileName: string;
  parsedText: string;
  profile: PersonaProfile;
  predictedQuestions: Array<AnalysisQuestionDraft | PredictedQuestionRecord>;
  isPrimary?: boolean;
  version?: number;
  uploadedAt?: string;
}

export interface NewQuestionRecord {
  id?: string;
  standardQuestion: string;
  category: QuestionCategory;
  tags: string[];
  sourceTypes: QuestionSourceType[];
  sourceRefs: QuestionSourceRef[];
  favorite: boolean;
  masteryLevel: MasteryLevel;
  priority: PriorityLevel;
  relatedQuestionIds?: string[];
}

export interface NewAnswerVersionInput {
  questionId: string;
  content: string;
  type: AnswerType;
  source: AnswerSource;
  resumeId: string | null;
}

export interface NewInterviewOccurrenceInput {
  id?: string;
  questionId: string | null;
  originalQuestion: string;
  category: QuestionCategory;
  tags: string[];
  confidence?: InterviewQuestionConfidence;
  notes?: string;
  answerOverride?: string;
  answerOverrideUpdatedAt?: string | null;
  askedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewInterviewRecord {
  company: string;
  position: string;
  interviewDate: string;
  round: string;
  interviewType: InterviewType;
  status: InterviewStatus;
  jobDescription: string;
  resumeId: string | null;
  title: string;
  notes: string;
  sourceType: "text" | "file";
  sourceText: string;
  sourceFileName: string;
  occurrences: NewInterviewOccurrenceInput[];
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  selectedModel: "deepseek-v4-flash",
  disclaimerAcceptedAt: null
};

const DEFAULT_CORE_STATE: PersistedAppStateSnapshot = {
  backupVersion: 2,
  settings: DEFAULT_SETTINGS,
  resumes: [],
  interviews: [],
  questions: [],
  answers: [],
  customHighFrequencyTags: [],
  dedupeCandidates: [],
  prepInsight: null
};

export interface AppStateStore {
  dataDir: string;
  uploadsDir: string;
  getSnapshot(): AppStateSnapshot;
  updateSettings(input: Partial<AppSettings>): Promise<AppSettings>;
  saveResume(input: NewResumeRecord): Promise<ResumeRecord>;
  replaceResume(resume: ResumeRecord): Promise<ResumeRecord>;
  setPrimaryResume(id: string): Promise<ResumeRecord | null>;
  clearResumes(): Promise<void>;
  saveInterview(input: NewInterviewRecord): Promise<InterviewRecord>;
  replaceInterview(interview: InterviewRecord): Promise<InterviewRecord>;
  clearInterviews(): Promise<void>;
  upsertQuestion(input: NewQuestionRecord): Promise<QuestionRecord>;
  replaceQuestion(question: QuestionRecord): Promise<QuestionRecord>;
  clearQuestions(): Promise<void>;
  saveAnswerVersion(input: NewAnswerVersionInput): Promise<AnswerRecord>;
  setDedupeCandidates(input: DedupeCandidateRecord[]): Promise<DedupeCandidateRecord[]>;
  savePrepInsight(input: Omit<PrepInsightRecord, "generatedAt"> & { generatedAt?: string }): Promise<PrepInsightRecord>;
  softDeleteEntity(kind: EntityKind, id: string): Promise<void>;
  restoreEntity(kind: EntityKind, id: string): Promise<void>;
  permanentlyDeleteEntity(kind: EntityKind, id: string): Promise<void>;
  replaceSnapshot(input: Partial<AppStateSnapshot> | Partial<LegacyAppStateSnapshot>): Promise<AppStateSnapshot>;
  saveAnalysis(input: NewAnalysisRecord): Promise<AnalysisRecord>;
  replaceAnalysis(analysis: AnalysisRecord): Promise<AnalysisRecord>;
  deleteAnalysis(id: string): Promise<void>;
  saveInterviewSession(input: NewInterviewSessionRecord): Promise<InterviewSessionRecord>;
  replaceInterviewSession(session: InterviewSessionRecord): Promise<InterviewSessionRecord>;
  deleteInterviewSession(id: string): Promise<void>;
  upsertHighFrequencyQuestion(
    input: Omit<HighFrequencyQuestionRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<HighFrequencyQuestionRecord>;
  clearInterviewSessions(): Promise<void>;
  clearHighFrequencyQuestions(): Promise<void>;
}

export async function createAppStateStore(options?: { dataDir?: string }): Promise<AppStateStore> {
  const dataDir = resolveDataDir(options?.dataDir);
  const uploadsDir = resolveUploadsDir(dataDir);
  const stateFile = resolveStateFile(dataDir);

  await fs.mkdir(uploadsDir, { recursive: true });

  let state = normalizePersistedState(
    await readJsonFile<Record<string, unknown>>(stateFile, DEFAULT_CORE_STATE as unknown as Record<string, unknown>)
  );

  async function persist(): Promise<void> {
    state = normalizePersistedState(state, state.settings.apiKey);
    await writeJsonFile(stateFile, state);
  }

  const storeApi: AppStateStore = {
    dataDir,
    uploadsDir,
    getSnapshot() {
      return decorateSnapshot(state);
    },
    async updateSettings(input) {
      state.settings = {
        apiKey: input.apiKey ?? state.settings.apiKey,
        selectedModel: input.selectedModel ?? state.settings.selectedModel,
        disclaimerAcceptedAt: input.disclaimerAcceptedAt ?? state.settings.disclaimerAcceptedAt
      };
      await persist();
      return state.settings;
    },
    async saveResume(input) {
      const now = input.uploadedAt ?? new Date().toISOString();
      const record: ResumeRecord = normalizeResumeRecord({
        id: crypto.randomUUID(),
        displayName: input.displayName.trim(),
        originalFileName: input.originalFileName.trim(),
        version: input.version ?? nextResumeVersion(state.resumes),
        uploadedAt: now,
        isPrimary: input.isPrimary ?? state.resumes.filter((item) => !item.deletedAt).length === 0,
        parsedText: input.parsedText,
        profile: input.profile,
        predictedQuestions: input.predictedQuestions.map((item) => normalizePredictedQuestion(item, now)),
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });

      if (record.isPrimary) {
        state.resumes = state.resumes.map((item) => ({ ...item, isPrimary: false }));
      }

      state.resumes = [record, ...state.resumes];
      ensurePrimaryResume(state);
      await persist();
      return record;
    },
    async replaceResume(resume) {
      const normalized = normalizeResumeRecord(resume);
      state.resumes = state.resumes.map((item) => (item.id === normalized.id ? normalized : item));
      if (normalized.isPrimary) {
        state.resumes = state.resumes.map((item) => ({ ...item, isPrimary: item.id === normalized.id }));
      }
      ensurePrimaryResume(state);
      await persist();
      return normalized;
    },
    async setPrimaryResume(id) {
      let target: ResumeRecord | null = null;
      state.resumes = state.resumes.map((item) => {
        const next = { ...item, isPrimary: item.id === id && !item.deletedAt };
        if (next.isPrimary) {
          target = next;
        }
        return next;
      });
      ensurePrimaryResume(state);
      await persist();
      return target;
    },
    async clearResumes() {
      const now = new Date().toISOString();
      state.resumes = state.resumes.map((item) => ({ ...item, deletedAt: now, isPrimary: false }));
      ensurePrimaryResume(state);
      await persist();
    },
    async saveInterview(input) {
      const now = new Date().toISOString();
      const record: InterviewRecord = normalizeInterviewRecord({
        id: crypto.randomUUID(),
        company: input.company,
        position: input.position,
        interviewDate: input.interviewDate,
        round: input.round,
        interviewType: input.interviewType,
        status: input.status,
        jobDescription: input.jobDescription,
        resumeId: input.resumeId,
        title: input.title,
        notes: input.notes,
        sourceType: input.sourceType,
        sourceText: input.sourceText,
        sourceFileName: input.sourceFileName,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        occurrences: input.occurrences.map((item) => normalizeOccurrenceRecord(item, crypto.randomUUID(), now, "")) as QuestionOccurrenceRecord[]
      });

      record.occurrences = record.occurrences.map((occurrence) => ({
        ...occurrence,
        interviewId: record.id
      }));

      state.interviews = [record, ...state.interviews];
      syncQuestionSourcesFromInterview(state, record);
      recalculateQuestionStats(state);
      await persist();
      return record;
    },
    async replaceInterview(interview) {
      const normalized = normalizeInterviewRecord(interview);
      state.interviews = state.interviews.map((item) => (item.id === normalized.id ? normalized : item));
      syncQuestionSourcesFromInterview(state, normalized);
      recalculateQuestionStats(state);
      await persist();
      return normalized;
    },
    async clearInterviews() {
      const now = new Date().toISOString();
      state.interviews = state.interviews.map((item) => ({ ...item, deletedAt: now }));
      recalculateQuestionStats(state);
      await persist();
    },
    async upsertQuestion(input) {
      const now = new Date().toISOString();
      const existing = input.id ? state.questions.find((item) => item.id === input.id) : undefined;
      const record: QuestionRecord = normalizeQuestionRecord(
        existing
          ? {
              ...existing,
              ...input,
              updatedAt: now
            }
          : {
              id: input.id ?? crypto.randomUUID(),
              standardQuestion: input.standardQuestion,
              category: input.category,
              tags: input.tags,
              sourceTypes: input.sourceTypes,
              sourceRefs: input.sourceRefs,
              favorite: input.favorite,
              masteryLevel: input.masteryLevel,
              priority: input.priority,
              frequency: 0,
              firstAskedAt: null,
              lastAskedAt: null,
              relatedQuestionIds: input.relatedQuestionIds ?? [],
              currentAnswerId: null,
              createdAt: now,
              updatedAt: now,
              deletedAt: null
            }
      );

      state.questions = existing
        ? state.questions.map((item) => (item.id === record.id ? record : item))
        : [record, ...state.questions];
      recalculateQuestionStats(state);
      await persist();
      return record;
    },
    async replaceQuestion(question) {
      const normalized = normalizeQuestionRecord(question);
      state.questions = state.questions.map((item) => (item.id === normalized.id ? normalized : item));
      recalculateQuestionStats(state);
      await persist();
      return normalized;
    },
    async clearQuestions() {
      const now = new Date().toISOString();
      state.questions = state.questions.map((item) => ({ ...item, deletedAt: now }));
      state.answers = state.answers.map((item) => ({ ...item, deletedAt: now, isCurrent: false }));
      recalculateQuestionStats(state);
      await persist();
    },
    async saveAnswerVersion(input) {
      const question = state.questions.find((item) => item.id === input.questionId);
      if (!question) {
        throw new Error("未找到要保存回答的标准问题");
      }

      const now = new Date().toISOString();
      const activeAnswers = state.answers.filter((item) => item.questionId === input.questionId);
      const version = activeAnswers.reduce((max, item) => Math.max(max, item.version), 0) + 1;
      const answer: AnswerRecord = normalizeAnswerRecord({
        id: crypto.randomUUID(),
        questionId: input.questionId,
        content: input.content,
        version,
        type: input.type,
        source: input.source,
        resumeId: input.resumeId,
        isCurrent: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });

      state.answers = state.answers.map((item) =>
        item.questionId === input.questionId ? { ...item, isCurrent: false } : item
      );
      state.answers = [answer, ...state.answers];
      state.questions = state.questions.map((item) =>
        item.id === input.questionId ? { ...item, currentAnswerId: answer.id, updatedAt: now } : item
      );
      await persist();
      return answer;
    },
    async setDedupeCandidates(input) {
      state.dedupeCandidates = input.map(normalizeDedupeCandidateRecord);
      await persist();
      return structuredClone(state.dedupeCandidates);
    },
    async savePrepInsight(input) {
      state.prepInsight = normalizePrepInsight({
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        summary: input.summary,
        priorities: input.priorities,
        coverageGaps: input.coverageGaps,
        nextActions: input.nextActions
      });
      await persist();
      return structuredClone(state.prepInsight) as PrepInsightRecord;
    },
    async softDeleteEntity(kind, id) {
      const now = new Date().toISOString();
      if (kind === "resume") {
        state.resumes = state.resumes.map((item) => (item.id === id ? { ...item, deletedAt: now, isPrimary: false } : item));
        ensurePrimaryResume(state);
      }
      if (kind === "interview") {
        state.interviews = state.interviews.map((item) => (item.id === id ? { ...item, deletedAt: now } : item));
      }
      if (kind === "question") {
        state.questions = state.questions.map((item) => (item.id === id ? { ...item, deletedAt: now } : item));
        state.answers = state.answers.map((item) =>
          item.questionId === id ? { ...item, deletedAt: now, isCurrent: false } : item
        );
        state.dedupeCandidates = state.dedupeCandidates.filter(
          (item) => item.questionAId !== id && item.questionBId !== id
        );
      }
      if (kind === "answer") {
        state.answers = state.answers.map((item) =>
          item.id === id ? { ...item, deletedAt: now, isCurrent: false } : item
        );
        rebalanceCurrentAnswer(state);
      }
      recalculateQuestionStats(state);
      await persist();
    },
    async restoreEntity(kind, id) {
      if (kind === "resume") {
        state.resumes = state.resumes.map((item) => (item.id === id ? { ...item, deletedAt: null } : item));
        ensurePrimaryResume(state);
      }
      if (kind === "interview") {
        state.interviews = state.interviews.map((item) => (item.id === id ? { ...item, deletedAt: null } : item));
      }
      if (kind === "question") {
        state.questions = state.questions.map((item) => (item.id === id ? { ...item, deletedAt: null } : item));
        state.answers = state.answers.map((item) =>
          item.questionId === id ? { ...item, deletedAt: null } : item
        );
        rebalanceCurrentAnswer(state);
      }
      if (kind === "answer") {
        state.answers = state.answers.map((item) => (item.id === id ? { ...item, deletedAt: null } : item));
        rebalanceCurrentAnswer(state);
      }
      recalculateQuestionStats(state);
      await persist();
    },
    async permanentlyDeleteEntity(kind, id) {
      if (kind === "resume") {
        state.resumes = state.resumes.filter((item) => item.id !== id);
        ensurePrimaryResume(state);
      }
      if (kind === "interview") {
        state.interviews = state.interviews.filter((item) => item.id !== id);
      }
      if (kind === "question") {
        state.questions = state.questions.filter((item) => item.id !== id);
        state.answers = state.answers.filter((item) => item.questionId !== id);
        state.dedupeCandidates = state.dedupeCandidates.filter(
          (item) => item.questionAId !== id && item.questionBId !== id
        );
        state.interviews = state.interviews.map((interview) => ({
          ...interview,
          occurrences: interview.occurrences.map((occurrence) =>
            occurrence.questionId === id ? { ...occurrence, questionId: null } : occurrence
          )
        }));
      }
      if (kind === "answer") {
        const removed = state.answers.find((item) => item.id === id);
        state.answers = state.answers.filter((item) => item.id !== id);
        if (removed) {
          rebalanceCurrentAnswer(state, removed.questionId);
        }
      }
      recalculateQuestionStats(state);
      await persist();
    },
    async replaceSnapshot(input) {
      state = normalizePersistedState(input, state.settings.apiKey);
      await persist();
      return decorateSnapshot(state);
    },
    async saveAnalysis(input) {
      const resume = await storeApi.saveResume({
        displayName: stripExtension(input.fileName),
        originalFileName: input.fileName,
        parsedText: input.originalText,
        profile: input.persona,
        predictedQuestions: input.interviewQuestions.map((item) =>
          typeof item === "string"
            ? {
                questionText: item,
                category: "其他",
                tags: []
              }
            : item
        ),
        isPrimary: state.resumes.filter((item) => !item.deletedAt).length === 0
      });
      return toLegacyAnalysis(resume, state.questions);
    },
    async replaceAnalysis(analysis) {
      const resume = state.resumes.find((item) => item.id === analysis.id);
      if (!resume) {
        throw new Error("未找到该份简历分析");
      }

      const updated = normalizeResumeRecord({
        ...resume,
        displayName: stripExtension(analysis.fileName),
        originalFileName: analysis.fileName,
        parsedText: analysis.originalText,
        profile: analysis.persona,
        predictedQuestions: analysis.interviewQuestions.map((item) =>
          normalizePredictedQuestion(
            {
              id: item.id,
              questionText: item.questionText,
              category: item.category,
              tags: item.tags,
              linkedQuestionId: item.highFrequencyId ?? "",
              favorite: false,
              ignoredAt: null,
              createdAt: analysis.createdAt,
              updatedAt: analysis.updatedAt
            },
            analysis.updatedAt
          )
        ),
        updatedAt: analysis.updatedAt
      });

      state.resumes = state.resumes.map((item) => (item.id === updated.id ? updated : item));
      await persist();
      return toLegacyAnalysis(updated, state.questions);
    },
    async deleteAnalysis(id) {
      await storeApi.softDeleteEntity("resume", id);
    },
    async saveInterviewSession(input) {
      const interview = await storeApi.saveInterview({
        company: "",
        position: "",
        interviewDate: "",
        round: "",
        interviewType: "其他",
        status: "已完成",
        jobDescription: "",
        resumeId: findPrimaryResumeId(state),
        title: input.title,
        notes: "",
        sourceType: input.sourceType,
        sourceText: input.sourceText,
        sourceFileName: input.sourceFileName,
        occurrences: input.questions.map((question) => {
          const linkedQuestion = question.highFrequencyId || null;
          return {
            id: question.id,
            questionId: linkedQuestion,
            originalQuestion: question.questionText,
            category: question.category,
            tags: question.tags,
            confidence: "high",
            notes: "",
            answerOverride: question.answerSuggestion,
            answerOverrideUpdatedAt: question.answerGeneratedAt || null
          };
        })
      });
      return toLegacyInterviewSession(interview, state.questions, state.answers);
    },
    async replaceInterviewSession(session) {
      const existing = state.interviews.find((item) => item.id === session.id);
      if (!existing) {
        throw new Error("未找到该场面试");
      }

      const updated: InterviewRecord = normalizeInterviewRecord({
        ...existing,
        title: session.title,
        sourceType: session.sourceType,
        sourceText: session.sourceText,
        sourceFileName: session.sourceFileName,
        updatedAt: new Date().toISOString(),
        occurrences: session.questions.map((question) =>
          normalizeOccurrenceRecord(
            {
              id: question.id,
              questionId: question.highFrequencyId || null,
              originalQuestion: question.questionText,
              category: question.category,
              tags: question.tags,
              notes: "",
              confidence: "high",
              answerOverride: question.answerSuggestion,
              answerOverrideUpdatedAt: question.answerGeneratedAt || null
            },
            question.id,
            new Date().toISOString(),
            existing.id
          )
        )
      });

      state.interviews = state.interviews.map((item) => (item.id === updated.id ? updated : item));
      syncQuestionSourcesFromInterview(state, updated);
      recalculateQuestionStats(state);
      await persist();
      return toLegacyInterviewSession(updated, state.questions, state.answers);
    },
    async deleteInterviewSession(id) {
      await storeApi.softDeleteEntity("interview", id);
    },
    async upsertHighFrequencyQuestion(input) {
      const existing = input.id ? state.questions.find((item) => item.id === input.id) : undefined;
      state.customHighFrequencyTags = mergeTagLists(state.customHighFrequencyTags, input.tags);
      const question = await storeApi.upsertQuestion({
        id: input.id,
        standardQuestion: input.questionText,
        category: input.category,
        tags: input.tags,
        sourceTypes:
          input.sourceSessionIds.length > 0
            ? ["interview"]
            : existing?.sourceTypes ?? ["manual"],
        sourceRefs:
          input.sourceSessionTitles.length > 0
            ? input.sourceSessionTitles.map((title) => ({ type: "interview" as const, label: title }))
            : existing?.sourceRefs ?? [{ type: "manual", label: "手动添加" }],
        favorite: typeof input.pinned === "boolean" ? input.pinned : existing?.favorite ?? false,
        masteryLevel: existing?.masteryLevel ?? "未准备",
        priority: existing?.priority ?? "medium",
        relatedQuestionIds: existing?.relatedQuestionIds ?? []
      });

      if (input.answerSuggestion.trim()) {
        const currentAnswer = readCurrentAnswer(question.id, state.answers);
        if (!currentAnswer || currentAnswer.content !== input.answerSuggestion.trim()) {
          await storeApi.saveAnswerVersion({
            questionId: question.id,
            content: input.answerSuggestion.trim(),
            type: "standard",
            source: currentAnswer ? "user_edited" : "ai_generated",
            resumeId: null
          });
        }
      }

      return toLegacyHighFrequencyQuestion(
        state.questions.find((item) => item.id === question.id) ?? question,
        state.answers,
        state.interviews
      );
    },
    async clearInterviewSessions() {
      await storeApi.clearInterviews();
    },
    async clearHighFrequencyQuestions() {
      await storeApi.clearQuestions();
      state.dedupeCandidates = [];
      await persist();
    }
  };

  return storeApi;
}

export function createAnalysisQuestionRecord(
  input: string | AnalysisQuestionDraft | Partial<AnalysisQuestionRecord>,
  fallbackId: string = crypto.randomUUID()
): AnalysisQuestionRecord {
  const questionText = readAnalysisQuestionText(input).trim();
  const existingRecord = typeof input === "string" ? null : (input as Partial<AnalysisQuestionRecord>);
  const category =
    typeof input === "string" ? inferQuestionCategory(questionText) : normalizeQuestionCategory(input.category, questionText);
  const tags =
    typeof input === "string"
      ? inferQuestionTags(questionText, category)
      : normalizeQuestionTags(input.tags, questionText, category);

  return {
    id: existingRecord?.id ?? fallbackId,
    questionText,
    category,
    tags,
    selected: Boolean(existingRecord?.selected),
    addedToHighFrequency: Boolean(existingRecord?.addedToHighFrequency),
    highFrequencyId: existingRecord?.highFrequencyId ?? ""
  };
}

function decorateSnapshot(state: PersistedAppStateSnapshot): AppStateSnapshot {
  return {
    ...structuredClone(state),
    analyses: state.resumes.filter((item) => !item.deletedAt).map((item) => toLegacyAnalysis(item, state.questions)),
    interviewSessions: state.interviews.filter((item) => !item.deletedAt).map((item) => toLegacyInterviewSession(item, state.questions, state.answers)),
    highFrequencyQuestions: state.questions
      .filter((item) => !item.deletedAt)
      .map((item) => toLegacyHighFrequencyQuestion(item, state.answers, state.interviews))
  };
}

function normalizePersistedState(input: unknown, fallbackApiKey = ""): PersistedAppStateSnapshot {
  if (isLegacyState(input)) {
    return migrateLegacyState(input, fallbackApiKey);
  }

  const raw = (input ?? {}) as Partial<PersistedAppStateSnapshot>;
  const state: PersistedAppStateSnapshot = {
    backupVersion: 2,
    settings: {
      apiKey: raw.settings?.apiKey ?? fallbackApiKey,
      selectedModel: raw.settings?.selectedModel ?? DEFAULT_SETTINGS.selectedModel,
      disclaimerAcceptedAt: raw.settings?.disclaimerAcceptedAt ?? null
    },
    resumes: Array.isArray(raw.resumes) ? raw.resumes.map(normalizeResumeRecord) : [],
    interviews: Array.isArray(raw.interviews) ? raw.interviews.map(normalizeInterviewRecord) : [],
    questions: Array.isArray(raw.questions) ? raw.questions.map(normalizeQuestionRecord) : [],
    answers: Array.isArray(raw.answers) ? raw.answers.map(normalizeAnswerRecord) : [],
    customHighFrequencyTags: mergeTagLists(
      Array.isArray(raw.customHighFrequencyTags) ? raw.customHighFrequencyTags : [],
      collectQuestionTags(Array.isArray(raw.questions) ? raw.questions.map(normalizeQuestionRecord) : [])
    ),
    dedupeCandidates: Array.isArray(raw.dedupeCandidates) ? raw.dedupeCandidates.map(normalizeDedupeCandidateRecord) : [],
    prepInsight: normalizePrepInsight(raw.prepInsight)
  };

  ensurePrimaryResume(state);
  rebalanceCurrentAnswer(state);
  recalculateQuestionStats(state);
  return state;
}

function isLegacyState(input: unknown): input is Partial<LegacyAppStateSnapshot> {
  const raw = input as Partial<LegacyAppStateSnapshot> | undefined;
  return Boolean(raw && (!("backupVersion" in raw) || raw.backupVersion !== 2) && (raw.analyses || raw.interviewSessions || raw.highFrequencyQuestions));
}

function migrateLegacyState(input: Partial<LegacyAppStateSnapshot>, fallbackApiKey: string): PersistedAppStateSnapshot {
  const settings = {
    apiKey: input.settings?.apiKey ?? fallbackApiKey,
    selectedModel: input.settings?.selectedModel ?? DEFAULT_SETTINGS.selectedModel,
    disclaimerAcceptedAt: input.settings?.disclaimerAcceptedAt ?? null
  };
  const resumes = (input.analyses ?? []).map((analysis, index) =>
    normalizeResumeRecord({
      id: analysis.id || crypto.randomUUID(),
      displayName: stripExtension(analysis.fileName || `resume-${index + 1}`),
      originalFileName: analysis.fileName || "",
      version: (input.analyses?.length ?? 0) - index,
      uploadedAt: analysis.createdAt || new Date().toISOString(),
      isPrimary: index === 0,
      parsedText: analysis.originalText || "",
      profile: normalizePersona(analysis.persona),
      predictedQuestions: Array.isArray(analysis.interviewQuestions)
        ? analysis.interviewQuestions.map((question) =>
            normalizePredictedQuestion(
              {
                questionText: readAnalysisQuestionText(question),
                category: normalizeQuestionCategory(typeof question === "string" ? undefined : question.category),
                tags: typeof question === "string" ? [] : normalizeStringList(question.tags),
                linkedQuestionId: typeof question === "string" ? "" : question.highFrequencyId ?? "",
                favorite: false,
                ignoredAt: null,
                createdAt: analysis.createdAt,
                updatedAt: analysis.updatedAt ?? analysis.createdAt
              },
              analysis.createdAt
            )
          )
        : [],
      createdAt: analysis.createdAt || new Date().toISOString(),
      updatedAt: analysis.updatedAt ?? analysis.createdAt ?? new Date().toISOString(),
      deletedAt: null
    })
  );

  const questions: QuestionRecord[] = [];
  const answers: AnswerRecord[] = [];
  const questionMap = new Map<string, QuestionRecord>();

  for (const legacyQuestion of input.highFrequencyQuestions ?? []) {
    const questionId = legacyQuestion.id || crypto.randomUUID();
    const question = normalizeQuestionRecord({
      id: questionId,
      standardQuestion: legacyQuestion.questionText,
      category: normalizeQuestionCategory(legacyQuestion.category),
      tags: normalizeStringList(legacyQuestion.tags),
      sourceTypes: legacyQuestion.sourceSessionIds.length > 0 ? ["interview"] : ["manual"],
      sourceRefs:
        legacyQuestion.sourceSessionTitles.length > 0
          ? legacyQuestion.sourceSessionTitles.map((title) => ({ type: "interview" as const, label: title }))
          : [{ type: "manual", label: "手动添加" }],
      favorite: false,
      masteryLevel: "未准备",
      priority: "medium",
      frequency: 0,
      firstAskedAt: null,
      lastAskedAt: null,
      relatedQuestionIds: [],
      currentAnswerId: null,
      createdAt: legacyQuestion.createdAt,
      updatedAt: legacyQuestion.updatedAt,
      deletedAt: null
    });
    questions.push(question);
    questionMap.set(questionId, question);

    if (legacyQuestion.answerSuggestion?.trim()) {
      const answer = normalizeAnswerRecord({
        id: crypto.randomUUID(),
        questionId,
        content: legacyQuestion.answerSuggestion.trim(),
        version: 1,
        type: "standard",
        source: "ai_generated",
        resumeId: null,
        isCurrent: true,
        createdAt: legacyQuestion.updatedAt,
        updatedAt: legacyQuestion.updatedAt,
        deletedAt: null
      });
      answers.push(answer);
      question.currentAnswerId = answer.id;
    }
  }

  for (const resume of resumes) {
    for (const predictedQuestion of resume.predictedQuestions) {
      if (!predictedQuestion.linkedQuestionId) {
        continue;
      }
      const question = questionMap.get(predictedQuestion.linkedQuestionId);
      if (!question) {
        continue;
      }
      question.sourceTypes = normalizeSourceTypes([...question.sourceTypes, "resume_prediction"]);
      question.sourceRefs = mergeSourceRefs(question.sourceRefs, [
        {
          type: "resume_prediction",
          resumeId: resume.id,
          label: resume.displayName
        }
      ]);
    }
  }

  const primaryResumeId = resumes[0]?.id ?? null;
  const interviews = (input.interviewSessions ?? []).map((session) => {
    const record = normalizeInterviewRecord({
      id: session.id || crypto.randomUUID(),
      company: "",
      position: "",
      interviewDate: "",
      round: "",
      interviewType: "其他",
      status: "已完成",
      jobDescription: "",
      resumeId: primaryResumeId,
      title: session.title,
      notes: "",
      sourceType: session.sourceType === "file" ? "file" : "text",
      sourceText: session.sourceText ?? "",
      sourceFileName: session.sourceFileName ?? "",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      deletedAt: null,
      occurrences: []
    });

    record.occurrences = (session.questions ?? []).map((question) => {
      let questionId = question.highFrequencyId && questionMap.has(question.highFrequencyId) ? question.highFrequencyId : null;

      if (!questionId) {
        const existing = questions.find(
          (item) => normalizeQuestionText(item.standardQuestion) === normalizeQuestionText(question.questionText) && !item.deletedAt
        );
        if (existing) {
          questionId = existing.id;
        } else {
          const created = normalizeQuestionRecord({
            id: crypto.randomUUID(),
            standardQuestion: question.questionText,
            category: question.category,
            tags: question.tags,
            sourceTypes: ["interview"],
            sourceRefs: [],
            favorite: false,
            masteryLevel: "未准备",
            priority: "medium",
            frequency: 0,
            firstAskedAt: null,
            lastAskedAt: null,
            relatedQuestionIds: [],
            currentAnswerId: null,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            deletedAt: null
          });
          questions.push(created);
          questionMap.set(created.id, created);
          questionId = created.id;
        }
      }

      const linkedQuestion = questionId ? questionMap.get(questionId) : null;
      let answerOverride = "";

      if (linkedQuestion && question.answerSuggestion?.trim()) {
        const currentAnswer = linkedQuestion.currentAnswerId
          ? answers.find((item) => item.id === linkedQuestion.currentAnswerId && !item.deletedAt)
          : undefined;

        if (!currentAnswer) {
          const createdAnswer = normalizeAnswerRecord({
            id: crypto.randomUUID(),
            questionId: linkedQuestion.id,
            content: question.answerSuggestion.trim(),
            version: answers.filter((item) => item.questionId === linkedQuestion.id).length + 1,
            type: "standard",
            source: "ai_generated",
            resumeId: record.resumeId,
            isCurrent: true,
            createdAt: question.answerGeneratedAt || session.updatedAt,
            updatedAt: question.answerGeneratedAt || session.updatedAt,
            deletedAt: null
          });
          answers.push(createdAnswer);
          linkedQuestion.currentAnswerId = createdAnswer.id;
        } else if (currentAnswer.content !== question.answerSuggestion.trim()) {
          answerOverride = question.answerSuggestion.trim();
        }
      }

      if (linkedQuestion) {
        linkedQuestion.sourceTypes = normalizeSourceTypes([...linkedQuestion.sourceTypes, "interview"]);
      }

      return normalizeOccurrenceRecord(
        {
          id: question.id,
          questionId,
          originalQuestion: question.questionText,
          category: question.category,
          tags: question.tags,
          askedAt: session.createdAt,
          notes: "",
          confidence: "high",
          answerOverride,
          answerOverrideUpdatedAt: answerOverride ? question.answerGeneratedAt || session.updatedAt : null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        },
        question.id,
        session.createdAt,
        record.id
      );
    });

    return record;
  });

  const state: PersistedAppStateSnapshot = {
    backupVersion: 2,
    settings,
    resumes,
    interviews,
    questions,
    answers,
    customHighFrequencyTags: mergeTagLists(
      input.customHighFrequencyTags ?? [],
      (input.highFrequencyQuestions ?? []).flatMap((item) => item.tags ?? [])
    ),
    dedupeCandidates: Array.isArray(input.dedupeCandidates) ? input.dedupeCandidates.map(normalizeDedupeCandidateRecord) : [],
    prepInsight: normalizePrepInsight(input.prepInsight)
  };

  ensurePrimaryResume(state);
  rebalanceCurrentAnswer(state);
  recalculateQuestionStats(state);
  return state;
}

function normalizeResumeRecord(input: ResumeRecord): ResumeRecord {
  return {
    ...input,
    displayName: input.displayName?.trim() || stripExtension(input.originalFileName || "resume"),
    originalFileName: input.originalFileName ?? "",
    version: Number.isFinite(input.version) ? input.version : 1,
    uploadedAt: input.uploadedAt ?? input.createdAt,
    parsedText: input.parsedText ?? "",
    profile: normalizePersona(input.profile),
    predictedQuestions: Array.isArray(input.predictedQuestions)
      ? input.predictedQuestions.map((item) => normalizePredictedQuestion(item, input.createdAt))
      : [],
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    deletedAt: input.deletedAt ?? null
  };
}

function normalizePredictedQuestion(
  input: AnalysisQuestionDraft | PredictedQuestionRecord,
  fallbackDate: string
): PredictedQuestionRecord {
  if (!("id" in input)) {
    const now = fallbackDate || new Date().toISOString();
    const raw = input as AnalysisQuestionDraft & Partial<PredictedQuestionRecord>;
    const category = normalizeQuestionCategory(input.category, input.questionText);
    return {
      id: crypto.randomUUID(),
      questionText: input.questionText.trim(),
      category,
      tags: normalizeQuestionTags(input.tags, input.questionText, category),
      linkedQuestionId: raw.linkedQuestionId ?? "",
      favorite: Boolean(raw.favorite),
      ignoredAt: raw.ignoredAt ?? null,
      createdAt: now,
      updatedAt: now
    };
  }

  return {
    id: input.id,
    questionText: input.questionText.trim(),
    category: normalizeQuestionCategory(input.category, input.questionText),
    tags: normalizeQuestionTags(input.tags, input.questionText, normalizeQuestionCategory(input.category, input.questionText)),
    linkedQuestionId: input.linkedQuestionId ?? "",
    favorite: Boolean(input.favorite),
    ignoredAt: input.ignoredAt ?? null,
    createdAt: input.createdAt ?? fallbackDate,
    updatedAt: input.updatedAt ?? input.createdAt ?? fallbackDate
  };
}

function normalizeInterviewRecord(input: InterviewRecord): InterviewRecord {
  return {
    ...input,
    company: input.company ?? "",
    position: input.position ?? "",
    interviewDate: input.interviewDate ?? "",
    round: input.round ?? "",
    interviewType: normalizeInterviewType(input.interviewType),
    status: normalizeInterviewStatus(input.status),
    jobDescription: input.jobDescription ?? "",
    resumeId: input.resumeId ?? null,
    title: input.title ?? "",
    notes: input.notes ?? "",
    sourceType: input.sourceType === "file" ? "file" : "text",
    sourceText: input.sourceText ?? "",
    sourceFileName: input.sourceFileName ?? "",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    deletedAt: input.deletedAt ?? null,
    occurrences: Array.isArray(input.occurrences)
      ? input.occurrences.map((item) => normalizeOccurrenceRecord(item, item.id, input.createdAt, input.id))
      : []
  };
}

function normalizeOccurrenceRecord(
  input: Partial<QuestionOccurrenceRecord> | NewInterviewOccurrenceInput,
  fallbackId: string,
  fallbackDate: string,
  interviewId: string
): QuestionOccurrenceRecord {
  const raw = input as Partial<QuestionOccurrenceRecord>;
  return {
    id: input.id ?? fallbackId,
    questionId: input.questionId ?? null,
    interviewId,
    originalQuestion: input.originalQuestion?.trim() ?? "",
    category: normalizeQuestionCategory(input.category),
    tags: normalizeStringList(input.tags),
    askedAt: input.askedAt ?? fallbackDate,
    notes: input.notes ?? "",
    confidence: normalizeConfidence(input.confidence),
    answerOverride: input.answerOverride?.trim() ?? "",
    answerOverrideUpdatedAt: input.answerOverrideUpdatedAt ?? null,
    createdAt: input.createdAt ?? fallbackDate,
    updatedAt: input.updatedAt ?? input.createdAt ?? fallbackDate,
    deletedAt: raw.deletedAt ?? null
  };
}

function normalizeQuestionRecord(input: QuestionRecord): QuestionRecord {
  return {
    ...input,
    standardQuestion: input.standardQuestion?.trim() ?? "",
    category: normalizeQuestionCategory(input.category),
    tags: normalizeStringList(input.tags),
    sourceTypes: normalizeSourceTypes(input.sourceTypes),
    sourceRefs: mergeSourceRefs([], input.sourceRefs ?? []),
    favorite: Boolean(input.favorite),
    masteryLevel: normalizeMasteryLevel(input.masteryLevel),
    priority: normalizePriority(input.priority),
    frequency: Number.isFinite(input.frequency) ? input.frequency : 0,
    firstAskedAt: input.firstAskedAt ?? null,
    lastAskedAt: input.lastAskedAt ?? null,
    relatedQuestionIds: normalizeStringList(input.relatedQuestionIds),
    currentAnswerId: input.currentAnswerId ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    deletedAt: input.deletedAt ?? null
  };
}

function normalizeAnswerRecord(input: AnswerRecord): AnswerRecord {
  return {
    ...input,
    content: input.content?.trim() ?? "",
    version: Number.isFinite(input.version) ? input.version : 1,
    type: "standard",
    source: normalizeAnswerSource(input.source),
    resumeId: input.resumeId ?? null,
    isCurrent: Boolean(input.isCurrent),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    deletedAt: input.deletedAt ?? null
  };
}

function normalizeDedupeCandidateRecord(input: DedupeCandidateRecord): DedupeCandidateRecord {
  const rawConfidence = (input as { confidence?: unknown }).confidence;
  return {
    questionAId: input.questionAId,
    questionBId: input.questionBId,
    reason: input.reason ?? "",
    confidence: typeof rawConfidence === "number" ? `${rawConfidence}` : input.confidence ?? "",
    recommendedAction: input.recommendedAction ?? ""
  };
}

function normalizePrepInsight(input: PrepInsightRecord | null | undefined): PrepInsightRecord | null {
  if (!input) {
    return null;
  }

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    summary: input.summary ?? "",
    priorities: normalizeStringList(input.priorities),
    coverageGaps: normalizeStringList(input.coverageGaps),
    nextActions: normalizeStringList(input.nextActions)
  };
}

function normalizePersona(input: string | PersonaProfile | undefined): PersonaProfile {
  if (!input || typeof input === "string") {
    return {
      candidateSummary: typeof input === "string" ? input : "",
      strongSkills: [],
      personalAdvantages: [],
      workExperience: [],
      projectHighlights: [],
      riskPoints: []
    };
  }

  return {
    candidateSummary: input.candidateSummary ?? "",
    strongSkills: normalizeStringList(input.strongSkills),
    personalAdvantages: normalizeStringList(input.personalAdvantages),
    workExperience: normalizeStringList(input.workExperience),
    projectHighlights: normalizeStringList(input.projectHighlights),
    riskPoints: normalizeStringList(input.riskPoints)
  };
}

function normalizeQuestionCategory(input: unknown, questionText = ""): QuestionCategory {
  if (QUESTION_CATEGORIES.includes(input as QuestionCategory) && input !== "其他") {
    return input as QuestionCategory;
  }

  return inferQuestionCategory(questionText);
}

function normalizeStringList(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
      )
  );
}

function mergeTagLists(...groups: Array<unknown>): string[] {
  const pool = new Set<string>();

  for (const group of groups) {
    for (const tag of normalizeStringList(group)) {
      pool.add(tag);
    }
  }

  return Array.from(pool).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function collectQuestionTags(questions: QuestionRecord[]): string[] {
  return questions.flatMap((question) => question.tags);
}

function normalizeQuestionTags(input: unknown, questionText: string, category: QuestionCategory): string[] {
  const normalized = normalizeStringList(input);
  return normalized.length > 0 ? normalized : inferQuestionTags(questionText, category);
}

function inferQuestionCategory(questionText: string): QuestionCategory {
  const text = questionText.trim();
  if (!text) {
    return "其他";
  }
  if (matchesQuestionKeyword(text, HR_KEYWORDS)) {
    return "人事问题";
  }
  if (matchesQuestionKeyword(text, BUSINESS_KEYWORDS)) {
    return "业务问题";
  }
  if (matchesQuestionKeyword(text, TECH_KEYWORDS)) {
    return "技术问题";
  }
  if (matchesQuestionKeyword(text, PROJECT_KEYWORDS)) {
    return "项目问题";
  }
  return "其他";
}

function inferQuestionTags(questionText: string, category: QuestionCategory): string[] {
  const tags = new Set<string>();
  for (const [tag, pattern] of TAG_RULES) {
    if (pattern.test(questionText)) {
      tags.add(tag);
    }
  }

  if (tags.size === 0) {
    if (category === "人事问题") tags.add("求职动机");
    if (category === "项目问题") tags.add("项目经历");
    if (category === "技术问题") tags.add("技术细节");
    if (category === "业务问题") tags.add("业务理解");
  }

  return Array.from(tags).slice(0, 3);
}

function matchesQuestionKeyword(questionText: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(questionText));
}

function readAnalysisQuestionText(input: string | AnalysisQuestionDraft | Partial<AnalysisQuestionRecord>): string {
  if (typeof input === "string") {
    return input;
  }
  return input.questionText ?? "";
}

function nextResumeVersion(resumes: ResumeRecord[]): number {
  return resumes.reduce((max, item) => Math.max(max, item.version || 0), 0) + 1;
}

function ensurePrimaryResume(state: PersistedAppStateSnapshot): void {
  const active = state.resumes.filter((item) => !item.deletedAt);
  if (active.length === 0) {
    return;
  }

  const existingPrimary = active.find((item) => item.isPrimary);
  if (existingPrimary) {
    state.resumes = state.resumes.map((item) => ({
      ...item,
      isPrimary: !item.deletedAt && item.id === existingPrimary.id
    }));
    return;
  }

  const first = active[0];
  state.resumes = state.resumes.map((item) => ({
    ...item,
    isPrimary: !item.deletedAt && item.id === first.id
  }));
}

function findPrimaryResumeId(state: PersistedAppStateSnapshot): string | null {
  return state.resumes.find((item) => item.isPrimary && !item.deletedAt)?.id ?? null;
}

function recalculateQuestionStats(state: PersistedAppStateSnapshot): void {
  const activeQuestionIds = new Set(state.questions.filter((item) => !item.deletedAt).map((item) => item.id));
  const statMap = new Map<string, { count: number; firstAskedAt: string | null; lastAskedAt: string | null }>();

  for (const question of state.questions) {
    statMap.set(question.id, { count: 0, firstAskedAt: null, lastAskedAt: null });
  }

  for (const interview of state.interviews) {
    if (interview.deletedAt) {
      continue;
    }

    for (const occurrence of interview.occurrences) {
      if (occurrence.deletedAt || !occurrence.questionId || !activeQuestionIds.has(occurrence.questionId)) {
        continue;
      }

      const current = statMap.get(occurrence.questionId);
      if (!current) {
        continue;
      }

      current.count += 1;
      current.firstAskedAt =
        !current.firstAskedAt || occurrence.askedAt < current.firstAskedAt ? occurrence.askedAt : current.firstAskedAt;
      current.lastAskedAt =
        !current.lastAskedAt || occurrence.askedAt > current.lastAskedAt ? occurrence.askedAt : current.lastAskedAt;
    }
  }

  state.questions = state.questions.map((question) => {
    const stats = statMap.get(question.id) ?? { count: 0, firstAskedAt: null, lastAskedAt: null };
    return {
      ...question,
      frequency: question.deletedAt ? 0 : stats.count,
      firstAskedAt: question.deletedAt ? null : stats.firstAskedAt,
      lastAskedAt: question.deletedAt ? null : stats.lastAskedAt
    };
  });
}

function rebalanceCurrentAnswer(state: PersistedAppStateSnapshot, questionId?: string): void {
  const targetQuestionIds = questionId ? [questionId] : Array.from(new Set(state.answers.map((item) => item.questionId)));
  for (const id of targetQuestionIds) {
    const activeAnswers = state.answers
      .filter((item) => item.questionId === id && !item.deletedAt)
      .sort((a, b) => b.version - a.version || b.updatedAt.localeCompare(a.updatedAt));
    const current = activeAnswers[0] ?? null;

    state.answers = state.answers.map((item) =>
      item.questionId === id ? { ...item, isCurrent: current ? item.id === current.id : false } : item
    );
    state.questions = state.questions.map((item) =>
      item.id === id ? { ...item, currentAnswerId: current?.id ?? null } : item
    );
  }
}

function syncQuestionSourcesFromInterview(state: PersistedAppStateSnapshot, interview: InterviewRecord): void {
  const touched = new Set(interview.occurrences.map((item) => item.questionId).filter(Boolean) as string[]);
  state.questions = state.questions.map((question) => {
    if (!touched.has(question.id)) {
      return question;
    }
    return {
      ...question,
      sourceTypes: normalizeSourceTypes([...question.sourceTypes, "interview"])
    };
  });
}

function readCurrentAnswer(questionId: string, answers: AnswerRecord[]): AnswerRecord | null {
  return answers.find((item) => item.questionId === questionId && item.isCurrent && !item.deletedAt) ?? null;
}

function toLegacyAnalysis(resume: ResumeRecord, questions: QuestionRecord[]): AnalysisRecord {
  const activeQuestionIds = new Set(questions.filter((item) => !item.deletedAt).map((item) => item.id));
  return {
    id: resume.id,
    fileName: resume.originalFileName || `${resume.displayName}.txt`,
    originalText: resume.parsedText,
    extractedTextPreview: resume.parsedText.slice(0, 200),
    persona: resume.profile,
    interviewQuestions: resume.predictedQuestions.map((question) =>
      createAnalysisQuestionRecord(
        {
          id: question.id,
          questionText: question.questionText,
          category: question.category,
          tags: question.tags,
          selected: false,
          addedToHighFrequency: Boolean(question.linkedQuestionId && activeQuestionIds.has(question.linkedQuestionId)),
          highFrequencyId: question.linkedQuestionId && activeQuestionIds.has(question.linkedQuestionId) ? question.linkedQuestionId : ""
        },
        question.id
      )
    ),
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt
  };
}

function toLegacyInterviewSession(
  interview: InterviewRecord,
  questions: QuestionRecord[],
  answers: AnswerRecord[]
): InterviewSessionRecord {
  return {
    id: interview.id,
    title: interview.title,
    sourceType: interview.sourceType,
    sourceText: interview.sourceText,
    sourceFileName: interview.sourceFileName,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
    questions: interview.occurrences
      .filter((item) => !item.deletedAt)
      .map((occurrence) => {
        const linkedQuestion = occurrence.questionId
          ? questions.find((item) => item.id === occurrence.questionId && !item.deletedAt)
          : null;
        const currentAnswer = linkedQuestion ? readCurrentAnswer(linkedQuestion.id, answers) : null;
        return {
          id: occurrence.id,
          questionText: occurrence.originalQuestion,
          category: occurrence.category,
          tags: occurrence.tags,
          selected: false,
          answerSuggestion: occurrence.answerOverride || currentAnswer?.content || "",
          answerGeneratedAt: occurrence.answerOverrideUpdatedAt ?? currentAnswer?.updatedAt ?? "",
          addedToHighFrequency: Boolean(linkedQuestion),
          highFrequencyId: linkedQuestion?.id ?? ""
        };
      })
  };
}

function toLegacyHighFrequencyQuestion(
  question: QuestionRecord,
  answers: AnswerRecord[],
  interviews: InterviewRecord[]
): HighFrequencyQuestionRecord {
  const sourceInterviewTitles = Array.from(
    new Set(
      interviews
        .filter((interview) => !interview.deletedAt)
        .filter((interview) => interview.occurrences.some((occurrence) => occurrence.questionId === question.id && !occurrence.deletedAt))
        .map((interview) => interview.title)
        .filter(Boolean)
    )
  );
  const sourceInterviewIds = Array.from(
    new Set(
      interviews
        .filter((interview) => !interview.deletedAt)
        .filter((interview) => interview.occurrences.some((occurrence) => occurrence.questionId === question.id && !occurrence.deletedAt))
        .map((interview) => interview.id)
    )
  );

  return {
    id: question.id,
    questionText: question.standardQuestion,
    category: question.category,
    tags: question.tags,
    answerSuggestion: readCurrentAnswer(question.id, answers)?.content ?? "",
    pinned: question.favorite,
    sourceSessionIds: sourceInterviewIds,
    sourceSessionTitles: sourceInterviewTitles,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt
  };
}

function normalizeQuestionText(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "resume";
}

function mergeSourceRefs(current: QuestionSourceRef[], next: QuestionSourceRef[]): QuestionSourceRef[] {
  const map = new Map<string, QuestionSourceRef>();
  for (const item of [...current, ...next]) {
    const normalized: QuestionSourceRef = {
      type: normalizeSourceType(item.type),
      resumeId: item.resumeId,
      label: item.label?.trim() || "未命名来源"
    };
    map.set(`${normalized.type}:${normalized.resumeId ?? ""}:${normalized.label}`, normalized);
  }
  return Array.from(map.values());
}

function normalizeSourceTypes(input: QuestionSourceType[] | undefined): QuestionSourceType[] {
  if (!Array.isArray(input) || input.length === 0) {
    return ["manual"];
  }

  return Array.from(new Set(input.map(normalizeSourceType)));
}

function normalizeSourceType(input: unknown): QuestionSourceType {
  return SOURCE_TYPES.includes(input as QuestionSourceType) ? (input as QuestionSourceType) : "manual";
}

function normalizeMasteryLevel(input: unknown): MasteryLevel {
  return MASTERY_LEVELS.includes(input as MasteryLevel) ? (input as MasteryLevel) : "未准备";
}

function normalizePriority(input: unknown): PriorityLevel {
  return PRIORITIES.includes(input as PriorityLevel) ? (input as PriorityLevel) : "medium";
}

function normalizeAnswerSource(input: unknown): AnswerSource {
  return ANSWER_SOURCES.includes(input as AnswerSource) ? (input as AnswerSource) : "user_edited";
}

function normalizeConfidence(input: unknown): InterviewQuestionConfidence {
  return CONFIDENCE_LEVELS.includes(input as InterviewQuestionConfidence) ? (input as InterviewQuestionConfidence) : "medium";
}

function normalizeInterviewType(input: unknown): InterviewType {
  return INTERVIEW_TYPES.includes(input as InterviewType) ? (input as InterviewType) : "其他";
}

function normalizeInterviewStatus(input: unknown): InterviewStatus {
  return INTERVIEW_STATUSES.includes(input as InterviewStatus) ? (input as InterviewStatus) : "已完成";
}

const QUESTION_CATEGORIES: QuestionCategory[] = ["人事问题", "项目问题", "技术问题", "业务问题", "其他"];
const SOURCE_TYPES: QuestionSourceType[] = ["resume_prediction", "interview", "manual"];
const MASTERY_LEVELS: MasteryLevel[] = ["未准备", "已整理", "基本掌握", "熟练", "需要加强"];
const PRIORITIES: PriorityLevel[] = ["low", "medium", "high"];
const ANSWER_SOURCES: AnswerSource[] = ["ai_generated", "user_edited", "ai_polished", "ai_shortened", "ai_expanded"];
const CONFIDENCE_LEVELS: InterviewQuestionConfidence[] = ["high", "medium", "low"];
const INTERVIEW_TYPES: InterviewType[] = ["线上", "线下", "电话", "其他"];
const INTERVIEW_STATUSES: InterviewStatus[] = [
  "待面试",
  "已完成",
  "待反馈",
  "通过",
  "进入下一轮",
  "未通过",
  "Offer",
  "主动放弃"
];
const HR_KEYWORDS = [/自我介绍/, /离职/, /职业规划/, /优点/, /缺点/, /为什么/, /薪资/, /加班/, /稳定性/, /压力/];
const PROJECT_KEYWORDS = [/项目/, /亮点/, /难点/, /负责/, /推进/, /协作/, /复盘/, /上线/, /排期/, /风险/];
const TECH_KEYWORDS = [/自动化/, /接口/, /测试/, /框架/, /脚本/, /数据库/, /sql/i, /登录态/, /token/i, /鉴权/, /性能/, /bug/, /持续集成/, /代码/];
const BUSINESS_KEYWORDS = [/业务/, /指标/, /用户/, /场景/, /流程/, /价值/, /收益/, /转化/, /留存/, /漏斗/];
const TAG_RULES: Array<[string, RegExp]> = [
  ["自我介绍", /自我介绍/],
  ["离职原因", /离职/],
  ["职业规划", /职业规划/],
  ["项目亮点", /亮点/],
  ["项目难点", /难点|挑战/],
  ["项目经历", /项目|负责/],
  ["自动化", /自动化/],
  ["接口测试", /接口/],
  ["鉴权", /登录态|token|鉴权/i],
  ["数据库", /数据库|sql/i],
  ["性能", /性能|压测/],
  ["业务理解", /业务|场景|流程/],
  ["业务指标", /指标|转化|留存|收益/],
  ["风险追问", /风险|问题|兜底/],
  ["沟通协作", /协作|沟通|推进/]
];
