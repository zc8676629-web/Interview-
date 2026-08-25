import { useEffect, useRef, useState, type ChangeEvent } from "react";
import packageJson from "../../package.json";

import { AnalysisView } from "./components/AnalysisView";
import { DisclaimerContent } from "./components/DisclaimerContent";
import { FirstRunSetupGate } from "./components/FirstRunSetupGate";
import { GlobalSearchPanel } from "./components/GlobalSearchPanel";
import { HighFrequencyPage } from "./components/HighFrequencyPage";
import { WorkspaceGuidePage } from "./components/WorkspaceGuidePage";
import { InterviewSessionsPage } from "./components/InterviewSessionsPage";
import { SettingsPanel } from "./components/SettingsPanel";
import { UploadPanel } from "./components/UploadPanel";
import { WorkspaceOverviewPage } from "./components/WorkspaceOverviewPage";
import { WorkspaceNav, type WorkspacePage } from "./components/WorkspaceNav";
import {
  analyzeResume,
  clearResumeHistory,
  clearHighFrequencyQuestions,
  clearInterviewSessions,
  exportLocalData,
  fetchBootstrap,
  generatePrepInsight,
  importLocalData,
  permanentlyDeleteRecycleBinItem,
  restoreRecycleBinItem,
  saveSettings,
  testConnectivity,
  type AnswerRecord,
  type AnalysisRecord,
  type BootstrapPayload,
  type DedupeCandidateRecord,
  type HighFrequencyQuestionRecord,
  type InterviewRecord,
  type InterviewSessionRecord,
  type ModelOption,
  type QuestionRecord,
  type RecycleBinPayload,
  type ResumeRecord
} from "./lib/api";

type WorkspaceFocusTarget = {
  page: WorkspacePage;
  resumeId?: string;
  sessionId?: string;
  questionId?: string;
  predictionId?: string;
  nonce: number;
};

const OPEN_SOURCE_REPOSITORY_URL = "https://github.com/zc8676629-web/Interview-.git";
const APP_VERSION = packageJson.version;
const MISSING_API_KEY_GUIDANCE = "当前 AI 功能依赖大模型 API，请先到系统设置配置 DeepSeek API Key，再继续使用。";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("正在读取本地数据...");
  const [toast, setToast] = useState<{ id: number; text: string; phase: "enter" | "leave" } | null>({
    id: 1,
    text: "正在读取本地数据...",
    phase: "enter"
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [requiresSetup, setRequiresSetup] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelOption>("deepseek-v4-flash");
  const [file, setFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [recycleBin, setRecycleBin] = useState<RecycleBinPayload>({
    resumes: [],
    interviews: [],
    questions: [],
    answers: []
  });
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSessionRecord[]>([]);
  const [highFrequencyQuestions, setHighFrequencyQuestions] = useState<HighFrequencyQuestionRecord[]>([]);
  const [customHighFrequencyTags, setCustomHighFrequencyTags] = useState<string[]>([]);
  const [dedupeCandidates, setDedupeCandidates] = useState<DedupeCandidateRecord[]>([]);
  const [prepInsight, setPrepInsight] = useState<BootstrapPayload["prepInsight"]>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [workspacePage, setWorkspacePage] = useState<WorkspacePage>("guide");
  const [workspaceTarget, setWorkspaceTarget] = useState<WorkspaceFocusTarget | null>(null);
  const [generatingPrepInsight, setGeneratingPrepInsight] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const toastIdRef = useRef(1);
  const workspaceTargetRef = useRef(1);
  const setupGateVisible = !loading && requiresSetup;

  function publishMessage(nextMessage: string) {
    setStatusMessage(nextMessage);
    toastIdRef.current += 1;
    setToast({
      id: toastIdRef.current,
      text: nextMessage,
      phase: "enter"
    });
  }

  function applyBootstrap(payload: BootstrapPayload) {
    const nextRequiresSetup = payload.settings.requiresSetup ?? !payload.settings.disclaimerAccepted;

    setHasApiKey(payload.settings.hasApiKey);
    setMaskedApiKey(payload.settings.maskedApiKey ?? "");
    setDisclaimerAccepted(Boolean(payload.settings.disclaimerAccepted));
    setDisclaimerChecked(nextRequiresSetup ? false : Boolean(payload.settings.disclaimerAccepted));
    setRequiresSetup(nextRequiresSetup);
    setSelectedModel(payload.settings.selectedModel);
    setResumes(payload.resumes ?? []);
    setInterviews(payload.interviews ?? []);
    setQuestions(payload.questions ?? []);
    setAnswers(payload.answers ?? []);
    setRecycleBin(
      payload.recycleBin ?? {
        resumes: [],
        interviews: [],
        questions: [],
        answers: []
      }
    );
    setAnalyses(payload.analyses ?? []);
    setInterviewSessions(payload.interviewSessions ?? []);
    setHighFrequencyQuestions(payload.highFrequencyQuestions ?? []);
    setCustomHighFrequencyTags(payload.customHighFrequencyTags ?? []);
    setDedupeCandidates(payload.dedupeCandidates ?? []);
    setPrepInsight(payload.prepInsight ?? null);
    setActiveId(payload.analyses?.[0]?.id ?? null);
  }

  function handleWorkspaceChange(page: WorkspacePage) {
    setWorkspacePage(page);
    setWorkspaceTarget(null);
  }

  function isMissingApiKeyMessage(message: string) {
    return message.includes("DeepSeek API Key") && (message.includes("请先保存") || message.includes("请先填写"));
  }

  function relayMessage(message: string, options?: { navigateToSettings?: boolean }) {
    if (isMissingApiKeyMessage(message)) {
      publishMessage(MISSING_API_KEY_GUIDANCE);
      if (!setupGateVisible && options?.navigateToSettings !== false) {
        handleWorkspaceChange("settings");
      }
      return;
    }

    publishMessage(message);
  }

  function handleFocusedNavigation(target: Omit<WorkspaceFocusTarget, "nonce">) {
    workspaceTargetRef.current += 1;
    setWorkspacePage(target.page);
    setWorkspaceTarget({
      ...target,
      nonce: workspaceTargetRef.current
    });
  }

  useEffect(() => {
    void (async () => {
      try {
        const payload = await fetchBootstrap();
        applyBootstrap(payload);
        relayMessage("本地数据已加载", { navigateToSettings: false });
      } catch (error) {
        relayMessage(error instanceof Error ? error.message : "加载失败", { navigateToSettings: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const leaveTimer = window.setTimeout(() => {
      setToast((current) => (current && current.id === toast.id ? { ...current, phase: "leave" } : current));
    }, 2800);

    const clearTimer = window.setTimeout(() => {
      setToast((current) => (current && current.id === toast.id ? null : current));
    }, 3060);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(clearTimer);
    };
  }, [toast?.id]);

  useEffect(() => {
    if (!analyses.length) {
      setActiveId(null);
      return;
    }

    if (!activeId || !analyses.some((item) => item.id === activeId)) {
      setActiveId(analyses[0].id);
    }
  }, [activeId, analyses]);

  useEffect(() => {
    setCustomHighFrequencyTags((current) => mergeTagLists(current, highFrequencyQuestions.flatMap((item) => item.tags)));
  }, [highFrequencyQuestions]);

  async function handleSaveSettings(options?: { acceptDisclaimer?: boolean }) {
    setSaving(true);
    try {
      const payload = await saveSettings({
        apiKey: apiKeyInput || undefined,
        selectedModel,
        acceptDisclaimer: options?.acceptDisclaimer
      });
      const nextRequiresSetup = payload.requiresSetup ?? !payload.disclaimerAccepted;
      setHasApiKey(Boolean(payload.hasApiKey));
      setMaskedApiKey(payload.maskedApiKey ?? "");
      setDisclaimerAccepted(Boolean(payload.disclaimerAccepted));
      setDisclaimerChecked(nextRequiresSetup ? false : Boolean(payload.disclaimerAccepted));
      setRequiresSetup(nextRequiresSetup);
      setApiKeyInput("");
      relayMessage(options?.acceptDisclaimer ? "首次配置已完成，正在进入主页" : "本地设置已保存", {
        navigateToSettings: false
      });
    } catch (error) {
      relayMessage(error instanceof Error ? error.message : "保存失败", { navigateToSettings: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    if (!file) {
      publishMessage("请先选择简历文件");
      return;
    }

    setBusy(true);
    try {
      await analyzeResume(file);
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
      relayMessage("简历分析完成，结果已保存在本地");
    } catch (error) {
      relayMessage(error instanceof Error ? error.message : "分析失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleTestConnectivity() {
    setTesting(true);
    try {
      await testConnectivity({
        apiKey: apiKeyInput || undefined,
        selectedModel
      });
      relayMessage("DeepSeek 连通性正常", { navigateToSettings: false });
    } catch (error) {
      relayMessage(error instanceof Error ? error.message : "连通性测试失败", { navigateToSettings: false });
    } finally {
      setTesting(false);
    }
  }

  async function handleClearInterviewSessions() {
    if (!window.confirm("确定清空面试场次库吗？")) return;
    try {
      await clearInterviewSessions();
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
      publishMessage("面试场次库已清空");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "清空失败");
    }
  }

  async function handleClearResumeVersions() {
    if (!window.confirm(`确定清空全部 ${resumes.length} 份简历历史吗？`)) return;
    try {
      await clearResumeHistory();
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
      publishMessage("简历历史已清空并进入回收站");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "清空失败");
    }
  }

  async function handleClearHighFrequency() {
    if (!window.confirm("确定清空高频问题库吗？")) return;
    try {
      await clearHighFrequencyQuestions();
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
      publishMessage("高频问题库已清空");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "清空失败");
    }
  }

  async function handleGeneratePrepInsight() {
    setGeneratingPrepInsight(true);
    relayMessage("正在汇总简历、场次和高频题，生成 AI 备战建议...");
    try {
      const nextInsight = await generatePrepInsight();
      setPrepInsight(nextInsight);
      relayMessage("AI 备战建议已更新");
    } catch (error) {
      relayMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setGeneratingPrepInsight(false);
    }
  }

  async function handleExportLocalData() {
    publishMessage("正在导出本地备份...");
    try {
      const payload = await exportLocalData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `interview-local-backup-${payload.exportedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      publishMessage("本地备份已导出，默认不包含 API Key");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "导出失败");
    }
  }

  async function handleImportLocalData(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }

    setImportingData(true);
    publishMessage("正在导入本地备份...");
    try {
      const payload = await importLocalData(nextFile);
      applyBootstrap(payload);
      publishMessage("本地备份已导入");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "导入失败");
    } finally {
      event.target.value = "";
      setImportingData(false);
    }
  }

  async function handleRestoreRecycleBin(kind: "resume" | "interview" | "question" | "answer", id: string) {
    try {
      await restoreRecycleBinItem(kind, id);
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
      publishMessage("已从回收站恢复");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "恢复失败");
    }
  }

  async function handlePermanentDeleteRecycleBin(
    kind: "resume" | "interview" | "question" | "answer",
    id: string
  ) {
    if (!window.confirm("确定永久删除这条数据吗？此操作无法恢复。")) return;
    try {
      await permanentlyDeleteRecycleBinItem(kind, id);
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
      publishMessage("已永久删除");
    } catch (error) {
      publishMessage(error instanceof Error ? error.message : "删除失败");
    }
  }

  const resumeCount = resumes.filter((item) => !item.deletedAt).length || analyses.length;
  const interviewCount = interviews.filter((item) => !item.deletedAt).length || interviewSessions.length;
  const answeredCount =
    answers.filter((item) => item.isCurrent && !item.deletedAt).length ||
    interviewSessions.reduce(
      (sum, session) => sum + session.questions.filter((question) => question.answerSuggestion.trim()).length,
      0
    ) +
      highFrequencyQuestions.filter((question) => question.answerSuggestion.trim()).length;
  const pendingFocusCount = [
    resumeCount === 0,
    interviewCount === 0,
    highFrequencyQuestions.some((question) => !question.answerSuggestion.trim()),
    dedupeCandidates.length > 0
  ].filter(Boolean).length;
  const heroStatusText = loading ? "正在同步本地工作台..." : statusMessage;
  const heroStatusDetail = hasApiKey
    ? "本地工作台已就绪，可以直接继续分析、沉淀和复盘。"
    : "当前还没有配置 DeepSeek API Key，使用 AI 功能时系统会引导你前往系统设置完成配置。";
  const heroModelText = hasApiKey ? selectedModel : "待配置";

  function renderWorkspace() {
    if (workspacePage === "guide") {
      return <WorkspaceGuidePage onNavigate={handleWorkspaceChange} />;
    }

    if (workspacePage === "overview") {
      return (
        <WorkspaceOverviewPage
          resumes={resumes}
          interviews={interviews}
          questions={questions}
          answers={answers}
          analyses={analyses}
          sessions={interviewSessions}
          highFrequencyQuestions={highFrequencyQuestions}
          dedupeCandidates={dedupeCandidates}
          prepInsight={prepInsight}
          generatingPrepInsight={generatingPrepInsight}
          onGeneratePrepInsight={handleGeneratePrepInsight}
          onNavigate={handleWorkspaceChange}
        />
      );
    }

    if (workspacePage === "interview-sessions") {
      return (
        <InterviewSessionsPage
          sessions={interviewSessions}
          resumes={resumes}
          onBootstrapSync={applyBootstrap}
          onSessionsChange={setInterviewSessions}
          onHighFrequencyChange={setHighFrequencyQuestions}
          onMessage={relayMessage}
          requestedSessionId={workspaceTarget?.page === "interview-sessions" ? workspaceTarget.sessionId : undefined}
          requestedQuestionId={workspaceTarget?.page === "interview-sessions" ? workspaceTarget.questionId : undefined}
          navigationNonce={workspaceTarget?.page === "interview-sessions" ? workspaceTarget.nonce : undefined}
        />
      );
    }

    if (workspacePage === "high-frequency") {
      return (
        <HighFrequencyPage
          questions={highFrequencyQuestions}
          customTags={customHighFrequencyTags}
          dedupeCandidates={dedupeCandidates}
          onQuestionsChange={setHighFrequencyQuestions}
          onSessionsChange={setInterviewSessions}
          onDedupeCandidatesChange={setDedupeCandidates}
          onBootstrapSync={applyBootstrap}
          onMessage={relayMessage}
          requestedQuestionId={workspaceTarget?.page === "high-frequency" ? workspaceTarget.questionId : undefined}
          navigationNonce={workspaceTarget?.page === "high-frequency" ? workspaceTarget.nonce : undefined}
        />
      );
    }

    if (workspacePage === "settings") {
      return (
        <div className="top-grid settings-grid">
          <div className="settings-left-rail" data-testid="settings-left-rail">
            <SettingsPanel
              apiKeyInput={apiKeyInput}
              hasApiKey={hasApiKey}
              maskedApiKey={maskedApiKey}
              selectedModel={selectedModel}
              saving={saving}
              testing={testing}
              onApiKeyChange={setApiKeyInput}
              onModelChange={setSelectedModel}
              onSave={handleSaveSettings}
              onTestConnectivity={handleTestConnectivity}
            />
            <section className="panel feature-panel disclaimer-panel">
              <div className="panel-header compact-header">
                <div>
                  <h2>开源声明与免责声明</h2>
                  <p className="muted">请在使用、二次开发、演示或分享前先阅读。</p>
                </div>
              </div>
              <DisclaimerContent />
            </section>
          </div>
          <div className="settings-right-rail settings-side-stack" data-testid="settings-right-rail">
            <section className="panel feature-panel">
              <div className="panel-header compact-header">
                <div>
                  <h2>本地数据管理</h2>
                  <p className="muted">导出或导入本地备份，默认不把 API Key 放进备份文件。</p>
                </div>
              </div>
              <div className="action-row">
                <button type="button" className="primary-button" onClick={handleExportLocalData}>
                  导出本地备份
                </button>
              </div>
              <label className="field">
                <span>导入备份文件</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportLocalData}
                  disabled={importingData}
                />
              </label>
              <p className="muted">
                导入会覆盖当前业务数据，但会保留你这台机器上已经保存的 API Key。建议在大改前先导出一份备份。
              </p>
              <div className="settings-divider" />
              <div className="action-row">
                <button type="button" className="danger-button" onClick={handleClearResumeVersions}>
                  清空简历历史
                </button>
                <button type="button" className="danger-button" onClick={handleClearInterviewSessions}>
                  清空面试场次库
                </button>
                <button type="button" className="danger-button" onClick={handleClearHighFrequency}>
                  清空高频问题库
                </button>
              </div>
            </section>
            <section className="panel feature-panel">
              <div className="panel-header compact-header">
                <div>
                  <h2>回收站</h2>
                  <p className="muted">误删的数据先停在这里，再决定恢复还是永久删除。</p>
                </div>
              </div>
              <div className="result-sections recycle-bin-stack">
                <RecycleBinSection
                  title="简历"
                  kind="resume"
                  items={recycleBin.resumes}
                  getLabel={(item) => item.displayName}
                  onRestore={handleRestoreRecycleBin}
                  onDelete={handlePermanentDeleteRecycleBin}
                />
                <RecycleBinSection
                  title="面试"
                  kind="interview"
                  items={recycleBin.interviews}
                  getLabel={(item) => item.title}
                  onRestore={handleRestoreRecycleBin}
                  onDelete={handlePermanentDeleteRecycleBin}
                />
                <RecycleBinSection
                  title="问题"
                  kind="question"
                  items={recycleBin.questions}
                  getLabel={(item) => item.standardQuestion}
                  onRestore={handleRestoreRecycleBin}
                  onDelete={handlePermanentDeleteRecycleBin}
                />
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (workspacePage === "resume") {
      return (
        <>
          <div className="resume-upload-strip">
            <UploadPanel file={file} busy={busy} onSelect={setFile} onAnalyze={handleAnalyze} />
          </div>
          <AnalysisView
            resumes={resumes}
            questions={questions}
            answers={answers}
            onBootstrapSync={applyBootstrap}
            onResumesChange={setResumes}
            onQuestionsChange={setQuestions}
            onAnswersChange={setAnswers}
            onMessage={relayMessage}
            requestedResumeId={workspaceTarget?.page === "resume" ? workspaceTarget.resumeId : undefined}
            requestedPredictionId={workspaceTarget?.page === "resume" ? workspaceTarget.predictionId : undefined}
            navigationNonce={workspaceTarget?.page === "resume" ? workspaceTarget.nonce : undefined}
          />
        </>
      );
    }

    return (
      <p className="muted">当前页面暂不可用。</p>
    );
  }

  return (
    <>
      {setupGateVisible ? (
        <FirstRunSetupGate
          apiKeyInput={apiKeyInput}
          hasApiKey={hasApiKey}
          maskedApiKey={maskedApiKey}
          selectedModel={selectedModel}
          saving={saving}
          testing={testing}
          disclaimerChecked={disclaimerChecked}
          onApiKeyChange={setApiKeyInput}
          onModelChange={setSelectedModel}
          onDisclaimerChange={setDisclaimerChecked}
          onSave={() => void handleSaveSettings({ acceptDisclaimer: true })}
          onTestConnectivity={handleTestConnectivity}
        />
      ) : (
        <main className="app-shell">
          <a className="skip-link" href="#workspace-main">
            跳到主内容
          </a>
          <header className="console-header">
            <div className="console-hero">
              <div className="console-hero-copy">
                <h1>本地面试作战台</h1>
                <p>集中管理简历画像、真实场次、高频题和回答稿，所有核心数据默认保留在本机。</p>
                <p className="console-open-source-note">
                  该项目已在 GitHub 开源，当前版本 V{APP_VERSION}，仓库地址：
                  <a
                    className="console-inline-link"
                    href={OPEN_SOURCE_REPOSITORY_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {OPEN_SOURCE_REPOSITORY_URL}
                  </a>
                </p>
              </div>
              <section className="console-hero-summary" aria-label="首页概览">
                <div className="console-summary-row console-summary-row-primary">
                  <span className="status-label">当前状态</span>
                  <strong>{heroStatusText}</strong>
                  <span className="console-summary-detail">{heroStatusDetail}</span>
                </div>
                <div className="console-summary-grid">
                  <div className="console-summary-row">
                    <span className="status-label">模型</span>
                    <strong>{heroModelText}</strong>
                    <span className="console-summary-detail">
                      {hasApiKey ? "当前分析与回答默认使用这个模型。" : "完成配置后再生成分析与回答建议。"}
                    </span>
                  </div>
                  <div className="console-summary-row">
                    <span className="status-label">本地边界</span>
                    <strong>数据默认留在本机</strong>
                    <span className="console-summary-detail">Key、简历内容和题库默认不写入仓库。</span>
                  </div>
                </div>
              </section>
            </div>
            <div className="console-metric-strip" aria-label="工作台关键指标">
              <MetricTile label="简历画像" value={`${resumeCount}`} detail="当前版本池" />
              <MetricTile label="面试场次" value={`${interviewCount}`} detail="真实沉淀" />
              <MetricTile label="高频问题" value={`${highFrequencyQuestions.length}`} detail="统一口径库" />
              <MetricTile label="已写回答" value={`${answeredCount}`} detail="可直接复盘" />
            </div>
          </header>
          <GlobalSearchPanel
            resumes={resumes}
            questions={questions}
            answers={answers}
            sessions={interviewSessions}
            highFrequencyQuestions={highFrequencyQuestions}
            onNavigate={handleFocusedNavigation}
          />
          <div className="workspace-shell">
            <WorkspaceNav
              current={workspacePage}
              onChange={handleWorkspaceChange}
              summary={{
                focusCount: pendingFocusCount,
                resumeCount,
                sessionCount: interviewSessions.length,
                highFrequencyCount: highFrequencyQuestions.length,
                dedupeCount: dedupeCandidates.length,
                hasApiKey,
                selectedModel
              }}
            />
            <div className="workspace-content" id="workspace-main" tabIndex={-1}>
              {renderWorkspace()}
            </div>
          </div>
        </main>
      )}
      {toast ? (
        <div
          className={toast.phase === "enter" ? "status-toast status-toast-enter" : "status-toast status-toast-leave"}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      ) : null}
    </>
  );
}

function mergeTagLists(...groups: string[][]) {
  return Array.from(new Set(groups.flatMap((group) => group.map((item) => item.trim()).filter(Boolean)))).sort((left, right) =>
    left.localeCompare(right, "zh-Hans-CN")
  );
}

function MetricTile(props: { label: string; value: string; detail: string }) {
  return (
    <article className="console-metric-card">
      <span className="summary-label">{props.label}</span>
      <strong>{props.value}</strong>
      <span className="meta">{props.detail}</span>
    </article>
  );
}

function RecycleBinSection<T extends { id: string; deletedAt: string | null }>(props: {
  title: string;
  kind: "resume" | "interview" | "question" | "answer";
  items: T[];
  getLabel(item: T): string;
  onRestore(kind: "resume" | "interview" | "question" | "answer", id: string): void | Promise<void>;
  onDelete(kind: "resume" | "interview" | "question" | "answer", id: string): void | Promise<void>;
}) {
  return (
    <article className="result-block">
      <div className="panel-header compact-header">
        <h3>{props.title}</h3>
        <span className="muted">{`${props.items.length} 条`}</span>
      </div>
      {props.items.length === 0 ? (
        <p className="muted">暂无数据。</p>
      ) : (
        <div className="question-list">
          {props.items.map((item) => (
            <article key={item.id} className="question-card editable">
              <div>
                <strong>{props.getLabel(item)}</strong>
                <p className="question-meta">{item.deletedAt ? `删除于 ${new Date(item.deletedAt).toLocaleString()}` : ""}</p>
              </div>
              <div className="action-row">
                <button type="button" className="secondary-button" onClick={() => props.onRestore(props.kind, item.id)}>
                  恢复
                </button>
                <button type="button" className="danger-button" onClick={() => props.onDelete(props.kind, item.id)}>
                  永久删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
