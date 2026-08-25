export type ModelOption = "deepseek-v4-flash" | "deepseek-v4-pro";

export interface PersonaProfile {
  candidateSummary: string;
  strongSkills: string[];
  personalAdvantages: string[];
  workExperience: string[];
  projectHighlights: string[];
  riskPoints: string[];
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

export interface BootstrapPayload {
  settings: {
    hasApiKey: boolean;
    selectedModel: ModelOption;
    maskedApiKey?: string;
    disclaimerAccepted: boolean;
    requiresSetup?: boolean;
  };
  resumes: ResumeRecord[];
  interviews: InterviewRecord[];
  questions: QuestionRecord[];
  answers: AnswerRecord[];
  recycleBin: RecycleBinPayload;
  analyses: AnalysisRecord[];
  interviewSessions: InterviewSessionRecord[];
  highFrequencyQuestions: HighFrequencyQuestionRecord[];
  customHighFrequencyTags: string[];
  dedupeCandidates: DedupeCandidateRecord[];
  prepInsight: PrepInsightRecord | null;
}

export type QuestionCategory = "人事问题" | "项目问题" | "技术问题" | "业务问题" | "其他";

export interface AnalysisQuestionRecord {
  id: string;
  questionText: string;
  category: QuestionCategory;
  tags: string[];
  selected: boolean;
  addedToHighFrequency: boolean;
  highFrequencyId: string;
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

export type MasteryLevel = "未准备" | "已整理" | "基本掌握" | "熟练" | "需要加强";
export type PriorityLevel = "low" | "medium" | "high";

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

export interface InterviewOccurrenceRecord {
  id: string;
  questionId: string | null;
  interviewId: string;
  originalQuestion: string;
  category: QuestionCategory;
  tags: string[];
  askedAt: string;
  notes: string;
  confidence: "high" | "medium" | "low";
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
  interviewType: "线上" | "线下" | "电话" | "其他";
  status: "待面试" | "已完成" | "待反馈" | "通过" | "进入下一轮" | "未通过" | "Offer" | "主动放弃";
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
  occurrences: InterviewOccurrenceRecord[];
}

export interface QuestionSourceRef {
  type: "resume_prediction" | "interview" | "manual";
  resumeId?: string;
  label: string;
}

export interface QuestionRecord {
  id: string;
  standardQuestion: string;
  category: QuestionCategory;
  tags: string[];
  sourceTypes: Array<"resume_prediction" | "interview" | "manual">;
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

export interface AnswerRecord {
  id: string;
  questionId: string;
  content: string;
  version: number;
  type: "standard";
  source: "ai_generated" | "user_edited" | "ai_polished" | "ai_shortened" | "ai_expanded";
  resumeId: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RecycleBinPayload {
  resumes: ResumeRecord[];
  interviews: InterviewRecord[];
  questions: QuestionRecord[];
  answers: AnswerRecord[];
}

export interface LocalDataExportPayload {
  version: number;
  exportedAt: string;
  snapshot: {
    settings: {
      apiKey: string;
      selectedModel: ModelOption;
      disclaimerAcceptedAt: string | null;
    };
    analyses: AnalysisRecord[];
    interviewSessions: InterviewSessionRecord[];
    highFrequencyQuestions: HighFrequencyQuestionRecord[];
    customHighFrequencyTags: string[];
    dedupeCandidates: DedupeCandidateRecord[];
    prepInsight: PrepInsightRecord | null;
  };
}

export interface SessionSyncPayload {
  session: InterviewSessionRecord;
  highFrequencyQuestions: HighFrequencyQuestionRecord[];
}

export interface HighFrequencySyncPayload {
  question: HighFrequencyQuestionRecord;
  interviewSessions: InterviewSessionRecord[];
}

export interface AnalysisSyncPayload {
  analysis: AnalysisRecord;
  highFrequencyQuestions?: HighFrequencyQuestionRecord[];
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  const response = await fetch("/api/bootstrap");
  if (!response.ok) {
    throw new Error("加载本地数据失败");
  }
  return response.json() as Promise<BootstrapPayload>;
}

export async function saveSettings(input: { apiKey?: string; selectedModel: ModelOption; acceptDisclaimer?: boolean }) {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as {
    error?: string;
    hasApiKey?: boolean;
    selectedModel?: ModelOption;
    maskedApiKey?: string;
    disclaimerAccepted?: boolean;
    requiresSetup?: boolean;
  };
  if (!response.ok) {
    throw new Error(payload.error || "保存设置失败");
  }
  return payload;
}

export async function testConnectivity(input: { apiKey?: string; selectedModel: ModelOption }) {
  const response = await fetch("/api/test-connectivity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as { error?: string; ok?: boolean };
  if (!response.ok) {
    throw new Error(payload.error || "连通性测试失败");
  }
  return payload;
}

export async function analyzeResume(file: File): Promise<AnalysisRecord> {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch("/api/analyze-resume", {
    method: "POST",
    body: formData
  });

  const payload = (await response.json()) as AnalysisRecord & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "简历分析失败");
  }
  return payload;
}

export async function extractInterviewQuestions(input: {
  title: string;
  sourceText: string;
  sourceType: "text" | "file";
}) {
  const response = await fetch("/api/interview-sessions/extract-questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as { error?: string; questions?: InterviewQuestionRecord[]; title?: string };
  if (!response.ok) {
    throw new Error(payload.error || "问题提取失败");
  }
  return payload;
}

export async function createInterviewSession(input: {
  title: string;
  sourceType: "text" | "file";
  sourceText: string;
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
  questions: InterviewQuestionRecord[];
}) {
  const response = await fetch("/api/interview-sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as InterviewSessionRecord & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "保存面试场次失败");
  }
  return payload;
}

export async function generateInterviewAnswers(sessionId: string, questionIds: string[]) {
  const response = await fetch(`/api/interview-sessions/${sessionId}/questions/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ questionIds })
  });

  const payload = (await response.json()) as SessionSyncPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "回答建议生成失败");
  }
  return payload;
}

export async function updateInterviewSessionQuestions(sessionId: string, questions: InterviewQuestionRecord[]) {
  const response = await fetch(`/api/interview-sessions/${sessionId}/questions`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ questions })
  });

  const payload = (await response.json()) as SessionSyncPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "保存问题失败");
  }
  return payload;
}

export async function addQuestionsToHighFrequency(sessionId: string, questionIds: string[]) {
  const response = await fetch(`/api/interview-sessions/${sessionId}/questions/add-to-high-frequency`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ questionIds })
  });

  const payload = (await response.json()) as (SessionSyncPayload & {
    error?: string;
  });
  if (!response.ok) {
    throw new Error(payload.error || "加入高频问题库失败");
  }
  return payload;
}

export async function runHighFrequencyDedupe() {
  const response = await fetch("/api/high-frequency-questions/ai-deduplicate", {
    method: "POST"
  });

  const payload = (await response.json()) as { error?: string; candidates: DedupeCandidateRecord[] };
  if (!response.ok) {
    throw new Error(payload.error || "AI 去重检查失败");
  }
  return payload;
}

export async function createHighFrequencyQuestion(input: {
  questionText: string;
  category: QuestionCategory;
  tags: string[];
  answerSuggestion: string;
}) {
  const response = await fetch("/api/high-frequency-questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as HighFrequencyQuestionRecord & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "手动添加高频问题失败");
  }
  return payload;
}

export async function updateHighFrequencyQuestion(
  questionId: string,
  input: {
    questionText: string;
    category: QuestionCategory;
    tags: string[];
    answerSuggestion: string;
    pinned?: boolean;
  }
) {
  const response = await fetch(`/api/high-frequency-questions/${questionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as HighFrequencySyncPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "保存高频问题失败");
  }
  return payload;
}

export async function generateHighFrequencyAnswer(questionId: string) {
  const response = await fetch(`/api/high-frequency-questions/${questionId}/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const payload = (await response.json()) as HighFrequencySyncPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "生成高频问题回答失败");
  }
  return payload;
}

export async function deleteHighFrequencyQuestion(questionId: string) {
  const response = await fetch(`/api/high-frequency-questions/${questionId}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "删除高频问题失败");
  }
}

export async function generatePrepInsight() {
  const response = await fetch("/api/prep-insights/generate", {
    method: "POST"
  });

  const payload = (await response.json()) as PrepInsightRecord & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "AI 备战建议生成失败");
  }
  return payload;
}

export async function exportLocalData() {
  const response = await fetch("/api/data/export");
  const payload = (await response.json()) as LocalDataExportPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "导出本地数据失败");
  }
  return payload;
}

export async function importLocalData(file: File) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("导入文件不是合法 JSON");
  }

  const response = await fetch("/api/data/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parsed)
  });

  const payload = (await response.json()) as BootstrapPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "导入本地数据失败");
  }
  return payload;
}

export async function clearInterviewSessions() {
  const response = await fetch("/api/interview-sessions", { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "清空面试场次失败");
  }
}

export async function deleteInterviewSession(sessionId: string) {
  const response = await fetch(`/api/interview-sessions/${sessionId}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "删除面试场次失败");
  }
}

export async function clearHighFrequencyQuestions() {
  const response = await fetch("/api/high-frequency-questions", { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "清空高频问题库失败");
  }
}

export async function updateResume(
  resumeId: string,
  input: {
    displayName?: string;
    isPrimary?: boolean;
  }
) {
  const response = await fetch(`/api/resumes/${resumeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as { error?: string; resume?: ResumeRecord };
  if (!response.ok) {
    throw new Error(payload.error || "保存简历信息失败");
  }
  return payload;
}

export async function deleteResume(resumeId: string) {
  const response = await fetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "删除简历失败");
  }
}

export async function clearResumeHistory() {
  const response = await fetch("/api/resumes", { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "清空简历历史失败");
  }
}

export async function answerPredictedQuestion(resumeId: string, predictionId: string) {
  const response = await fetch(`/api/resumes/${resumeId}/predicted-questions/${predictionId}/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const payload = (await response.json()) as {
    error?: string;
    resume: ResumeRecord;
    question: QuestionRecord;
    answer: AnswerRecord;
  };
  if (!response.ok) {
    throw new Error(payload.error || "生成预测题回答失败");
  }
  return payload;
}

export async function restoreRecycleBinItem(
  kind: "resume" | "interview" | "question" | "answer",
  id: string
) {
  const response = await fetch(`/api/recycle-bin/${kind}/${id}/restore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const payload = (await response.json()) as {
    error?: string;
    resume?: ResumeRecord | null;
    interview?: InterviewRecord | null;
    question?: QuestionRecord | null;
    answer?: AnswerRecord | null;
  };
  if (!response.ok) {
    throw new Error(payload.error || "恢复回收站项目失败");
  }
  return payload;
}

export async function permanentlyDeleteRecycleBinItem(
  kind: "resume" | "interview" | "question" | "answer",
  id: string
) {
  const response = await fetch(`/api/recycle-bin/${kind}/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "永久删除失败");
  }
}

export async function deleteAnalysis(analysisId: string) {
  const response = await fetch(`/api/analyses/${analysisId}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "删除简历分析失败");
  }
}

export async function expandAnalysisQuestions(analysisId: string, input: { focus?: QuestionCategory }) {
  const response = await fetch(`/api/analyses/${analysisId}/questions/expand`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as AnalysisSyncPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "继续生成问题失败");
  }
  return payload;
}

export async function addAnalysisQuestionsToHighFrequency(analysisId: string, questionIds: string[]) {
  const response = await fetch(`/api/analyses/${analysisId}/questions/add-to-high-frequency`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ questionIds })
  });

  const payload = (await response.json()) as (AnalysisSyncPayload & {
    highFrequencyQuestions: HighFrequencyQuestionRecord[];
    error?: string;
  });
  if (!response.ok) {
    throw new Error(payload.error || "加入高频问题库失败");
  }
  return payload;
}
