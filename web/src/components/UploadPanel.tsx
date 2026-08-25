interface UploadPanelProps {
  file: File | null;
  busy: boolean;
  onSelect(file: File | null): void;
  onAnalyze(): void;
}

export function UploadPanel(props: UploadPanelProps) {
  return (
    <section className="panel feature-panel upload-panel">
      <div className="panel-header compact-header">
        <div>
          <span className="panel-section-kicker">Resume Intake</span>
          <h2>上传并刷新简历画像</h2>
          <p className="muted">支持 `txt / docx / pdf`。上传后会生成多维画像、候选人定位和潜在面试问题。</p>
        </div>
      </div>
      <label className="field">
        <span>支持 txt / docx / pdf</span>
        <input
          type="file"
          accept=".txt,.docx,.pdf"
          onChange={(event) => props.onSelect(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className="upload-meta-card">
        <span className="summary-label">当前文件</span>
        <strong>{props.file?.name || "未选择"}</strong>
        <span className="meta">上传后会基于当前内容刷新简历画像和预测题。</span>
      </div>
      <div className="action-row">
        <button type="button" className="primary-button" onClick={props.onAnalyze} disabled={!props.file || props.busy}>
          {props.busy ? "分析中..." : "开始分析"}
        </button>
      </div>
    </section>
  );
}
