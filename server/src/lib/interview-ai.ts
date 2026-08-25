import { z } from "zod";

import type { DedupeCandidateRecord, DeepSeekModel, QuestionCategory } from "./app-state.js";
import { callDeepSeek } from "./deepseek-client.js";

const categories = ["人事问题", "项目问题", "技术问题", "业务问题", "其他"] as const;

const extractedQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().min(1),
      category: z.enum(categories),
      tags: z.array(z.string().min(1))
    })
  )
});

const answerSuggestionsSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answerSuggestion: z.string().min(1)
    })
  )
});

const dedupeCandidatesSchema = z.object({
  candidates: z.array(
    z.object({
      questionAId: z.string().min(1),
      questionBId: z.string().min(1),
      reason: z.string().min(1),
      confidence: z.union([z.string().min(1), z.number().finite()]),
      recommendedAction: z.string().min(1)
    })
  )
});

const prepInsightSchema = z.object({
  summary: z.string().min(1),
  priorities: z.array(z.string().min(1)),
  coverageGaps: z.array(z.string().min(1)),
  nextActions: z.array(z.string().min(1))
});

type CallModel = (args: {
  apiKey: string;
  model: DeepSeekModel;
  messages: Array<{ role: "system" | "user"; content: string }>;
}) => Promise<string>;

export async function extractInterviewQuestions(input: {
  sourceText: string;
  selectedModel: DeepSeekModel;
  apiKey: string;
  callModel?: CallModel;
}): Promise<{ questions: Array<{ questionText: string; category: QuestionCategory; tags: string[] }> }> {
  const responseText = await (input.callModel ?? callDeepSeek)({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content:
          "Extract interview questions from the user's interview text. Return strict JSON with a questions array. Each item needs questionText, category, and tags."
      },
      {
        role: "user",
        content: [
          "从下面的面试文本中整理出真实被问到的问题。",
          "category 只能是：人事问题、项目问题、技术问题、业务问题、其他。",
          "tags 给出简短关键词数组。",
          "只返回 JSON。",
          input.sourceText
        ].join("\n\n")
      }
    ]
  });

  const parsed = extractedQuestionsSchema.parse(JSON.parse(stripCodeFence(responseText)));
  return {
    questions: parsed.questions.map((item) => ({
      questionText: item.questionText.trim(),
      category: item.category,
      tags: item.tags.map((tag) => tag.trim()).filter(Boolean)
    }))
  };
}

export async function generateAnswerSuggestions(input: {
  selectedModel: DeepSeekModel;
  apiKey: string;
  questions: Array<{ id: string; questionText: string }>;
  resumeContext?: {
    fileName: string;
    originalText: string;
    candidateSummary: string;
    strongSkills: string[];
    personalAdvantages: string[];
    workExperience: string[];
    projectHighlights: string[];
    riskPoints: string[];
  };
  callModel?: CallModel;
}): Promise<{ answers: Array<{ questionId: string; answerSuggestion: string }> }> {
  const resumeContextText = toResumeContextText(input.resumeContext);

  const responseText = await (input.callModel ?? callDeepSeek)({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content:
          "你是一名中文面试教练。请基于候选人的简历事实生成可直接在面试中说出口的回答稿。返回 strict JSON，包含 answers 数组。每个 answer 必须包含 questionId 和 answerSuggestion。answerSuggestion 必须是第一人称、口语化、简洁自然、符合候选人真实经历，不能写成提纲，不能出现“建议回答”“你可以说”等提示语，不能编造简历里没有的事实。"
      },
      {
        role: "user",
        content: [
          "请针对下面这些问题生成中文回答稿。",
          "输出内容要像候选人在面试现场真实说出来的话，能直接照着说，不要像 AI 总结。",
          "每题控制在 120 到 220 字之间，优先短句，少用书面词。",
          "没被简历明确支持的内容不要扩写。",
          "以下是候选人的简历上下文：",
          resumeContextText,
          "只返回 JSON。",
          JSON.stringify(input.questions, null, 2)
        ].join("\n\n")
      }
    ]
  });

  const parsed = answerSuggestionsSchema.parse(JSON.parse(stripCodeFence(responseText)));
  return {
    answers: parsed.answers.map((item) => ({
      questionId: item.questionId,
      answerSuggestion: item.answerSuggestion.trim()
    }))
  };
}

export async function generatePrepInsights(input: {
  selectedModel: DeepSeekModel;
  apiKey: string;
  resumeContext?: {
    fileName: string;
    originalText: string;
    candidateSummary: string;
    strongSkills: string[];
    personalAdvantages: string[];
    workExperience: string[];
    projectHighlights: string[];
    riskPoints: string[];
  };
  interviewSessions: Array<{
    title: string;
    questions: Array<{
      questionText: string;
      category: QuestionCategory;
      answerSuggestion: string;
    }>;
  }>;
  highFrequencyQuestions: Array<{
    questionText: string;
    category: QuestionCategory;
    answerSuggestion: string;
  }>;
  callModel?: CallModel;
}): Promise<{
  summary: string;
  priorities: string[];
  coverageGaps: string[];
  nextActions: string[];
}> {
  const recentSessions = input.interviewSessions.slice(0, 8).map((session) => ({
    title: session.title,
    questions: session.questions.slice(0, 12).map((question) => ({
      questionText: question.questionText,
      category: question.category,
      hasAnswerSuggestion: Boolean(question.answerSuggestion.trim())
    }))
  }));
  const highFrequencyQuestions = input.highFrequencyQuestions.slice(0, 20).map((question) => ({
    questionText: question.questionText,
    category: question.category,
    hasAnswerSuggestion: Boolean(question.answerSuggestion.trim())
  }));

  const responseText = await (input.callModel ?? callDeepSeek)({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content:
          "你是一名中文面试教练。请根据候选人的简历事实、真实面试记录和高频问题库，输出一份简短、可执行的备战建议。返回 strict JSON，必须包含 summary、priorities、coverageGaps、nextActions。不要编造简历没有的经历，不要写套话。"
      },
      {
        role: "user",
        content: [
          "请给我一份下一步最值得准备的中文备战建议。",
          "summary 用 1 到 2 句话，直接说当前最关键的问题。",
          "priorities 输出 2 到 5 条优先准备的主题或题型。",
          "coverageGaps 输出当前明显还没覆盖好的点。",
          "nextActions 输出 2 到 5 条可以马上执行的动作。",
          "以下是候选人的简历上下文：",
          toResumeContextText(input.resumeContext),
          "以下是最近的面试场次：",
          JSON.stringify(recentSessions, null, 2),
          "以下是高频问题库：",
          JSON.stringify(highFrequencyQuestions, null, 2),
          "只返回 JSON。"
        ].join("\n\n")
      }
    ]
  });

  const parsed = prepInsightSchema.parse(JSON.parse(stripCodeFence(responseText)));
  return {
    summary: parsed.summary.trim(),
    priorities: parsed.priorities.map((item) => item.trim()).filter(Boolean),
    coverageGaps: parsed.coverageGaps.map((item) => item.trim()).filter(Boolean),
    nextActions: parsed.nextActions.map((item) => item.trim()).filter(Boolean)
  };
}

export async function findDedupeCandidates(input: {
  selectedModel: DeepSeekModel;
  apiKey: string;
  questions: Array<{ id: string; questionText: string }>;
  callModel?: CallModel;
}): Promise<{ candidates: DedupeCandidateRecord[] }> {
  const responseText = await (input.callModel ?? callDeepSeek)({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content:
          "Find semantically similar interview questions. Return strict JSON with a candidates array. Each item needs questionAId, questionBId, reason, confidence, recommendedAction."
      },
      {
        role: "user",
        content: [
          "从下面的问题列表中找出问法接近、语义相似的候选重复题。",
          "不要自动删除，只输出候选。",
          "recommendedAction 用简短英文，如 merge 或 keep-both。",
          "只返回 JSON。",
          JSON.stringify(input.questions, null, 2)
        ].join("\n\n")
      }
    ]
  });

  const parsed = dedupeCandidatesSchema.parse(JSON.parse(stripCodeFence(responseText)));
  return {
    candidates: parsed.candidates.map((item) => ({
      ...item,
      confidence: typeof item.confidence === "number" ? `${item.confidence}` : item.confidence.trim()
    }))
  };
}

function stripCodeFence(value: string): string {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
}

function toResumeContextText(
  resumeContext:
    | {
        fileName: string;
        originalText: string;
        candidateSummary: string;
        strongSkills: string[];
        personalAdvantages: string[];
        workExperience: string[];
        projectHighlights: string[];
        riskPoints: string[];
      }
    | undefined
) {
  if (!resumeContext) {
    return "没有可用简历，请严格基于已有面试问题给建议，不要编造经历。";
  }

  return [
    `简历文件：${resumeContext.fileName}`,
    `候选人定位：${resumeContext.candidateSummary}`,
    `擅长技能：${resumeContext.strongSkills.join("、") || "无"}`,
    `个人优势：${resumeContext.personalAdvantages.join("、") || "无"}`,
    `工作经历：${resumeContext.workExperience.join("；") || "无"}`,
    `项目亮点：${resumeContext.projectHighlights.join("；") || "无"}`,
    `风险点：${resumeContext.riskPoints.join("；") || "无"}`,
    "简历原文：",
    resumeContext.originalText.slice(0, 2000)
  ].join("\n");
}
