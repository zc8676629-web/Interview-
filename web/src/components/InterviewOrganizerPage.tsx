import { useState } from "react";

import { createInterviewSession, extractInterviewQuestions, type InterviewQuestionRecord, type InterviewSessionRecord } from "../lib/api";

interface InterviewOrganizerPageProps {
  onCreated(session: InterviewSessionRecord): void;
  onMessage(message: string): void;
}

export function InterviewOrganizerPage(props: InterviewOrganizerPageProps) {
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestionRecord[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleExtract() {
    setBusy(true);
    try {
      const result = await extractInterviewQuestions({
        title,
        sourceText,
        sourceType: "text"
      });
      setQuestions(result.questions ?? []);
      props.onMessage("面试问题已整理，请确认后保存");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "整理失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setBusy(true);
    try {
      const saved = await createInterviewSession({
        title,
        sourceType: "text",
        sourceText,
        questions
      });
      props.onCreated(saved);
      setTitle("");
      setSourceText("");
      setQuestions([]);
      props.onMessage("面试场次已保存");
    } catch (error) {
      props.onMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel panel-wide">
      <h2>面试整理</h2>
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
      <div className="action-row">
        <button type="button" onClick={handleExtract} disabled={busy}>
          {busy ? "处理中..." : "AI整理问题"}
        </button>
        <button type="button" onClick={handleSave} disabled={busy || questions.length === 0}>
          保存该场面试
        </button>
      </div>
      <div className="result-block">
        <h3>待确认问题清单</h3>
        {questions.length === 0 ? (
          <p>暂无待确认问题</p>
        ) : (
          <ol>
            {questions.map((question) => (
              <li key={question.id}>
                <strong>{question.questionText}</strong>
                <span>{` ${question.category}`}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

