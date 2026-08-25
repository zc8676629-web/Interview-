import type { WorkspacePage } from "./WorkspaceNav";

interface WorkspaceGuidePageProps {
  onNavigate(page: WorkspacePage): void;
}

const WORKFLOW_STEPS = [
  {
    title: "1. 先放简历",
    detail: "上传当前要投递的版本，先拿到画像和第一批预测题。"
  },
  {
    title: "2. 再录真实场次",
    detail: "把最近一场面试沉淀进场次库，优先保留真实被问到的问题。"
  },
  {
    title: "3. 收进高频题库",
    detail: "把重复出现的问题集中维护，统一回答、去重和置顶。"
  },
  {
    title: "4. 最后看 AI 建议",
    detail: "等数据足够后再生成备战建议，建议才会更贴近你的真实面试情况。"
  }
];

const GUIDE_CARDS: Array<{
  id: WorkspacePage;
  title: string;
  summary: string;
  steps: string[];
  tip: string;
  actionLabel: string;
}> = [
  {
    id: "overview",
    title: "作战总览",
    summary: "先看当前有哪些数据、哪些还缺，再决定下一步先补哪里。",
    steps: [
      "先看关键统计，判断你现在是缺简历、缺场次还是缺回答。",
      "优先处理当前焦点，不要每个页面一起推进。",
      "当数据积累够了，再生成 AI 备战建议。"
    ],
    tip: "这页负责看状态和定方向。",
    actionLabel: "去作战总览"
  },
  {
    id: "resume",
    title: "简历分析",
    summary: "维护简历版本、简历画像和预测题，是所有后续回答的基础。",
    steps: [
      "上传当前版本的简历，先确认画像是否贴近你的真实经历。",
      "把预测题里有价值的问题继续补题、加入高频题库或直接生成回答。",
      "如果投递方向变化，就重新上传新的简历版本，不要硬复用旧画像。"
    ],
    tip: "运行环境配置统一在系统设置里处理。",
    actionLabel: "去简历分析"
  },
  {
    id: "interview-sessions",
    title: "面试场次库",
    summary: "专门记录真实面试，被问过的问题优先级永远高于猜测题。",
    steps: [
      "粘贴一场完整面试文本，让系统先整理出问题列表。",
      "对单题直接生成回答、加入高频题库或编辑问题。",
      "每场都留一份，后续复盘时才能看出重复题和薄弱点。"
    ],
    tip: "这里沉淀的是你的真实样本池。",
    actionLabel: "去面试场次库"
  },
  {
    id: "high-frequency",
    title: "高频问题库",
    summary: "把所有值得长期准备的问题收敛成一个统一口径库。",
    steps: [
      "把来自简历预测题和真实场次的问题集中到这里。",
      "编辑问题文本、分类、标签和回答稿，保持最终口径统一。",
      "把最常问、最关键的问题置顶，优先练这些题。"
    ],
    tip: "这里管理的是长期资产，不是一次性草稿。",
    actionLabel: "去高频问题库"
  },
  {
    id: "settings",
    title: "系统设置",
    summary: "统一管理 Key、模型、备份导入导出和回收站。",
    steps: [
      "先保存 API Key 并测试连通性，确认模型能正常工作。",
      "大改数据前先导出一份本地备份，避免误删。",
      "删除后的数据先去回收站，确认没问题再永久清理。"
    ],
    tip: "所有运行环境配置都收口在这里。",
    actionLabel: "去系统设置"
  }
];

export function WorkspaceGuidePage(props: WorkspaceGuidePageProps) {
  return (
    <section className="overview-stack">
      <article className="panel overview-guide-panel">
        <div className="panel-header overview-hero-header">
          <div>
            <h2>先看教程，再开始用工作台</h2>
            <p className="muted">这套系统更适合长期沉淀，不建议一上来就在不同模块里来回跳。先按顺序上手，后面会省很多时间。</p>
          </div>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => props.onNavigate("resume")}>
              从简历分析开始
            </button>
            <button type="button" className="secondary-button" onClick={() => props.onNavigate("overview")}>
              去看作战总览
            </button>
          </div>
        </div>
        <div className="overview-guide-flow">
          {WORKFLOW_STEPS.map((item) => (
            <article key={item.title} className="overview-guide-step">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </article>
          ))}
        </div>
      </article>

      <article className="panel overview-panel">
        <div className="panel-header compact-header">
          <div>
            <h3>模块教程</h3>
            <p className="muted">每个模块做什么、先做什么、做到什么程度算合适，都集中放在这里。</p>
          </div>
        </div>
        <div className="overview-guide-grid">
          {GUIDE_CARDS.map((card) => (
            <article key={card.id} className="overview-guide-card">
              <div className="overview-guide-card-copy">
                <h4>{card.title}</h4>
                <p className="muted">{card.summary}</p>
              </div>
              <ol>
                {card.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="overview-guide-card-footer">
                <span className="meta">{card.tip}</span>
                <button type="button" className="ghost-button" onClick={() => props.onNavigate(card.id)}>
                  {card.actionLabel}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
