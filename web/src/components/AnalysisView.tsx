import { useEffect, useMemo, useState } from "react";

import {
  addAnalysisQuestionsToHighFrequency,
  answerPredictedQuestion,
  deleteResume,
  expandAnalysisQuestions,
  fetchBootstrap,
  updateResume,
  type AnswerRecord,
  type BootstrapPayload,
  type QuestionCategory,
  type QuestionRecord,
  type ResumeRecord
} from "../lib/api";

interface AnalysisViewProps {
  resumes: ResumeRecord[];
  questions: QuestionRecord[];
  answers: AnswerRecord[];
  onBootstrapSync(next: BootstrapPayload): void;
  onResumesChange(next: ResumeRecord[]): void;
  onQuestionsChange(next: QuestionRecord[]): void;
  onAnswersChange(next: AnswerRecord[]): void;
  onMessage(message: string): void;
  requestedResumeId?: string;
  requestedPredictionId?: string;
  navigationNonce?: number;
}

const EXPAND_FOCUS_OPTIONS: Array<"全部" | QuestionCategory> = ["全部", "人事问题", "项目问题", "技术问题", "业务问题", "其他"];

export function AnalysisView(props: AnalysisViewProps) {
  const activeResumes = props.resumes.filter((item) => !item.deletedAt);
  const [activeId, setActiveId] = useState<string | null>(activeResumes[0]?.id ?? null);
  const [busyPrimaryId, setBusyPrimaryId] = useState("");
  const [busyPredictionId, setBusyPredictionId] = useState("");
  const [busyLibraryId, setBusyLibraryId] = useState("");
  const [expandingQuestions, setExpandingQuestions] = useState(false);
  const [expandFocus, setExpandFocus] = useState<"全部" | QuestionCategory>("全部");

  const active = useMemo(
    () => activeResumes.find((item) => item.id === activeId) ?? activeResumes[0] ?? null,
    [activeId, activeResumes]
  );
  const primaryResume = useMemo(
    () => activeResumes.find((item) => item.isPrimary) ?? activeResumes[0] ?? null,
    [activeResumes]
  );
  const linkedPredictionCount = active?.predictedQuestions.filter((item) => item.linkedQuestionId).length ?? 0;
  const answeredPredictionCount =
    active?.predictedQuestions.filter((item) => {
      if (!item.linkedQuestionId) {
        return false;
      }
      return Boolean(findCurrentAnswer(item.linkedQuestionId, props.questions, props.answers));
    }).length ?? 0;

  useEffect(() => {
    if (!props.requestedResumeId) {
      return;
    }

    if (activeResumes.some((item) => item.id === props.requestedResumeId)) {
      setActiveId(props.requestedResumeId);
    }
  }, [activeResumes, props.navigationNonce, props.requestedResumeId]);

  useEffect(() => {
    if (!props.requestedPredictionId || active?.id !== props.requestedResumeId) {
      return;
    }

    window.setTimeout(() => {
      document.getElementById(`prediction-${props.requestedPredictionId}`)?.scrollIntoView?.({
        block: "center",
        behavior: "smooth"
      });
    }, 0);
  }, [active?.id, props.navigationNonce, props.requestedPredictionId, props.requestedResumeId]);

  async function activateResumeForAi(resume: ResumeRecord) {
    const result = await updateResume(resume.id, { isPrimary: true });
    props.onResumesChange(
      props.resumes.map((item) => ({
        ...item,
        isPrimary: item.id === result.resume.id ? result.resume.isPrimary : false
      }))
    );
    return result.resume;
  }

  async function handleSetPrimary(resume: ResumeRecord) {
    setBusyPrimaryId(resume.id);
    props.onMessage("正在切换当前用于 AI 回答的简历...");
    try {
      await activateResumeForAi(resume);
      props.onMessage("已切换为当前用于 AI 回答的简历");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "切换 AI 回答依据失败");
    } finally {
      setBusyPrimaryId("");
    }
  }

  async function handleAddPredictionToLibrary(predictionId: string) {
    if (!active) {
      return;
    }

    setBusyLibraryId(predictionId);
    props.onMessage("正在把预测题加入高频问题库...");
    try {
      await addAnalysisQuestionsToHighFrequency(active.id, [predictionId]);
      const payload = await fetchBootstrap();
      props.onBootstrapSync(payload);
      props.onMessage("预测题已加入高频问题库");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "加入高频问题库失败");
    } finally {
      setBusyLibraryId("");
    }
  }

  async function handleDeleteResume(resume: ResumeRecord) {
    if (!window.confirm(`确定删除“${resume.displayName}”吗？`)) {
      return;
    }

    setBusyPrimaryId(resume.id);
    props.onMessage("正在删除简历版本...");
    try {
      await deleteResume(resume.id);
      const payload = await fetchBootstrap();
      props.onBootstrapSync(payload);
      props.onMessage("简历版本已删除");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "删除简历失败");
    } finally {
      setBusyPrimaryId("");
    }
  }

  async function handleExpandQuestions() {
    if (!active) {
      return;
    }

    setExpandingQuestions(true);
    props.onMessage("正在补充新的预测题...");
    try {
      await expandAnalysisQuestions(active.id, {
        focus: expandFocus === "全部" ? undefined : expandFocus
      });
      const payload = await fetchBootstrap();
      props.onBootstrapSync(payload);
      props.onMessage("新的预测题已追加到当前简历");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "补充预测题失败");
    } finally {
      setExpandingQuestions(false);
    }
  }

  async function handleGeneratePredictionAnswer(predictionId: string) {
    if (!active) {
      return;
    }

    const needsSwitch = primaryResume?.id !== active.id;
    setBusyPredictionId(predictionId);
    if (needsSwitch) {
      setBusyPrimaryId(active.id);
    }
    props.onMessage(needsSwitch ? "正在切换当前 AI 简历并生成预测题回答..." : "正在根据当前已使用简历生成预测题回答...");
    try {
      if (needsSwitch) {
        await activateResumeForAi(active);
      }
      const result = await answerPredictedQuestion(active.id, predictionId);
      props.onResumesChange(
        props.resumes.map((item) => (item.id === result.resume.id ? result.resume : item))
      );
      props.onQuestionsChange(upsertQuestion(props.questions, result.question));
      props.onAnswersChange(upsertAnswer(props.answers, result.answer));
      props.onMessage("预测题回答已生成");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "生成回答失败");
    } finally {
      setBusyPredictionId("");
      if (needsSwitch) {
        setBusyPrimaryId("");
      }
    }
  }

  return (
    <section className="panel panel-wide analysis-panel">
      <div className="panel-header">
        <div>
          <h2>简历画像与预测题</h2>
          <p className="muted">每份简历都保留独立画像和预测题，但同一时间只会有一份简历作为 AI 回答依据，后续回答统一按这份来生成。</p>
        </div>
        <span className="panel-meta-chip">{active ? active.displayName : "暂无简历"}</span>
      </div>
      <div className="analysis-layout">
        <aside className="history-list analysis-history">
          <div className="history-title-row">
            <h3>本地简历版本</h3>
            <span className="history-count">{activeResumes.length}</span>
          </div>
          <p className="muted history-side-note">左侧切换版本查看内容；带“已用于 AI 回答”标记的那一份，才是后续所有回答默认依据。</p>
          {activeResumes.length === 0 ? (
            <p className="muted">还没有保存的简历版本。</p>
          ) : (
            <div className="history-list-scroll-region" role="region" aria-label="简历版本列表">
              <div className="history-list-items">
                {activeResumes.map((resume) => (
                  <article key={resume.id} className={resume.id === active?.id ? "history-entry active" : "history-entry"}>
                    <button type="button" className="history-item" onClick={() => setActiveId(resume.id)}>
                      <strong>{resume.displayName}</strong>
                      <span>{`版本 V${resume.version}`}</span>
                      <span>{resume.isPrimary ? "已用于 AI 回答" : "未用于 AI 回答"}</span>
                      <span>{new Date(resume.updatedAt).toLocaleString()}</span>
                    </button>
                    {!resume.isPrimary ? (
                      <div className="history-side-actions">
                        <button
                          type="button"
                          className="ghost-button history-delete-button"
                          onClick={() => handleSetPrimary(resume)}
                          disabled={busyPrimaryId !== ""}
                        >
                          {busyPrimaryId === resume.id ? "处理中..." : "使用这份简历"}
                        </button>
                        <button
                          type="button"
                          className="ghost-button danger-ghost-button history-delete-button"
                          onClick={() => handleDeleteResume(resume)}
                          disabled={busyPrimaryId !== ""}
                        >
                          {busyPrimaryId === resume.id ? "处理中..." : "删除简历"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="ghost-button danger-ghost-button history-delete-button"
                        onClick={() => handleDeleteResume(resume)}
                        disabled={busyPrimaryId !== ""}
                      >
                        {busyPrimaryId === resume.id ? "处理中..." : "删除简历"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
        <div className="result-sections">
          {active ? (
            <>
              <article className="result-block summary-band">
                <div>
                  <span className="summary-label">当前查看</span>
                  <strong>{active.displayName}</strong>
                </div>
                <div>
                  <span className="summary-label">当前用于 AI 回答</span>
                  <strong>{primaryResume?.displayName ?? "未指定"}</strong>
                </div>
                <div>
                  <span className="summary-label">预测问题</span>
                  <strong>{active.predictedQuestions.length}</strong>
                </div>
                <div>
                  <span className="summary-label">已入高频 / 已写回答</span>
                  <strong>{`${linkedPredictionCount} / ${answeredPredictionCount}`}</strong>
                </div>
              </article>
              <article className="result-block">
                <div className="panel-header compact-header">
                  <div>
                    <h3>简历画像</h3>
                    <p className="muted">把候选人定位、经历亮点和追问风险固定成一份可持续复用的本地画像。</p>
                  </div>
                </div>
                <div className="persona-grid">
                  <PersonaList title="候选人定位" items={[active.profile.candidateSummary]} />
                  <PersonaList title="擅长技能" items={active.profile.strongSkills} />
                  <PersonaList title="个人优势" items={active.profile.personalAdvantages} />
                  <PersonaList title="工作经历" items={active.profile.workExperience} />
                  <PersonaList title="项目亮点" items={active.profile.projectHighlights} />
                  <PersonaList title="风险点 / 追问点" items={active.profile.riskPoints} />
                </div>
              </article>
              <article className="result-block">
                <div className="panel-header compact-header analysis-question-header">
                  <div>
                    <h3>AI 预测问题</h3>
                    <p className="muted">
                      支持继续补题、去重追加、直接入库和生成回答。
                      {primaryResume ? ` 当前回答依据：${primaryResume.displayName}。` : ""}
                    </p>
                  </div>
                  <div className="analysis-expand-controls">
                    <label className="analysis-inline-field">
                      <span>补题方向</span>
                      <select value={expandFocus} onChange={(event) => setExpandFocus(event.target.value as "全部" | QuestionCategory)}>
                        {EXPAND_FOCUS_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleExpandQuestions}
                      disabled={expandingQuestions}
                    >
                      {expandingQuestions ? "补题中..." : "继续补题"}
                    </button>
                  </div>
                </div>
                {active.predictedQuestions.length === 0 ? (
                  <p className="muted">当前简历还没有预测题。</p>
                ) : (
                  <div className="question-list-scroll-region" role="region" aria-label="预测问题列表">
                    <div className="analysis-question-list">
                      {active.predictedQuestions.map((prediction) => {
                        const answer = prediction.linkedQuestionId
                          ? findCurrentAnswer(prediction.linkedQuestionId, props.questions, props.answers)
                          : "";
                        return (
                          <article id={`prediction-${prediction.id}`} key={prediction.id} className="question-card analysis-question-card">
                            <div className="question-card-top">
                              <span className="tag-pill">{prediction.category}</span>
                              <div className="question-card-actions">
                                {prediction.linkedQuestionId ? <span className="pin-badge">已入高频题库</span> : null}
                                <button
                                  type="button"
                                  className="ghost-button"
                                  onClick={() => handleAddPredictionToLibrary(prediction.id)}
                                  disabled={busyLibraryId !== "" || Boolean(prediction.linkedQuestionId)}
                                >
                                  {busyLibraryId === prediction.id
                                    ? "加入中..."
                                    : prediction.linkedQuestionId
                                      ? "已加入题库"
                                      : "加入高频题库"}
                                </button>
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={() => handleGeneratePredictionAnswer(prediction.id)}
                                  disabled={busyPredictionId !== ""}
                                >
                                  {busyPredictionId === prediction.id
                                    ? "正在生成回答..."
                                    : active.id === primaryResume?.id
                                      ? "生成回答"
                                      : "使用这份简历后生成"}
                                </button>
                              </div>
                            </div>
                            <div>
                              <strong>{prediction.questionText}</strong>
                              {prediction.tags.length ? (
                                <div className="tag-row">
                                  {prediction.tags.map((tag) => (
                                    <span key={tag} className="tag-pill">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {answer ? <p className="answer-block">{answer}</p> : <p className="muted">还没有回答稿。</p>}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            </>
          ) : (
            <p>暂无简历版本</p>
          )}
        </div>
      </div>
    </section>
  );
}

function findCurrentAnswer(questionId: string, questions: QuestionRecord[], answers: AnswerRecord[]) {
  const question = questions.find((item) => item.id === questionId && !item.deletedAt);
  if (!question?.currentAnswerId) {
    return "";
  }
  return answers.find((item) => item.id === question.currentAnswerId && !item.deletedAt)?.content ?? "";
}

function upsertQuestion(current: QuestionRecord[], next: QuestionRecord) {
  const exists = current.some((item) => item.id === next.id);
  if (exists) {
    return current.map((item) => (item.id === next.id ? next : item));
  }
  return [next, ...current];
}

function upsertAnswer(current: AnswerRecord[], next: AnswerRecord) {
  const withoutSameQuestion = current.map((item) =>
    item.questionId === next.questionId ? { ...item, isCurrent: false } : item
  );
  const exists = withoutSameQuestion.some((item) => item.id === next.id);
  if (exists) {
    return withoutSameQuestion.map((item) => (item.id === next.id ? next : item));
  }
  return [next, ...withoutSameQuestion];
}

function PersonaList(props: { title: string; items: string[] }) {
  return (
    <section className="persona-block">
      <h4>{props.title}</h4>
      {props.items.length > 0 ? (
        <ul>
          {props.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>暂无内容</p>
      )}
    </section>
  );
}
