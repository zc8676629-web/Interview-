# Interview Phase2 P0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不推倒现有本地 Web Demo 的前提下，完成统一问题库、简历版本绑定、回答版本、软删除和旧数据迁移的 P0 主链路。

**Architecture:** 先在服务端重建状态模型和迁移器，再扩展 API 暴露简历、面试、问题库、回答和回收站动作，最后让前端页面切到新的实体关系和交互。所有数据继续保存在本地 JSON，旧 `backup version 1` 自动迁移到 `backupVersion 2`。

**Tech Stack:** Express, TypeScript, React, Vitest, Zod, DeepSeek API, 本地 JSON 持久化

---

### Task 1: 重建状态模型与迁移器

**Files:**
- Modify: `server/src/lib/app-state.ts`
- Test: `server/src/lib/app-state.test.ts`

- [ ] 先补失败测试，覆盖旧分析/旧场次/旧高频题迁移到新结构。
- [ ] 扩展状态类型为 `resumes / interviews / questions / answers / recycleBin`。
- [ ] 新增软删除、恢复、永久删除和频率重算辅助函数。
- [ ] 让 `replaceSnapshot` 同时支持旧版和新版导入。
- [ ] 运行 `npm test -- server/src/lib/app-state.test.ts` 并确认通过。

### Task 2: 扩展 AI 层

**Files:**
- Modify: `server/src/lib/interview-ai.ts`
- Test: `server/src/lib/interview-ai.test.ts`

- [ ] 先补失败测试，覆盖问题识别确认结构、回答来源约束和回答合并。
- [ ] 为问题识别结果增加 `originalQuestion` 和 `confidence`。
- [ ] 为回答生成增加参考简历、回答长度、回答侧重点、来源摘要。
- [ ] 新增重复题回答合并辅助能力。
- [ ] 运行 `npm test -- server/src/lib/interview-ai.test.ts` 并确认通过。

### Task 3: 重做服务端业务 API

**Files:**
- Modify: `server/src/app.ts`
- Test: `server/src/interview-api.test.ts`

- [ ] 先补失败测试，覆盖简历版本、面试绑定简历、问题库 CRUD、回答版本、回收站和重复题处理。
- [ ] 新增简历版本相关接口。
- [ ] 新增结构化面试和问题确认保存接口。
- [ ] 新增统一问题库、回答版本、删除保护、重复题处理接口。
- [ ] 新增回收站、恢复、永久删除、一键清空简历历史接口。
- [ ] 运行 `npm test -- server/src/interview-api.test.ts` 并确认通过。

### Task 4: 重写前端类型与 API 封装

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] 将前端类型切换到 `Resume / Interview / Question / Answer / RecycleBin`。
- [ ] 新增简历版本、问题库、回答版本、回收站和重复题动作接口封装。
- [ ] 保留旧导入导出兼容字段，确保页面初始化不崩。

### Task 5: 重构简历和面试页面

**Files:**
- Modify: `web/src/components/AnalysisView.tsx`
- Modify: `web/src/components/InterviewSessionsPage.tsx`
- Test: `web/src/analysis-view.test.tsx`
- Test: `web/src/interview-sessions-page.test.tsx`

- [ ] 先补失败测试，覆盖主简历、面试绑定简历、预测题直接生成回答、AI识别确认流。
- [ ] 把简历分析页改成简历版本页。
- [ ] 为预测题增加 `生成回答 / 加入问题库 / 收藏 / 忽略`。
- [ ] 为面试新建页增加结构化字段和绑定简历。
- [ ] 为场次题增加删除保护和“改标准/改本场”分流。
- [ ] 运行对应前端测试并确认通过。

### Task 6: 重构问题库与回收站

**Files:**
- Modify: `web/src/components/HighFrequencyPage.tsx`
- Modify: `web/src/components/SettingsPanel.tsx`
- Modify: `web/src/components/WorkspaceOverviewPage.tsx`
- Modify: `web/src/components/WorkspaceNav.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/styles.css`
- Test: `web/src/high-frequency-page.test.tsx`
- Test: `web/src/workspace-overview-page.test.tsx`
- Test: `web/src/App.test.tsx`

- [ ] 先补失败测试，覆盖统一问题库筛选、重复题处理、回收站和扩展搜索。
- [ ] 将“高频问题库”重命名为“问题库”，并加入筛选与掌握度。
- [ ] 增加重复题候选动作：保留、关联、删除、合并。
- [ ] 在设置区加入回收站、恢复、永久删除和一键清空简历历史。
- [ ] 扩展总览搜索到简历、原始问法、标准问题、回答和标签。
- [ ] 运行对应前端测试并确认通过。

### Task 7: 全量验证

**Files:**
- Verify existing files only

- [ ] 运行 `npm test`
- [ ] 运行 `npm run build`
- [ ] 运行本地服务并检查主链路
- [ ] 用旧结构快照验证自动迁移
- [ ] 手动走通简历绑定、问题关联、答案覆盖、删除保护和回收站
