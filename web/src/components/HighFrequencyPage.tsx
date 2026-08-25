import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import {
  createHighFrequencyQuestion,
  deleteHighFrequencyQuestion,
  fetchBootstrap,
  generateHighFrequencyAnswer,
  runHighFrequencyDedupe,
  updateHighFrequencyQuestion,
  type BootstrapPayload,
  type DedupeCandidateRecord,
  type HighFrequencyQuestionRecord,
  type InterviewSessionRecord,
  type QuestionCategory
} from "../lib/api";

interface HighFrequencyPageProps {
  questions: HighFrequencyQuestionRecord[];
  customTags?: string[];
  dedupeCandidates: DedupeCandidateRecord[];
  onDedupeCandidatesChange(next: DedupeCandidateRecord[]): void;
  onQuestionsChange(next: HighFrequencyQuestionRecord[]): void;
  onSessionsChange(next: InterviewSessionRecord[]): void;
  onBootstrapSync(next: BootstrapPayload): void;
  onMessage(message: string): void;
  requestedQuestionId?: string;
  navigationNonce?: number;
}

const CATEGORY_OPTIONS: QuestionCategory[] = ["人事问题", "项目问题", "技术问题", "业务问题", "其他"];
const DEFAULT_TAG_OPTIONS = [
  "自我介绍",
  "离职原因",
  "职业规划",
  "项目经历",
  "项目亮点",
  "项目难点",
  "自动化测试",
  "接口测试",
  "鉴权机制",
  "数据库",
  "性能优化",
  "业务理解",
  "指标结果",
  "风险追问",
  "沟通协作"
];

export function HighFrequencyPage(props: HighFrequencyPageProps) {
  const questions = useMemo(
    () =>
      [...(props.questions ?? [])].sort(
        (left, right) =>
          Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
          right.updatedAt.localeCompare(left.updatedAt) ||
          right.createdAt.localeCompare(left.createdAt)
      ),
    [props.questions]
  );
  const dedupeCandidates = props.dedupeCandidates ?? [];
  const [showManualForm, setShowManualForm] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [category, setCategory] = useState<QuestionCategory>("人事问题");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [answerSuggestion, setAnswerSuggestion] = useState("");
  const [filterCategory, setFilterCategory] = useState<QuestionCategory | "全部">("全部");
  const [filterTag, setFilterTag] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingCategory, setEditingCategory] = useState<QuestionCategory>("人事问题");
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingCustomTagInput, setEditingCustomTagInput] = useState("");
  const [editingAnswerSuggestion, setEditingAnswerSuggestion] = useState("");

  const availableTags = useMemo(
    () => buildTagPool(props.customTags ?? [], questions, selectedTags, editingTags, filterTag ? [filterTag] : []),
    [editingTags, filterTag, props.customTags, questions, selectedTags]
  );
  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          (filterCategory === "全部" || question.category === filterCategory) &&
          (!filterTag || question.tags.includes(filterTag))
      ),
    [filterCategory, filterTag, questions]
  );

  useEffect(() => {
    if (filterTag && !availableTags.includes(filterTag)) {
      setFilterTag("");
    }
  }, [availableTags, filterTag]);

  useEffect(() => {
    if (!props.requestedQuestionId) {
      return;
    }

    setFilterCategory("全部");
    setFilterTag("");
    window.setTimeout(() => {
      document.getElementById(`high-frequency-question-${props.requestedQuestionId}`)?.scrollIntoView?.({
        block: "center",
        behavior: "smooth"
      });
    }, 0);
  }, [props.navigationNonce, props.requestedQuestionId]);

  async function handleManualCreate() {
    setBusyAction("manual");
    props.onMessage("正在保存手动问题...");
    try {
      const created = await createHighFrequencyQuestion({
        questionText: questionText.trim(),
        category,
        tags: selectedTags,
        answerSuggestion: answerSuggestion.trim()
      });
      props.onQuestionsChange([created, ...questions]);
      setQuestionText("");
      setCategory("人事问题");
      setSelectedTags([]);
      setCustomTagInput("");
      setAnswerSuggestion("");
      setShowManualForm(false);
      props.onMessage("高频问题已手动添加");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "手动添加失败");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDedupe() {
    setBusyAction("dedupe");
    props.onMessage("正在进行 AI 去重检查...");
    try {
      const result = await runHighFrequencyDedupe();
      props.onDedupeCandidatesChange(result.candidates);
      props.onMessage("AI 去重检查已完成");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "去重失败");
    } finally {
      setBusyAction("");
    }
  }

  function startEdit(question: HighFrequencyQuestionRecord) {
    setEditingId(question.id);
    setEditingQuestionText(question.questionText);
    setEditingCategory(question.category);
    setEditingTags(question.tags);
    setEditingCustomTagInput("");
    setEditingAnswerSuggestion(question.answerSuggestion);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingQuestionText("");
    setEditingCategory("人事问题");
    setEditingTags([]);
    setEditingCustomTagInput("");
    setEditingAnswerSuggestion("");
  }

  async function handleSaveEdit() {
    if (!editingId) return;

    setBusyAction("edit");
    props.onMessage("正在保存高频问题修改...");
    try {
      const result = await updateHighFrequencyQuestion(editingId, {
        questionText: editingQuestionText.trim(),
        category: editingCategory,
        tags: editingTags,
        answerSuggestion: editingAnswerSuggestion.trim()
      });

      props.onQuestionsChange(questions.map((item) => (item.id === result.question.id ? result.question : item)));
      props.onSessionsChange(result.interviewSessions);
      cancelEdit();
      props.onMessage("高频问题和关联答案已同步保存");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusyAction("");
    }
  }

  async function handleTogglePin(question: HighFrequencyQuestionRecord) {
    setBusyAction(`pin:${question.id}`);
    props.onMessage(question.pinned ? "正在取消置顶..." : "正在置顶高频问题...");
    try {
      await updateHighFrequencyQuestion(question.id, {
        questionText: question.questionText,
        category: question.category,
        tags: question.tags,
        answerSuggestion: question.answerSuggestion,
        pinned: !question.pinned
      });
      const payload = await fetchBootstrap();
      props.onBootstrapSync(payload);
      props.onMessage(question.pinned ? "已取消置顶" : "高频问题已置顶");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "置顶失败");
    } finally {
      setBusyAction("");
    }
  }

  async function handleGenerateAnswer(question: HighFrequencyQuestionRecord) {
    setBusyAction(`answer:${question.id}`);
    props.onMessage("正在生成这道高频题的 AI 回答建议...");
    try {
      const result = await generateHighFrequencyAnswer(question.id);
      props.onQuestionsChange(questions.map((item) => (item.id === result.question.id ? result.question : item)));
      props.onSessionsChange(result.interviewSessions);
      props.onMessage("高频题的 AI 回答建议已生成");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDelete(question: HighFrequencyQuestionRecord) {
    if (!window.confirm(`确定删除这道高频问题吗？\n\n${question.questionText}`)) return;

    setBusyAction(`delete:${question.id}`);
    props.onMessage("正在删除高频问题...");
    try {
      await deleteHighFrequencyQuestion(question.id);
      if (editingId === question.id) {
        cancelEdit();
      }
      const payload = await fetchBootstrap();
      props.onBootstrapSync(payload);
      props.onMessage("高频问题已删除并移入回收站");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <section className="panel panel-wide">
      <div className="panel-header">
        <div>
          <span className="panel-section-kicker">High Frequency</span>
          <h2>高频题管理台</h2>
          <p className="muted">沉淀高频题目，继续做去重、扩充、置顶和统一口径管理，让重点问题真正形成资产。</p>
        </div>
        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => setShowManualForm((value) => !value)}>
            {showManualForm ? "收起手动添加" : "手动添加问题"}
          </button>
          <button type="button" className="primary-button" onClick={handleDedupe} disabled={busyAction !== ""}>
            {busyAction === "dedupe" ? "正在去重..." : "AI去重检查"}
          </button>
        </div>
      </div>
      {showManualForm ? (
        <article className="result-block">
          <label className="field">
            <span>问题内容</span>
            <textarea
              className="large-textarea"
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="输入要沉淀到高频问题库的问题"
            />
          </label>
          <label className="field">
            <span>分类</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as QuestionCategory)}>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <TagPicker
            label="标签"
            helper="先从默认标签和已有自定义标签里点选；如果不够，再补一个新标签。"
            availableTags={availableTags}
            selectedTags={selectedTags}
            customTagInput={customTagInput}
            customTagPlaceholder="输入一个新标签后点添加"
            onToggleTag={(tag) => toggleTagSelection(tag, setSelectedTags)}
            onCustomTagInputChange={setCustomTagInput}
            onAddCustomTag={() => addCustomTagToSelection(customTagInput, setCustomTagInput, setSelectedTags)}
          />
          <label className="field">
            <span>回答建议</span>
            <textarea
              className="large-textarea"
              value={answerSuggestion}
              onChange={(event) => setAnswerSuggestion(event.target.value)}
              placeholder="可选，先留空也可以"
            />
          </label>
          <button type="button" className="primary-button" onClick={handleManualCreate} disabled={busyAction !== ""}>
            {busyAction === "manual" ? "正在保存..." : "保存手动问题"}
          </button>
        </article>
      ) : null}
      <div className="result-sections">
        <article className="result-block">
          <div className="panel-header compact-header">
            <div>
              <h3>高频问题</h3>
              <p className="muted">置顶项优先展示，支持按分类和标签快速筛选，方便先处理最常问、最关键的问题。</p>
            </div>
            <span className="muted">{`${filteredQuestions.length} / ${questions.length} 道`}</span>
          </div>
          <div className="filter-toolbar">
            <span className="filter-caption">筛选</span>
            <div className="filter-row">
              <button
                type="button"
                className={filterCategory === "全部" ? "filter-chip active" : "filter-chip"}
                onClick={() => setFilterCategory("全部")}
              >
                全部分组
              </button>
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={filterCategory === option ? "filter-chip active" : "filter-chip"}
                  onClick={() => setFilterCategory(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <label className="analysis-inline-field tag-filter-field">
              <span>标签</span>
              <select value={filterTag} onChange={(event) => setFilterTag(event.target.value)}>
                <option value="">全部标签</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {questions.length === 0 ? (
            <p>暂无高频问题。先从简历预测题或面试场次里把值得长期准备的问题收进来。</p>
          ) : filteredQuestions.length === 0 ? (
            <p className="muted">当前筛选条件下没有命中问题，换个分类或标签再看。</p>
          ) : (
            <div className="question-list-scroll-region" role="region" aria-label="高频问题列表">
              <div className="question-list">
                {filteredQuestions.map((question) => {
                  const editing = editingId === question.id;
                  return (
                    <article id={`high-frequency-question-${question.id}`} key={question.id} className="question-card editable">
                      <div className="question-card-top">
                        <div>
                          <strong>{question.questionText}</strong>
                          <p className="question-meta">{question.category}</p>
                        </div>
                        <div className="question-card-actions">
                          {question.pinned ? <span className="pin-badge">已置顶</span> : null}
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleGenerateAnswer(question)}
                            disabled={busyAction !== ""}
                          >
                            {busyAction === `answer:${question.id}` ? "生成中..." : "AI回答建议"}
                          </button>
                          <button type="button" className="accent-button" onClick={() => handleTogglePin(question)} disabled={busyAction !== ""}>
                            {busyAction === `pin:${question.id}` ? "处理中..." : question.pinned ? "取消置顶" : "置顶"}
                          </button>
                          <button type="button" className="ghost-button" onClick={() => startEdit(question)} disabled={busyAction !== ""}>
                            编辑问题
                          </button>
                          <button type="button" className="ghost-button danger-ghost-button" onClick={() => handleDelete(question)} disabled={busyAction !== ""}>
                            {busyAction === `delete:${question.id}` ? "删除中..." : "删除问题"}
                          </button>
                        </div>
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
                                {CATEGORY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <TagPicker
                            label="标签"
                            helper="编辑时只能从默认标签和已经建立过的自定义标签池里选；新补的标签先点“添加自定义标签”再保存。"
                            availableTags={availableTags}
                            selectedTags={editingTags}
                            customTagInput={editingCustomTagInput}
                            customTagPlaceholder="需要新标签时在这里补充"
                            onToggleTag={(tag) => toggleTagSelection(tag, setEditingTags)}
                            onCustomTagInputChange={setEditingCustomTagInput}
                            onAddCustomTag={() =>
                              addCustomTagToSelection(editingCustomTagInput, setEditingCustomTagInput, setEditingTags)
                            }
                          />
                          <label className="field">
                            <span>回答内容</span>
                            <textarea
                              className="large-textarea"
                              value={editingAnswerSuggestion}
                              onChange={(event) => setEditingAnswerSuggestion(event.target.value)}
                              placeholder="这里可以直接改回答稿"
                            />
                          </label>
                          <div className="action-row">
                            <button type="button" className="primary-button" onClick={handleSaveEdit} disabled={busyAction !== ""}>
                              {busyAction === "edit" ? "正在保存..." : "保存修改"}
                            </button>
                            <button type="button" className="secondary-button" onClick={cancelEdit} disabled={busyAction !== ""}>
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="tag-row">
                            {question.tags.map((tag) => (
                              <span key={tag} className="tag-pill">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="question-meta">
                            {question.sourceSessionTitles.length
                              ? `来源场次：${question.sourceSessionTitles.join(" / ")}`
                              : "来源：手动添加"}
                          </p>
                          {question.answerSuggestion ? (
                            <p className="answer-block">{question.answerSuggestion}</p>
                          ) : (
                            <p className="muted">这道题还没有回答稿，可以直接点 AI 回答建议，或者手动编辑补上。</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </article>
        <article className="result-block">
          <div className="panel-header compact-header">
            <div>
              <h3>AI 去重候选</h3>
              <p className="muted">把相似题先拉出来确认，避免题库越积越乱。</p>
            </div>
          </div>
          {dedupeCandidates.length === 0 ? (
            <p>暂无候选结果。高频问题积累后再点“AI去重检查”。</p>
          ) : (
            <ul>
              {dedupeCandidates.map((item) => (
                <li key={`${item.questionAId}-${item.questionBId}`}>
                  <strong>{item.reason}</strong>
                  <div>{`${item.confidence} / ${item.recommendedAction}`}</div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

function TagPicker(props: {
  label: string;
  helper: string;
  availableTags: string[];
  selectedTags: string[];
  customTagInput: string;
  customTagPlaceholder: string;
  onToggleTag(tag: string): void;
  onCustomTagInputChange(value: string): void;
  onAddCustomTag(): void;
}) {
  return (
    <div className="field">
      <div className="tag-picker-header">
        <span>{props.label}</span>
        <span className="muted">{props.selectedTags.length ? `已选 ${props.selectedTags.length} 个标签` : "还未选择标签"}</span>
      </div>
      <p className="muted">{props.helper}</p>
      <div className="filter-row">
        {props.availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={props.selectedTags.includes(tag) ? "filter-chip active" : "filter-chip"}
            onClick={() => props.onToggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="tag-builder">
        <input
          type="text"
          value={props.customTagInput}
          onChange={(event) => props.onCustomTagInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              props.onAddCustomTag();
            }
          }}
          placeholder={props.customTagPlaceholder}
        />
        <button type="button" className="secondary-button" onClick={props.onAddCustomTag}>
          添加自定义标签
        </button>
      </div>
      {props.selectedTags.length ? (
        <div className="tag-row">
          {props.selectedTags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeTagText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildTagPool(
  customTags: string[],
  questions: HighFrequencyQuestionRecord[],
  ...extraGroups: string[][]
) {
  const pool = new Set<string>([...DEFAULT_TAG_OPTIONS, ...customTags]);

  questions.forEach((question) => {
    question.tags.forEach((tag) => {
      const normalized = normalizeTagText(tag);
      if (normalized) {
        pool.add(normalized);
      }
    });
  });

  extraGroups.forEach((group) => {
    group.forEach((tag) => {
      const normalized = normalizeTagText(tag);
      if (normalized) {
        pool.add(normalized);
      }
    });
  });

  return Array.from(pool).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function toggleTagSelection(tag: string, setSelectedTags: Dispatch<SetStateAction<string[]>>) {
  setSelectedTags((current) =>
    current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
  );
}

function addCustomTagToSelection(
  rawValue: string,
  setRawValue: Dispatch<SetStateAction<string>>,
  setSelectedTags: Dispatch<SetStateAction<string[]>>
) {
  const normalized = normalizeTagText(rawValue);
  if (!normalized) {
    return;
  }

  setSelectedTags((current) => (current.includes(normalized) ? current : [...current, normalized]));
  setRawValue("");
}
