import type {
  AnalysisRecord,
  AnswerRecord,
  DedupeCandidateRecord,
  HighFrequencyQuestionRecord,
  InterviewRecord,
  InterviewSessionRecord,
  PrepInsightRecord,
  QuestionRecord,
  ResumeRecord
} from "../lib/api";
import type { WorkspacePage } from "./WorkspaceNav";

interface WorkspaceOverviewPageProps {
  resumes?: ResumeRecord[];
  interviews?: InterviewRecord[];
  questions?: QuestionRecord[];
  answers?: AnswerRecord[];
  analyses: AnalysisRecord[];
  sessions: InterviewSessionRecord[];
  highFrequencyQuestions: HighFrequencyQuestionRecord[];
  dedupeCandidates: DedupeCandidateRecord[];
  prepInsight: PrepInsightRecord | null;
  generatingPrepInsight: boolean;
  onGeneratePrepInsight(): void;
  onNavigate(page: WorkspacePage): void;
}

export function WorkspaceOverviewPage(props: WorkspaceOverviewPageProps) {
  const effectiveResumes = props.resumes ?? [];
  const effectiveInterviews = props.interviews ?? [];
  const effectiveQuestions = props.questions ?? [];
  const effectiveAnswers = props.answers ?? [];
  const totalSessionQuestions =
    effectiveInterviews.length > 0
      ? effectiveInterviews.reduce((sum, interview) => sum + interview.occurrences.filter((item) => !item.deletedAt).length, 0)
      : props.sessions.reduce((sum, session) => sum + session.questions.length, 0);
  const answeredQuestionCount =
    effectiveAnswers.length > 0
      ? effectiveAnswers.filter((item) => item.isCurrent && !item.deletedAt).length
      : props.sessions.reduce(
          (sum, session) => sum + session.questions.filter((question) => question.answerSuggestion.trim()).length,
          0
        ) +
        props.highFrequencyQuestions.filter((question) => question.answerSuggestion.trim()).length;
  const pendingHighFrequencyCount =
    effectiveQuestions.length > 0
      ? effectiveQuestions.filter((question) => !question.currentAnswerId && !question.deletedAt).length
      : props.highFrequencyQuestions.filter((question) => !question.answerSuggestion.trim()).length;
  const canGenerateInsight =
    props.analyses.length > 0 || props.sessions.length > 0 || props.highFrequencyQuestions.length > 0;

  const todos = [
    (effectiveResumes.length === 0 && props.analyses.length === 0)
      ? {
          id: "resume",
          title: "先补简历画像",
          detail: "还没有简历画像，后面的预测题和回答会偏空。",
          page: "resume" as WorkspacePage
        }
      : null,
    (effectiveInterviews.length === 0 && props.sessions.length === 0)
      ? {
          id: "sessions",
          title: "先录最近一场面试",
          detail: "先沉淀真实样本，再去做统一题库。",
          page: "interview-sessions" as WorkspacePage
        }
      : null,
    pendingHighFrequencyCount > 0
      ? {
          id: "answers",
          title: `还有 ${pendingHighFrequencyCount} 道题没回答稿`,
          detail: "先补高频题的回答，这部分复用价值最高。",
          page: "high-frequency" as WorkspacePage
        }
      : null,
    props.dedupeCandidates.length > 0
      ? {
          id: "dedupe",
          title: `有 ${props.dedupeCandidates.length} 组重复题待确认`,
          detail: "先清掉重复题，避免题库继续变乱。",
          page: "high-frequency" as WorkspacePage
        }
      : null
  ].filter(Boolean);

  return (
    <section className="overview-stack">
      <article className="panel overview-guide-panel">
        <div className="panel-header overview-hero-header">
          <div>
            <h2>作战总览</h2>
            <p className="muted">这页主要看数据、缺口和备战建议。全局检索已经抽到欢迎区下方，任意页面都能直接使用。</p>
          </div>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={() => props.onNavigate("guide")}>
              查看使用教程
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={props.onGeneratePrepInsight}
              disabled={props.generatingPrepInsight || !canGenerateInsight}
            >
              {props.generatingPrepInsight ? "正在生成 AI 备战建议..." : "生成 AI 备战建议"}
            </button>
          </div>
        </div>
        <div className="overview-metric-grid overview-compact-metrics">
          <div className="overview-metric-card">
            <span className="summary-label">简历画像</span>
            <strong>{`${(effectiveResumes.length || props.analyses.length).toString()} 条`}</strong>
            <span className="meta">当前沉淀的简历版本</span>
          </div>
          <div className="overview-metric-card">
            <span className="summary-label">面试场次</span>
            <strong>{`${(effectiveInterviews.length || props.sessions.length).toString()} 场`}</strong>
            <span className="meta">真实面试记录数量</span>
          </div>
          <div className="overview-metric-card">
            <span className="summary-label">高频问题</span>
            <strong>{`${props.highFrequencyQuestions.length} 道`}</strong>
            <span className="meta">已统一沉淀的问题</span>
          </div>
          <div className="overview-metric-card">
            <span className="summary-label">已有回答</span>
            <strong>{`${answeredQuestionCount} 道`}</strong>
            <span className="meta">当前可直接复盘的回答稿</span>
          </div>
          <div className="overview-metric-card">
            <span className="summary-label">场次问题</span>
            <strong>{`${totalSessionQuestions} 道`}</strong>
            <span className="meta">来自真实面试的问题数</span>
          </div>
          <div className="overview-metric-card">
            <span className="summary-label">待确认重复题</span>
            <strong>{`${props.dedupeCandidates.length} 组`}</strong>
            <span className="meta">建议尽快处理的重复项</span>
          </div>
        </div>
      </article>

      <div className="overview-secondary-grid">
        <article className="panel overview-panel focus-panel">
          <div className="panel-header compact-header">
            <div>
              <h3>现在建议先做什么</h3>
              <p className="muted">只做最值钱的下一步，不需要每个页面一起推进。</p>
            </div>
          </div>
          {todos.length === 0 ? (
            <p className="muted">当前没有明显缺口，可以继续补题、补回答，或者生成一份新的 AI 备战建议。</p>
          ) : (
            <div className="overview-todo-list">
              {todos.map((item) =>
                item ? (
                  <button
                    key={item.id}
                    type="button"
                    className="overview-todo-card"
                    onClick={() => props.onNavigate(item.page)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </button>
                ) : null
              )}
            </div>
          )}
        </article>

        <article className="panel overview-panel prep-panel">
          <div className="panel-header compact-header">
            <div>
              <h3>AI 备战建议</h3>
              <p className="muted">等简历、场次和高频题有一定沉淀后，再让 AI 结合起来给你排序和建议。</p>
            </div>
          </div>
          {props.prepInsight ? (
            <div className="overview-insight-block">
              <p className="overview-summary">{props.prepInsight.summary}</p>
              <div className="overview-list-grid">
                <div className="overview-list-card">
                  <h4>优先准备</h4>
                  <ul>
                    {props.prepInsight.priorities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="overview-list-card">
                  <h4>当前缺口</h4>
                  <ul>
                    {props.prepInsight.coverageGaps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="overview-list-card">
                  <h4>下一步动作</h4>
                  <ul>
                    {props.prepInsight.nextActions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="muted">{`最近生成于 ${new Date(props.prepInsight.generatedAt).toLocaleString()}`}</p>
            </div>
          ) : (
            <p className="muted">还没有 AI 备战建议。建议至少先有一份简历画像，或者先录入一场真实面试，再来生成这部分内容。</p>
          )}
        </article>
      </div>
    </section>
  );
}
