import { useDeferredValue, useMemo, useState } from "react";

import type {
  AnswerRecord,
  HighFrequencyQuestionRecord,
  InterviewSessionRecord,
  QuestionRecord,
  ResumeRecord
} from "../lib/api";
import type { WorkspacePage } from "./WorkspaceNav";

type GlobalSearchNavigationTarget = {
  page: WorkspacePage;
  resumeId?: string;
  sessionId?: string;
  questionId?: string;
  predictionId?: string;
};

interface GlobalSearchPanelProps {
  resumes?: ResumeRecord[];
  questions?: QuestionRecord[];
  answers?: AnswerRecord[];
  sessions: InterviewSessionRecord[];
  highFrequencyQuestions: HighFrequencyQuestionRecord[];
  onNavigate(target: GlobalSearchNavigationTarget): void;
}

export function GlobalSearchPanel(props: GlobalSearchPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const effectiveResumes = props.resumes ?? [];
  const effectiveQuestions = props.questions ?? [];
  const effectiveAnswers = props.answers ?? [];

  const searchResults = useMemo(() => {
    if (!deferredQuery) {
      return {
        resumes: [] as ResumeRecord[],
        sessions: [] as InterviewSessionRecord[],
        questions: [] as Array<
          | {
              id: string;
              title: string;
              subtitle: string;
              page: "resume";
              resumeId: string;
              predictionId: string;
            }
          | {
              id: string;
              title: string;
              subtitle: string;
              page: "interview-sessions";
              sessionId: string;
              questionId: string;
            }
          | {
              id: string;
              title: string;
              subtitle: string;
              page: "high-frequency";
              questionId: string;
            }
        >
      };
    }

    const normalized = deferredQuery.toLowerCase();
    const currentAnswerMap = new Map(
      effectiveQuestions
        .filter((question) => question.currentAnswerId)
        .map((question) => [
          question.id,
          effectiveAnswers.find(
            (answer) => answer.id === question.currentAnswerId && answer.isCurrent && !answer.deletedAt
          )?.content ?? ""
        ])
    );
    const resumes = effectiveResumes
      .filter(
        (resume) =>
          resume.displayName.toLowerCase().includes(normalized) ||
          resume.profile.candidateSummary.toLowerCase().includes(normalized) ||
          resume.predictedQuestions.some(
            (question) =>
              question.questionText.toLowerCase().includes(normalized) ||
              question.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
              (question.linkedQuestionId ? (currentAnswerMap.get(question.linkedQuestionId) ?? "").toLowerCase().includes(normalized) : false)
          )
      )
      .slice(0, 4);
    const sessions = props.sessions
      .filter((session) => {
        if (session.title.toLowerCase().includes(normalized)) return true;
        if (session.sourceText.toLowerCase().includes(normalized)) return true;
        return session.questions.some(
          (question) =>
            question.questionText.toLowerCase().includes(normalized) ||
            question.answerSuggestion.toLowerCase().includes(normalized) ||
            question.tags.some((tag) => tag.toLowerCase().includes(normalized))
        );
      })
      .slice(0, 6);
    const questions = [
      ...effectiveResumes.flatMap((resume) =>
        resume.predictedQuestions
          .filter((question) => {
            const answerText = question.linkedQuestionId ? currentAnswerMap.get(question.linkedQuestionId) ?? "" : "";
            return (
              question.questionText.toLowerCase().includes(normalized) ||
              question.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
              answerText.toLowerCase().includes(normalized)
            );
          })
          .map((question) => ({
            id: `resume-${resume.id}-${question.id}`,
            title: question.questionText,
            subtitle: `${resume.displayName} · 简历预测题`,
            page: "resume" as const,
            resumeId: resume.id,
            predictionId: question.id
          }))
      ),
      ...props.sessions.flatMap((session) =>
        session.questions
          .filter(
            (question) =>
              question.questionText.toLowerCase().includes(normalized) ||
              question.answerSuggestion.toLowerCase().includes(normalized) ||
              question.tags.some((tag) => tag.toLowerCase().includes(normalized))
          )
          .map((question) => ({
            id: `session-${session.id}-${question.id}`,
            title: question.questionText,
            subtitle: `${session.title} · 面试场次题`,
            page: "interview-sessions" as const,
            sessionId: session.id,
            questionId: question.id
          }))
      ),
      ...props.highFrequencyQuestions
        .filter(
          (question) =>
            question.questionText.toLowerCase().includes(normalized) ||
            question.answerSuggestion.toLowerCase().includes(normalized) ||
            question.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
            question.sourceSessionTitles.some((title) => title.toLowerCase().includes(normalized))
        )
        .map((question) => ({
          id: `high-frequency-${question.id}`,
          title: question.questionText,
          subtitle: `${question.category} · 高频题库`,
          page: "high-frequency" as const,
          questionId: question.id
        }))
    ].slice(0, 8);

    return {
      resumes,
      sessions,
      questions
    };
  }, [deferredQuery, effectiveAnswers, effectiveQuestions, effectiveResumes, props.highFrequencyQuestions, props.sessions]);

  return (
    <section className="panel overview-panel global-search-panel">
      <div className="panel-header compact-header">
        <div>
          <h2>全局检索</h2>
          <p className="muted">放在欢迎区下方，任意页面都能直接搜，适合先定位旧场次、旧题目和已有回答。</p>
        </div>
      </div>
      <label className="field">
        <span>关键词</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索简历、场次、题目、回答或标签" />
      </label>
      {deferredQuery ? (
        <div className="overview-search-grid">
          <div className="overview-search-column">
            <div className="panel-header compact-header">
              <h4>命中简历</h4>
              <span className="muted">{`${searchResults.resumes.length} 条`}</span>
            </div>
            {searchResults.resumes.length === 0 ? (
              <p className="muted">没有命中简历。</p>
            ) : (
              <div className="overview-search-list">
                {searchResults.resumes.map((resume) => (
                  <button
                    key={resume.id}
                    type="button"
                    className="overview-search-card"
                    onClick={() => props.onNavigate({ page: "resume", resumeId: resume.id })}
                  >
                    <strong>{resume.displayName}</strong>
                    <span>{resume.isPrimary ? "当前用于 AI 回答" : `版本 V${resume.version}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="overview-search-column">
            <div className="panel-header compact-header">
              <h4>命中场次</h4>
              <span className="muted">{`${searchResults.sessions.length} 条`}</span>
            </div>
            {searchResults.sessions.length === 0 ? (
              <p className="muted">没有命中场次。</p>
            ) : (
              <div className="overview-search-list">
                {searchResults.sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className="overview-search-card"
                    onClick={() => props.onNavigate({ page: "interview-sessions", sessionId: session.id })}
                  >
                    <strong>{session.title}</strong>
                    <span>{`${session.questions.length} 个问题`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="overview-search-column">
            <div className="panel-header compact-header">
              <h4>命中问题</h4>
              <span className="muted">{`${searchResults.questions.length} 条`}</span>
            </div>
            {searchResults.questions.length === 0 ? (
              <p className="muted">没有命中问题。</p>
            ) : (
              <div className="overview-search-list">
                {searchResults.questions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    className="overview-search-card"
                    onClick={() =>
                      props.onNavigate(
                        question.page === "resume"
                          ? {
                              page: "resume",
                              resumeId: question.resumeId,
                              predictionId: question.predictionId
                            }
                          : question.page === "interview-sessions"
                            ? {
                                page: "interview-sessions",
                                sessionId: question.sessionId,
                                questionId: question.questionId
                              }
                            : {
                                page: "high-frequency",
                                questionId: question.questionId
                              }
                      )
                    }
                  >
                    <strong>{question.title}</strong>
                    <span>{question.subtitle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="muted">输入关键词后，系统会同时在简历、面试场次和高频题里一起找。</p>
      )}
    </section>
  );
}
