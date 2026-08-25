# Front-End Control Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有本地面试工作台前端重构成一版更清晰、更专业的控制台式界面，同时保持现有业务行为和测试覆盖。

**Architecture:** 以 `App.tsx` 为应用外壳重组入口层级，扩展 `WorkspaceNav.tsx` 的状态索引能力，保留现有业务页面组件但统一其标题区、动作区、内容卡和侧边列表样式；核心工作主要集中在 `web/src/styles.css` 和少量组件结构调整，不引入新的第三方 UI 依赖。

**Tech Stack:** React 19, TypeScript, Vite, CSS, Testing Library, Vitest

---

### Task 1: 锁定外壳与导航改造的回归测试

**Files:**
- Modify: `web/src/App.test.tsx`
- Modify: `web/src/interview-ui.test.tsx`

- [ ] 先补顶层控制台外壳测试，验证顶部标题、状态区域和左侧导航仍能渲染
- [ ] 补导航摘要和页面切换测试，确保 `作战总览 / 简历分析 / 面试场次库 / 高频问题库 / 系统设置` 路径不退化
- [ ] 运行相关前端测试，确认新增断言先失败再进入实现

### Task 2: 重构应用外壳与导航信息层级

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/WorkspaceNav.tsx`

- [ ] 在 `App.tsx` 重排顶部控制台头部、全局指标和主工作区结构
- [ ] 为 `WorkspaceNav.tsx` 增加序号、摘要、数量和运行状态展示
- [ ] 增加跳到主内容入口和更明确的辅助语义
- [ ] 运行 Task 1 对应测试直到通过

### Task 3: 重构总览页结构与主动作表达

**Files:**
- Modify: `web/src/workspace-overview-page.test.tsx`
- Modify: `web/src/components/WorkspaceOverviewPage.tsx`

- [ ] 先补总览页结构测试，覆盖新的指标区、当前焦点区和检索区
- [ ] 调整总览页 DOM 结构，使 AI 建议、待办和检索结果的层级更明确
- [ ] 保持现有搜索逻辑和按钮行为不变
- [ ] 运行总览页测试直到通过

### Task 4: 重构简历分析页的流程结构

**Files:**
- Modify: `web/src/analysis-view.test.tsx`
- Modify: `web/src/components/SettingsPanel.tsx`
- Modify: `web/src/components/UploadPanel.tsx`
- Modify: `web/src/components/AnalysisView.tsx`

- [ ] 先补简历页结构测试，覆盖紧凑设置卡、上传主卡和版本列表
- [ ] 为 `SettingsPanel.tsx` 增加紧凑模式，只保留 resume 工作流需要的信息密度
- [ ] 调整 `UploadPanel.tsx` 和 `AnalysisView.tsx` 的层级与元信息展示
- [ ] 运行简历页测试直到通过

### Task 5: 重构面试场次与高频题页面结构

**Files:**
- Modify: `web/src/interview-sessions-page.test.tsx`
- Modify: `web/src/high-frequency-page.test.tsx`
- Modify: `web/src/components/InterviewSessionsPage.tsx`
- Modify: `web/src/components/HighFrequencyPage.tsx`

- [ ] 先补场次页和高频题页结构断言，覆盖工具栏、列表头部和状态标签
- [ ] 调整场次页的创建区、工具栏、场次侧栏和问题卡层级
- [ ] 调整高频题页的主动作区、问题元信息和去重候选区块
- [ ] 运行对应测试直到通过

### Task 6: 统一样式系统并做最终验证

**Files:**
- Modify: `web/src/styles.css`
- Modify: `web/src/styles-performance.test.ts`

- [ ] 以 CSS 变量重建颜色、间距、圆角、边框和动效 token
- [ ] 统一外壳、导航、卡片、按钮、表单、列表、状态和响应式规则
- [ ] 保持 `content-visibility`、避免 `backdrop-filter`、避免 `position: sticky` 和 `radial-gradient`
- [ ] 运行 `npm test`
- [ ] 运行 `npm run build`
