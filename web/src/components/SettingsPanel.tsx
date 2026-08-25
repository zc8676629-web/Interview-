import type { ReactNode } from "react";

import type { ModelOption } from "../lib/api";

interface SettingsPanelProps {
  mode?: "default" | "compact";
  apiKeyInput: string;
  hasApiKey: boolean;
  maskedApiKey?: string;
  selectedModel: ModelOption;
  saving: boolean;
  testing: boolean;
  title?: string;
  description?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
  extraContent?: ReactNode;
  onApiKeyChange(value: string): void;
  onModelChange(value: ModelOption): void;
  onSave(): void;
  onTestConnectivity(): void;
}

const MODELS: ModelOption[] = ["deepseek-v4-flash", "deepseek-v4-pro"];

export function SettingsPanel(props: SettingsPanelProps) {
  const mode = props.mode ?? "default";
  const compact = mode === "compact";

  return (
    <section className={compact ? "panel feature-panel settings-panel compact-settings-panel" : "panel feature-panel settings-panel"}>
      <div className="panel-header compact-header">
        <div>
          {compact ? <span className="panel-section-kicker">Runtime</span> : null}
          <h2>{props.title ?? (compact ? "模型与连接" : "本地设置")}</h2>
          <p className="muted">
            {props.description ??
              (compact
                ? "简历分析前，先确认模型、Key 和连通性都处于可用状态。"
                : "选择模型、保存 Key，并在正式使用前先做一次连通性检查。")}
          </p>
        </div>
      </div>
      <label className="field">
        <span>DeepSeek API Key</span>
        <input
          type="password"
          value={props.apiKeyInput}
          onChange={(event) => props.onApiKeyChange(event.target.value)}
          placeholder={props.hasApiKey ? "本地已保存，可留空不改" : "请输入本地 API Key"}
        />
        {props.hasApiKey && props.maskedApiKey ? <span className="muted">{`当前已保存：${props.maskedApiKey}`}</span> : null}
        {props.hasApiKey ? <span className="muted">留空时会继续使用本地已保存的 Key，测试连通性无需重复输入。</span> : null}
      </label>
      <fieldset className={compact ? "field model-field compact-model-field" : "field model-field"}>
        <legend>模型选择</legend>
        <div className="radio-group">
          {MODELS.map((model) => (
            <label key={model} className="radio-item">
              <input
                type="radio"
                name="model"
                value={model}
                checked={props.selectedModel === model}
                onChange={() => props.onModelChange(model)}
              />
              <span>{model}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {props.extraContent ?? null}
      <div className="action-row">
        <button
          type="button"
          className="primary-button"
          onClick={props.onSave}
          disabled={props.saving || props.saveDisabled}
        >
          {props.saving ? "保存中..." : props.saveLabel ?? (compact ? "保存连接设置" : "保存本地设置")}
        </button>
        <button type="button" className="secondary-button" onClick={props.onTestConnectivity} disabled={props.testing}>
          {props.testing ? "测试中..." : "测试连通性"}
        </button>
      </div>
      {compact ? (
        <p className="muted settings-inline-note">建议先确认 Key 和模型，再开始上传分析，避免在处理中途再切换运行环境。</p>
      ) : null}
    </section>
  );
}
