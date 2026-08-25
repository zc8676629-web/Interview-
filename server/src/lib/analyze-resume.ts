import { z } from "zod";

import type { AnalysisQuestionDraft, DeepSeekModel, PersonaProfile, QuestionCategory } from "./app-state.js";
import { callDeepSeek } from "./deepseek-client.js";

const questionSchema = z.union([
  z.string().min(1),
  z.object({
    questionText: z.string().min(1).optional(),
    question: z.string().min(1).optional(),
    category: z.enum(["人事问题", "项目问题", "技术问题", "业务问题", "其他"]).optional(),
    tags: z.array(z.string().min(1)).optional()
  })
]);

const analysisSchema = z.object({
  persona: z.object({
    candidateSummary: z.string().min(1),
    strongSkills: z.array(z.string().min(1)),
    personalAdvantages: z.array(z.string().min(1)),
    workExperience: z.array(z.string().min(1)),
    projectHighlights: z.array(z.string().min(1)),
    riskPoints: z.array(z.string().min(1))
  }),
  interviewQuestions: z.array(questionSchema).min(1)
});

const expandQuestionsSchema = z.object({
  interviewQuestions: z.array(questionSchema).min(1)
});

export async function analyzeResume(input: {
  extractedText: string;
  selectedModel: DeepSeekModel;
  apiKey: string;
  callModel?: (args: {
    apiKey: string;
    model: DeepSeekModel;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }) => Promise<string>;
}): Promise<{ persona: PersonaProfile; interviewQuestions: AnalysisQuestionDraft[] }> {
  const callModel = input.callModel ?? callDeepSeek;
  const responseText = await callModel({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content:
          "You analyze resumes. Return strict JSON with keys persona and interviewQuestions. persona must be an object with candidateSummary, strongSkills, personalAdvantages, workExperience, projectHighlights, riskPoints. interviewQuestions must be an array of objects with questionText, category, tags. category must be one of 人事问题, 项目问题, 技术问题, 业务问题. tags must be 1 to 3 concise Chinese tags."
      },
      {
        role: "user",
        content: [
          "Analyze the following resume text.",
          "Generate Chinese output.",
          "candidateSummary should be concise but useful.",
          "All persona arrays should list grounded resume facts, not generic filler.",
          "Generate 12 to 15 interview questions grounded in the resume content.",
          "Cover multiple angles, including HR, project, technical, business, and follow-up risk questions when possible.",
          "Avoid using category 其他 unless the question is truly impossible to classify.",
          "Every interview question must include 1 to 3 useful Chinese tags.",
          "Return JSON only.",
          input.extractedText
        ].join("\n\n")
      }
    ]
  });

  const normalized = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  const parsed = analysisSchema.parse(JSON.parse(normalized));

  return {
    persona: {
      candidateSummary: parsed.persona.candidateSummary.trim(),
      strongSkills: parsed.persona.strongSkills.map((item) => item.trim()).filter(Boolean),
      personalAdvantages: parsed.persona.personalAdvantages.map((item) => item.trim()).filter(Boolean),
      workExperience: parsed.persona.workExperience.map((item) => item.trim()).filter(Boolean),
      projectHighlights: parsed.persona.projectHighlights.map((item) => item.trim()).filter(Boolean),
      riskPoints: parsed.persona.riskPoints.map((item) => item.trim()).filter(Boolean)
    },
    interviewQuestions: dedupeQuestions(parsed.interviewQuestions.map(normalizeQuestionDraft))
  };
}

export async function expandResumeInterviewQuestions(input: {
  extractedText: string;
  existingQuestions: string[];
  focus?: QuestionCategory;
  selectedModel: DeepSeekModel;
  apiKey: string;
  callModel?: (args: {
    apiKey: string;
    model: DeepSeekModel;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }) => Promise<string>;
}): Promise<AnalysisQuestionDraft[]> {
  const callModel = input.callModel ?? callDeepSeek;
  const responseText = await callModel({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content:
          "You expand resume interview questions. Return strict JSON only with key interviewQuestions. interviewQuestions must be an array of objects with questionText, category, tags. category must be one of 人事问题, 项目问题, 技术问题, 业务问题. tags must be 1 to 3 concise Chinese tags."
      },
      {
        role: "user",
        content: [
          "Generate 8 additional Chinese interview questions based on the resume text below.",
          `Focus first on this angle: ${input.focus ?? "综合补充"}.`,
          "Questions must stay grounded in the resume.",
          "Do not repeat, paraphrase, or lightly rewrite any existing question.",
          "Prefer under-covered angles such as business understanding, technical depth, project ownership, collaboration, metrics, and risk follow-up.",
          "Avoid using category 其他 unless the question is truly impossible to classify.",
          "Every interview question must include 1 to 3 useful Chinese tags.",
          "Return JSON only.",
          "Existing questions:",
          JSON.stringify(input.existingQuestions, null, 2),
          "Resume text:",
          input.extractedText
        ].join("\n\n")
      }
    ]
  });

  const normalized = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  const parsed = expandQuestionsSchema.parse(JSON.parse(normalized));
  const existingQuestionSet = new Set(input.existingQuestions.map(normalizeQuestionText));

  return dedupeQuestions(parsed.interviewQuestions.map(normalizeQuestionDraft)).filter(
    (item) => !existingQuestionSet.has(normalizeQuestionText(item.questionText))
  );
}

export async function testDeepSeekConnectivity(input: {
  apiKey: string;
  selectedModel: DeepSeekModel;
  callModel?: (args: {
    apiKey: string;
    model: DeepSeekModel;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }) => Promise<string>;
}): Promise<void> {
  const callModel = input.callModel ?? callDeepSeek;
  await callModel({
    apiKey: input.apiKey,
    model: input.selectedModel,
    messages: [
      {
        role: "system",
        content: "Return the word ok."
      },
      {
        role: "user",
        content: "Test API connectivity."
      }
    ]
  });
}

function normalizeQuestionDraft(input: z.infer<typeof questionSchema>): AnalysisQuestionDraft {
  if (typeof input === "string") {
    const questionText = input.trim();
    return {
      questionText,
      category: inferQuestionCategory(questionText),
      tags: inferQuestionTags(questionText)
    };
  }

  const questionText = (input.questionText ?? input.question ?? "").trim();
  const category = normalizeCategory(input.category, questionText);
  const providedTags = Array.from(new Set((input.tags ?? []).map((item) => item.trim()).filter(Boolean)));

  return {
    questionText,
    category,
    tags: providedTags.length > 0 ? providedTags : inferQuestionTags(questionText, category)
  };
}

function dedupeQuestions(input: AnalysisQuestionDraft[]): AnalysisQuestionDraft[] {
  const seen = new Set<string>();

  return input.filter((item) => {
    const questionText = normalizeQuestionText(item.questionText);
    if (!questionText || seen.has(questionText)) {
      return false;
    }

    seen.add(questionText);
    return true;
  });
}

function normalizeQuestionText(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

function normalizeCategory(input: QuestionCategory | undefined, questionText: string): QuestionCategory {
  if (input && input !== "其他") {
    return input;
  }

  return inferQuestionCategory(questionText);
}

function inferQuestionCategory(questionText: string): QuestionCategory {
  const text = questionText.trim();
  if (!text) {
    return "其他";
  }

  if (matchesKeyword(text, HR_KEYWORDS)) {
    return "人事问题";
  }
  if (matchesKeyword(text, BUSINESS_KEYWORDS)) {
    return "业务问题";
  }
  if (matchesKeyword(text, TECH_KEYWORDS)) {
    return "技术问题";
  }
  if (matchesKeyword(text, PROJECT_KEYWORDS)) {
    return "项目问题";
  }

  return "其他";
}

function inferQuestionTags(questionText: string, category?: QuestionCategory): string[] {
  const tags = new Set<string>();
  const text = questionText.trim();

  for (const [tag, pattern] of TAG_RULES) {
    if (pattern.test(text)) {
      tags.add(tag);
    }
  }

  if (tags.size === 0) {
    const inferredCategory = category && category !== "其他" ? category : inferQuestionCategory(text);
    if (inferredCategory === "人事问题") tags.add("求职动机");
    if (inferredCategory === "项目问题") tags.add("项目经历");
    if (inferredCategory === "技术问题") tags.add("技术细节");
    if (inferredCategory === "业务问题") tags.add("业务理解");
  }

  return Array.from(tags).slice(0, 3);
}

function matchesKeyword(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

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
