import { useEffect, useMemo, useState } from "react";

import {
  addQuestionsToHighFrequency,
  createInterviewSession,
  deleteInterviewSession,
  extractInterviewQuestions,
  fetchBootstrap,
  generateInterviewAnswers,
  updateInterviewSessionQuestions,
  type BootstrapPayload,
  type HighFrequencyQuestionRecord,
  type InterviewQuestionRecord,
  type InterviewSessionRecord,
  type QuestionCategory,
  type ResumeRecord
} from "../lib/api";

interface InterviewSessionsPageProps {
  sessions: InterviewSessionRecord[];
  resumes?: ResumeRecord[];
  onBootstrapSync(next: BootstrapPayload): void;
  onSessionsChange(next: InterviewSessionRecord[]): void;
  onHighFrequencyChange(next: HighFrequencyQuestionRecord[]): void;
  onMessage(message: string): void;
  requestedSessionId?: string;
  requestedQuestionId?: string;
  navigationNonce?: number;
}

const FILTERS: Array<{ id: "全部" | QuestionCategory; label: string }> = [
  { id: "全部", label: "全部" },
  { id: "人事问题", label: "人事" },
  { id: "项目问题", label: "项目" },
  { id: "技术问题", label: "技术" },
  { id: "业务问题", label: "业务" },
  { id: "其他", label: "其他" }
];

export function InterviewSessionsPage(props: InterviewSessionsPageProps) {
  const sessions = props.sessions ?? [];
  const [activeId, setActiveId] = useState<string | null>(sessions[0]?.id ?? null);
  const [showCreator, setShowCreator] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState(
    props.resumes?.find((item) => item.isPrimary)?.id ?? props.resumes?.[0]?.id ?? ""
  );
  const [draftQuestions, setDraftQuestions] = useState<InterviewQuestionRecord[]>([]);
  const [creatorBusy, setCreatorBusy] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [filter, setFilter] = useState<"全部" | QuestionCategory>("全部");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingCategory, setEditingCategory] = useState<QuestionCategory>("人事问题");
  const [editingTagsText, setEditingTagsText] = useState("");
  const [editingAnswerSuggestion, setEditingAnswerSuggestion] = useState("");
  const defaultResumeId = primaryResumeId(props.resumes);

  useEffect(() => {
    if (!sessions.length) {
      setActiveId(null);
      return;
    }

    if (!activeId || !sessions.some((item) => item.id === activeId)) {
      setActiveId(sessions[0].id);
    }
  }, [activeId, sessions]);

  useEffect(() => {
    if (!props.requestedSessionId) {
      return;
    }

    if (sessions.some((item) => item.id === props.requestedSessionId)) {
      setActiveId(props.requestedSessionId);
    }
  }, [props.navigationNonce, props.requestedSessionId, sessions]);

  const active = useMemo(
    () => sessions.find((item) => item.id === activeId) ?? sessions[0] ?? null,
    [activeId, sessions]
  );
  const primaryResume = useMemo(
    () => (props.resumes ?? []).find((item) => item.isPrimary && !item.deletedAt) ?? (props.resumes ?? [])[0] ?? null,
    [props.resumes]
  );

  useEffect(() => {
    if (!showCreator) {
      return;
    }

    if (!selectedResumeId || !(props.resumes ?? []).some((resume) => resume.id === selectedResumeId)) {
      setSelectedResumeId(defaultResumeId);
    }
  }, [defaultResumeId, props.resumes, selectedResumeId, showCreator]);

  useEffect(() => {
    if (!props.requestedQuestionId || active?.id !== props.requestedSessionId) {
      return;
    }

    setFilter("全部");
    window.setTimeout(() => {
      document.getElementById(`session-question-${props.requestedQuestionId}`)?.scrollIntoView?.({
        block: "center",
        behavior: "smooth"
      });
    }, 0);
  }, [active?.id, props.navigationNonce, props.requestedQuestionId, props.requestedSessionId]);

  const filteredQuestions = useMemo(() => {
    if (!active) return [];
    if (filter === "全部") return active.questions;
    return active.questions.filter((item) => item.category === filter);
  }, [active, filter]);

  async function handleExtract() {
    setCreatorBusy(true);
    props.onMessage("正在整理本场面试问题...");
    try {
      const result = await extractInterviewQuestions({
        title,
        sourceText,
        sourceType: "text"
      });
      setDraftQuestions(result.questions ?? []);
      props.onMessage("面试问题已整理，请确认后保存");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "整理失败");
    } finally {
      setCreatorBusy(false);
    }
  }

  async function handleSaveSession() {
    setCreatorBusy(true);
    props.onMessage("正在保存面试场次...");
    try {
      const saved = await createInterviewSession({
        title,
        sourceType: "text",
        sourceText,
        resumeId: selectedResumeId || null,
        questions: draftQuestions
      });
      props.onSessionsChange([saved, ...sessions]);
      setActiveId(saved.id);
      setShowCreator(false);
      setTitle("");
      setSourceText("");
      setSelectedResumeId(defaultResumeId);
      setDraftQuestions([]);
      props.onMessage("面试场次已保存");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setCreatorBusy(false);
    }
  }

  async function handleGenerateAnswer(questionId: string) {
    if (!active) return;

    setBusyAction(`answer:${questionId}`);
    props.onMessage("正在结合当前已使用简历生成口语化回答稿...");
    try {
      const updated = await generateInterviewAnswers(active.id, [questionId]);
      props.onSessionsChange(sessions.map((item) => (item.id === updated.session.id ? updated.session : item)));
      props.onHighFrequencyChange(updated.highFrequencyQuestions);
      props.onMessage("这道题的 AI 回答建议已生成");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAddToHighFrequency(questionId: string) {
    if (!active) return;

    setBusyAction(`high-frequency:${questionId}`);
    props.onMessage("正在加入高频问题库...");
    try {
      const result = await addQuestionsToHighFrequency(active.id, [questionId]);
      props.onSessionsChange(sessions.map((item) => (item.id === result.session.id ? result.session : item)));
      props.onHighFrequencyChange(result.highFrequencyQuestions);
      props.onMessage("这道题已加入高频问题库");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "加入失败");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteSession(sessionId: string, sessionTitle: string) {
    if (!window.confirm(`确定删除“${sessionTitle}”吗？`)) return;

    setBusyAction(`delete-session:${sessionId}`);
    props.onMessage("正在删除该场面试...");
    try {
      await deleteInterviewSession(sessionId);
      const payload = await fetchBootstrap();
      props.onBootstrapSync(payload);
      props.onMessage("面试场次已删除");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setBusyAction("");
    }
  }

  function startEditQuestion(question: InterviewQuestionRecord) {
    setEditingQuestionId(question.id);
    setEditingQuestionText(question.questionText);
    setEditingCategory(question.category);
    setEditingTagsText(question.tags.join(", "));
    setEditingAnswerSuggestion(question.answerSuggestion);
  }

  function cancelEditQuestion() {
    setEditingQuestionId(null);
    setEditingQuestionText("");
    setEditingCategory("人事问题");
    setEditingTagsText("");
    setEditingAnswerSuggestion("");
  }

  async function handleSaveQuestion() {
    if (!active || !editingQuestionId) return;

    const nextQuestions = active.questions.map((question) =>
      question.id === editingQuestionId
        ? {
            ...question,
            questionText: editingQuestionText.trim(),
            category: editingCategory,
            tags: editingTagsText
              .split(/[，,]/)
              .map((item) => item.trim())
              .filter(Boolean),
            answerSuggestion: editingAnswerSuggestion.trim()
          }
        : question
    );

    setBusyAction(`save-question:${editingQuestionId}`);
    props.onMessage("正在保存问题修改...");
    try {
      const updated = await updateInterviewSessionQuestions(active.id, nextQuestions);
      props.onSessionsChange(sessions.map((item) => (item.id === updated.session.id ? updated.session : item)));
      props.onHighFrequencyChange(updated.highFrequencyQuestions);
      cancelEditQuestion();
      props.onMessage("问题修改已保存");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "保存问题失败");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <section className="panel panel-wide session-panel">
      <div className="panel-header">
        <div>
          <span className="panel-section-kicker">Sessions</span>
          <h2>场次指挥台</h2>
          <p className="muted">整理每一场真实面试的问题，把场次、问题和回答稿沉淀成一套长期可管理的本地资产。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setShowCreator((value) => !value)}>
          {showCreator ? "收起新建表单" : "新建面试场次"}
        </button>
      </div>
      {showCreator ? (
        <article className="result-block form-card">
          <label className="field">
            <span>本场面试标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：XXX一面" />
          </label>
          <label className="field">
            <span>面试文本</span>
            <textarea
              className="large-textarea"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="粘贴本场面试文本"
            />
          </label>
          <label className="field">
            <span>关联简历记录（可选）</span>
            <select value={selectedResumeId} onChange={(event) => setSelectedResumeId(event.target.value)}>
              <option value="">不绑定简历</option>
              {(props.resumes ?? []).map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.isPrimary ? `${resume.displayName}（当前用于 AI 回答）` : resume.displayName}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">这里只做场次归档关联。后续 AI 回答统一使用简历分析页里当前已选的那一份简历。</p>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={handleExtract} disabled={creatorBusy}>
              {creatorBusy ? "正在整理..." : "AI整理问题"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleSaveSession}
              disabled={creatorBusy || draftQuestions.length === 0}
            >
              {creatorBusy ? "处理中..." : "确认保存"}
            </button>
          </div>
          <h3>待确认问题清单</h3>
          {draftQuestions.length === 0 ? (
            <p className="muted">先输入标题和面试文本，再点击“AI整理问题”。</p>
          ) : (
            <ol className="draft-question-list">
              {draftQuestions.map((question) => (
                <li key={question.id}>
                  <strong>{question.questionText}</strong>
                  <span>{question.category}</span>
                </li>
              ))}
            </ol>
          )}
        </article>
      ) : null}
      <div className="analysis-layout session-layout">
        <aside className="history-list session-history">
          <div className="history-title-row">
            <h3>场次侧栏</h3>
            <span className="history-count">{sessions.length}</span>
          </div>
          <p className="muted history-side-note">先在左侧切场次，再在右侧做筛选、生成回答、加入题库和编辑。</p>
          {sessions.length === 0 ? (
            <p className="muted">还没有保存的面试场次。点击右上角“新建面试场次”开始。</p>
          ) : (
            <div className="history-list-scroll-region" role="region" aria-label="场次侧栏列表">
              <div className="history-list-items">
                {sessions.map((session) => (
                  <article key={session.id} className={session.id === active?.id ? "history-entry active" : "history-entry"}>
                    <button
                      type="button"
                      className={session.id === active?.id ? "history-item active" : "history-item"}
                      onClick={() => setActiveId(session.id)}
                    >
                      <strong>{session.title}</strong>
                      <span>{new Date(session.createdAt).toLocaleString()}</span>
                      <span>{`${session.questions.length} 个问题`}</span>
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger-ghost-button history-delete-button"
                      onClick={() => handleDeleteSession(session.id, session.title)}
                      disabled={busyAction !== ""}
                    >
                      {busyAction === `delete-session:${session.id}` ? "删除中..." : "删除场次"}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
        <div className="result-sections">
          {active ? (
            <>
              <div className="toolbar-card">
                <div className="toolbar-heading">
                  <div>
                    <h3>{active.title}</h3>
                    <p className="muted">
                      {primaryResume ? `当前 AI 回答依据：${primaryResume.displayName}` : "当前还没有可用的 AI 回答依据简历"}
                    </p>
                  </div>
                  <span className="panel-meta-chip">{`${active.questions.length} 个问题`}</span>
                </div>
                <div className="filter-toolbar">
                  <span className="filter-caption">筛选</span>
                  <div className="filter-row" role="tablist" aria-label="问题分类筛选">
                    {FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={filter === item.id ? "filter-chip active" : "filter-chip"}
                        onClick={() => setFilter(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <article className="result-block session-summary-card">
                <h3>{active.title}</h3>
                <p className="meta">{`共 ${active.questions.length} 个问题，当前筛选后 ${filteredQuestions.length} 个。`}</p>
                <p>{active.sourceText.slice(0, 400) || "暂无原始文本"}</p>
              </article>
              <article className="result-block">
                <div className="panel-header compact-header">
                  <h3>本场问题</h3>
                  <span className="muted">支持筛选、单题生成回答、加入题库和编辑</span>
                </div>
                {filteredQuestions.length === 0 ? (
                  <p className="muted">当前分类下还没有问题。</p>
                ) : (
                  <div className="question-list-scroll-region" role="region" aria-label="本场问题列表">
                    <div className="question-list">
                      {filteredQuestions.map((question) => {
                        const editing = editingQuestionId === question.id;
                        return (
                          <article id={`session-question-${question.id}`} key={question.id} className="question-card editable">
                            <div className="question-card-top">
                              <span className="tag-pill">{question.category}</span>
                            </div>
                            {editing ? (
                              <div className="edit-form">
                                <label className="field">
                                  <span>问题内容</span>
                                  <textarea
                                    value={editingQuestionText}
                                    onChange={(event) => setEditingQuestionText(event.target.value)}
                                  />
                                </label>
                                <div className="edit-grid">
                                  <label className="field">
                                    <span>分类</span>
                                    <select
                                      value={editingCategory}
                                      onChange={(event) => setEditingCategory(event.target.value as QuestionCategory)}
                                    >
                                      <option value="人事问题">人事问题</option>
                                      <option value="项目问题">项目问题</option>
                                      <option value="技术问题">技术问题</option>
                                      <option value="业务问题">业务问题</option>
                                      <option value="其他">其他</option>
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>标签</span>
                                    <input
                                      value={editingTagsText}
                                      onChange={(event) => setEditingTagsText(event.target.value)}
                                      placeholder="多个标签用逗号分隔"
                                    />
                                  </label>
                                </div>
                                <label className="field">
                                  <span>回答内容</span>
                                  <textarea
                                    className="large-textarea"
                                    value={editingAnswerSuggestion}
                                    onChange={(event) => setEditingAnswerSuggestion(event.target.value)}
                                    placeholder="这里可以直接修改这道题的回答稿"
                                  />
                                </label>
                                <div className="action-row">
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={handleSaveQuestion}
                                    disabled={busyAction !== ""}
                                  >
                                    {busyAction === `save-question:${question.id}` ? "正在保存..." : "保存问题"}
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={cancelEditQuestion}
                                    disabled={busyAction !== ""}
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <strong>{question.questionText}</strong>
                                {question.tags.length ? (
                                  <div className="tag-row">
                                    {question.tags.map((tag) => (
                                      <span key={tag} className="tag-pill">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {question.answerSuggestion ? (
                                  <p className="answer-block">{question.answerSuggestion}</p>
                                ) : (
                                  <p className="muted">这道题还没有回答稿。</p>
                                )}
                                <div className="question-card-actions">
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => handleGenerateAnswer(question.id)}
                                    disabled={busyAction !== ""}
                                  >
                                    {busyAction === `answer:${question.id}` ? "正在生成回答..." : "AI回答建议"}
                                  </button>
                                  <button
                                    type="button"
                                    className="accent-button"
                                    onClick={() => handleAddToHighFrequency(question.id)}
                                    disabled={busyAction !== "" || Boolean(question.highFrequencyId)}
                                  >
                                    {busyAction === `high-frequency:${question.id}`
                                      ? "加入中..."
                                      : question.highFrequencyId
                                        ? "已加入高频题库"
                                        : "加入高频问题库"}
                                  </button>
                                  <button type="button" className="ghost-button" onClick={() => startEditQuestion(question)}>
                                    编辑问题
                                  </button>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            </>
          ) : (
            <p>暂无面试场次</p>
          )}
        </div>
      </div>
    </section>
  );
}

function primaryResumeId(resumes?: ResumeRecord[]) {
  return resumes?.find((item) => item.isPrimary && !item.deletedAt)?.id ?? resumes?.[0]?.id ?? "";
}
