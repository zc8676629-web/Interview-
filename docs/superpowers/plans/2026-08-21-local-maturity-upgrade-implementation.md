# 本地面试工作台成熟度升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有本地面试工作台补齐作战总览、AI 备战建议、全局检索和本地备份导入导出能力。

**Architecture:** 服务端扩展本地状态结构与接口，新增全局 AI 复盘能力和导入导出能力；前端新增作战总览页面，以只读统计、统一检索和 AI 建议卡片承载核心升级。所有新增数据继续保存在本地状态文件中，不引入云端依赖。

**Tech Stack:** Express, TypeScript, React, Vitest, DeepSeek API, 本地 JSON 持久化

---

### Task 1: 扩展状态模型与 AI 能力

**Files:**
- Modify: `server/src/lib/app-state.ts`
- Modify: `server/src/lib/interview-ai.ts`
- Test: `server/src/lib/app-state.test.ts`
- Test: `server/src/lib/interview-ai.test.ts`

- [ ] 定义 `PrepInsightRecord` 与导入导出所需的状态结构
- [ ] 先补失败测试，验证状态持久化和 AI 备战建议结构
- [ ] 为 store 增加保存 AI 建议、导出快照、导入快照方法
- [ ] 为 AI 层新增 `generatePrepInsights`
- [ ] 运行对应测试直到通过

### Task 2: 扩展服务端接口

**Files:**
- Modify: `server/src/app.ts`
- Test: `server/src/interview-api.test.ts`

- [ ] 先补失败测试，覆盖 AI 备战建议生成与备份导入导出
- [ ] 新增 `POST /api/prep-insights/generate`
- [ ] 新增 `GET /api/data/export`
- [ ] 新增 `POST /api/data/import`
- [ ] 保证导出内容不带 API Key
- [ ] 运行服务端测试直到通过

### Task 3: 扩展前端 API 层

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] 补齐 `PrepInsightRecord`、导出包结构、全局检索所需类型
- [ ] 新增 AI 备战建议、导入导出接口封装
- [ ] 扩展 bootstrap 数据结构

### Task 4: 新增作战总览页面

**Files:**
- Create: `web/src/components/WorkspaceOverviewPage.tsx`
- Modify: `web/src/components/WorkspaceNav.tsx`
- Modify: `web/src/App.tsx`
- Test: `web/src/interview-ui.test.tsx`
- Test: `web/src/App.test.tsx`

- [ ] 先补失败测试，验证导航与作战总览入口
- [ ] 实现核心统计卡
- [ ] 实现待办提示卡
- [ ] 实现统一搜索结果区
- [ ] 实现 AI 备战建议卡
- [ ] 运行前端测试直到通过

### Task 5: 新增本地备份导入导出与反馈细化

**Files:**
- Modify: `web/src/components/SettingsPanel.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/styles.css`

- [ ] 在设置区增加导出与导入入口
- [ ] 加入导入文件选择与执行逻辑
- [ ] 为 AI 建议、备份、导入动作补齐清晰反馈
- [ ] 调整卡片、列表、搜索区视觉层级与滚动负担

### Task 6: 最终验证

**Files:**
- Modify: `web/src/styles-performance.test.ts`

- [ ] 运行 `npm test`
- [ ] 运行 `npm run build`
- [ ] 启动本地服务并验证页面可打开
- [ ] 检查作战总览、AI 备战建议、导出导入是否可用
