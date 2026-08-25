type WorkspacePage = "guide" | "overview" | "resume" | "interview-sessions" | "high-frequency" | "settings";

interface WorkspaceSummary {
  focusCount: number;
  resumeCount: number;
  sessionCount: number;
  highFrequencyCount: number;
  dedupeCount: number;
  hasApiKey: boolean;
  selectedModel: string;
}

interface WorkspaceNavProps {
  current: WorkspacePage;
  onChange(page: WorkspacePage): void;
  summary: WorkspaceSummary;
}

const ITEMS: Array<{
  id: WorkspacePage;
  label: string;
  code: string;
  helper: string;
  getMeta(summary: WorkspaceSummary): string;
}> = [
  {
    id: "guide",
    label: "使用教程",
    code: "01",
    helper: "先看上手顺序和每个模块怎么用",
    getMeta: () => "先看这里"
  },
  {
    id: "overview",
    label: "作战总览",
    code: "02",
    helper: "看状态、看缺口、看下一步",
    getMeta: (summary) => `${summary.focusCount} 项焦点`
  },
  {
    id: "resume",
    label: "简历分析",
    code: "03",
    helper: "维护回答依据简历、画像和预测题",
    getMeta: (summary) => `${summary.resumeCount} 份`
  },
  {
    id: "interview-sessions",
    label: "面试场次库",
    code: "04",
    helper: "沉淀真实场次和回答稿",
    getMeta: (summary) => `${summary.sessionCount} 场`
  },
  {
    id: "high-frequency",
    label: "高频问题库",
    code: "05",
    helper: "统一口径、置顶重点问题",
    getMeta: (summary) => `${summary.highFrequencyCount} 题`
  },
  {
    id: "settings",
    label: "系统设置",
    code: "06",
    helper: "本地设置、备份和回收站",
    getMeta: (summary) => (summary.hasApiKey ? "已就绪" : "待配置")
  }
];

export function WorkspaceNav(props: WorkspaceNavProps) {
  return (
    <aside className="workspace-nav">
      <div className="workspace-nav-header">
        <span className="workspace-nav-caption">工作台</span>
        <strong>本地面试工作台</strong>
        <p>按模块管理简历、场次与题库，把所有核心数据稳定留在本机。</p>
      </div>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={props.current === item.id ? "workspace-nav-item active" : "workspace-nav-item"}
          aria-label={item.label}
          aria-pressed={props.current === item.id}
          onClick={() => props.onChange(item.id)}
        >
          <span className="workspace-nav-index" aria-hidden="true">
            {item.code}
          </span>
          <span className="workspace-nav-copy" aria-hidden="true">
            <span className="workspace-nav-label">{item.label}</span>
            <span className="workspace-nav-helper">{item.helper}</span>
          </span>
          <span className="workspace-nav-meta" aria-hidden="true">
            {item.getMeta(props.summary)}
          </span>
        </button>
      ))}
      <div className="workspace-nav-footer">
        <span>本机模式</span>
        <strong>{props.summary.hasApiKey ? props.summary.selectedModel : "等待配置 API"}</strong>
        <span>{`待确认重复题 ${props.summary.dedupeCount} 组`}</span>
      </div>
    </aside>
  );
}

export type { WorkspacePage, WorkspaceSummary };
