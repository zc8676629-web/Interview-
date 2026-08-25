import { DisclaimerContent } from "./DisclaimerContent";
import { SettingsPanel } from "./SettingsPanel";
import type { ModelOption } from "../lib/api";

interface FirstRunSetupGateProps {
  apiKeyInput: string;
  hasApiKey: boolean;
  maskedApiKey?: string;
  selectedModel: ModelOption;
  saving: boolean;
  testing: boolean;
  disclaimerChecked: boolean;
  onApiKeyChange(value: string): void;
  onModelChange(value: ModelOption): void;
  onDisclaimerChange(value: boolean): void;
  onSave(): void;
  onTestConnectivity(): void;
}

export function FirstRunSetupGate(props: FirstRunSetupGateProps) {
  const saveDisabled = !props.disclaimerChecked;

  return (
    <main className="first-run-shell">
      <section className="first-run-hero">
        <div className="first-run-copy">
          <span className="console-kicker">Desktop Init</span>
          <h1>首次启动需要先完成本地配置</h1>
          <p>
            {props.hasApiKey
              ? "已检测到这台机器上存在本地 Key，本次只需勾选免责协议并确认配置，即可进入主页。"
              : "本项目依赖大模型 API 调用。建议先配置 DeepSeek API Key；如果你暂时没有现成的 Key，也可以先勾选免责协议进入主页，后续再到系统设置补充。"}
          </p>
        </div>
        <div className="first-run-badges" aria-label="首次启动说明">
          <span className="tag-pill">仅保存到本机</span>
          <span className="tag-pill">安装目录与数据目录分离</span>
          <span className="tag-pill">升级新版本继续保留本地数据</span>
        </div>
      </section>
      <div className="first-run-grid">
        <SettingsPanel
          apiKeyInput={props.apiKeyInput}
          hasApiKey={props.hasApiKey}
          maskedApiKey={props.maskedApiKey}
          selectedModel={props.selectedModel}
          saving={props.saving}
          testing={props.testing}
          title="首次启动配置"
          description="免责协议勾选后即可进入主页。DeepSeek Key 和模型可以现在就配，也可以稍后到系统设置补充；后续升级时，本机数据会继续保留。"
          saveLabel="保存并进入主页"
          saveDisabled={saveDisabled}
          extraContent={
            <>
              <p className="settings-highlight-note">
                说明：AI 分析、AI 回答建议、AI 去重和 AI 备战建议都依赖大模型 API。如果暂时没有现成 Key，先进入首页也可以，后续使用这些功能时系统会提示你去系统设置完成配置。
              </p>
              <label className="agreement-box">
                <input
                  type="checkbox"
                  checked={props.disclaimerChecked}
                  onChange={(event) => props.onDisclaimerChange(event.target.checked)}
                />
                <span>我已阅读并接受开源声明与免责声明，同意自行保管本机上的 Key、简历、面试记录和备份数据。</span>
              </label>
            </>
          }
          onApiKeyChange={props.onApiKeyChange}
          onModelChange={props.onModelChange}
          onSave={props.onSave}
          onTestConnectivity={props.onTestConnectivity}
        />
        <section className="panel feature-panel first-run-disclaimer">
          <div className="panel-header compact-header">
            <div>
              <h2>开源声明与免责声明</h2>
              <p className="muted">未勾选前不能进入主页。</p>
            </div>
          </div>
          <DisclaimerContent />
        </section>
      </div>
    </main>
  );
}
