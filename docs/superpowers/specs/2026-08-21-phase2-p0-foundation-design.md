# 本地面试工作台二阶段 P0 设计方案

日期：2026-08-21

## 1. 目标

本轮只做二阶段最核心的 P0 闭环，不推倒现有本地 Web Demo，也不强制迁移 SQLite。

P0 聚焦四件事：

1. 用统一问题库替换“高频问题库”的旧定位。
2. 把简历版本、面试场次、真实问法、标准问题、标准回答关系补齐。
3. 用软删除、删除保护、重复题处理和回答版本把本地数据闭环补完整。
4. 保持旧 `app-state.json` 和旧导出备份可迁移、可恢复。

## 2. 当前缺口

当前实现已经具备：

1. DeepSeek 本地配置和真实调用。
2. 简历分析、预测题、面试场次、高频问题库、AI 去重候选、作战总览、导入导出。

但当前结构仍有明显缺口：

1. “高频问题库”同时承载预测题、真实题、手工题，语义混乱。
2. 场次题和题库题是两套并列数据，没有 `Question / QuestionOccurrence` 关系。
3. 回答只有单个字符串，没有版本，也没有标准回答和场次覆盖的边界。
4. AI 回答默认依赖最近一份简历，无法绑定面试使用的简历版本。
5. 删除仍以物理删除为主，没有回收站，误删风险高。
6. AI 去重没有后续处理动作，候选只停在提示层。

## 3. P0 范围

### 3.1 必做

1. 统一问题库和高频自动统计。
2. `Question` 与 `QuestionOccurrence` 分离。
3. 旧 `analyses / interviewSessions / highFrequencyQuestions` 迁移。
4. 问题库、场次题、简历历史软删除和回收站。
5. 简历版本、主简历、面试绑定简历、回答时临时切换参考简历。
6. 预测题直接生成回答、加入问题库、收藏、忽略。
7. 标准回答与场次回答覆盖分离。
8. 标准回答版本管理。
9. AI 识别面试问题确认流。
10. 重复题处理闭环：保留、关联、删除、合并。
11. 全局搜索扩展到简历、面试、问题、回答、标签。
12. 旧备份导入兼容和 `backupVersion: 2` 导出。

### 3.2 本轮不做

1. 音频转写、说话人识别、实时助手。
2. 多账号、多用户、云同步。
3. SQLite 正式迁移。
4. 复杂 RAG、Embedding、向量库。
5. 回答风险检查、追问树、自动备份、桌面打包。

## 4. 数据模型

### 4.1 ResumeRecord

- `id`
- `displayName`
- `originalFileName`
- `version`
- `uploadedAt`
- `isPrimary`
- `parsedText`
- `profile`
- `predictedQuestions`
- `createdAt`
- `updatedAt`
- `deletedAt`

`predictedQuestions` 中的每题包含：

- `id`
- `questionText`
- `category`
- `tags`
- `linkedQuestionId`
- `favorite`
- `ignoredAt`
- `createdAt`
- `updatedAt`

### 4.2 InterviewRecord

- `id`
- `company`
- `position`
- `interviewDate`
- `round`
- `interviewType`
- `status`
- `jobDescription`
- `resumeId`
- `title`
- `notes`
- `sourceType`
- `sourceText`
- `sourceFileName`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `occurrences`

### 4.3 QuestionOccurrence

- `id`
- `questionId`
- `interviewId`
- `originalQuestion`
- `category`
- `tags`
- `askedAt`
- `notes`
- `confidence`
- `answerOverride`
- `answerOverrideUpdatedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

### 4.4 QuestionRecord

- `id`
- `standardQuestion`
- `category`
- `tags`
- `sourceTypes`
- `sourceRefs`
- `favorite`
- `masteryLevel`
- `priority`
- `frequency`
- `firstAskedAt`
- `lastAskedAt`
- `relatedQuestionIds`
- `currentAnswerId`
- `createdAt`
- `updatedAt`
- `deletedAt`

说明：

1. 高频不是独立容器，而是 `frequency >= threshold` 的问题属性。
2. `sourceRefs` 记录简历预测、手工添加等非面试来源。
3. 真实面试来源通过 `occurrences` 反查。

### 4.5 AnswerRecord

- `id`
- `questionId`
- `content`
- `version`
- `type`
- `source`
- `resumeId`
- `isCurrent`
- `createdAt`
- `updatedAt`
- `deletedAt`

标准回答只存到 `AnswerRecord`。场次个性化回答只写到 `QuestionOccurrence.answerOverride`。

## 5. 仓储层与迁移

本轮不切 SQLite，但要把读写边界抽出来。

新增仓储职责：

1. `resumeRepository`
2. `interviewRepository`
3. `questionRepository`
4. `answerRepository`
5. `settingsRepository`

初始实现仍基于单个 JSON 快照，但所有业务路由不再直接拼旧结构字段。

迁移策略：

1. 读取旧版快照时自动识别：
   - `analyses`
   - `interviewSessions`
   - `highFrequencyQuestions`
2. 旧 `AnalysisRecord` 转成 `ResumeRecord`。
3. 旧 `InterviewSessionRecord.questions` 转成 `QuestionOccurrence`。
4. 旧 `HighFrequencyQuestionRecord` 转成 `QuestionRecord`。
5. 如果旧场次题已关联高频题，则按 `highFrequencyId` 归并到同一标准问题。
6. 旧 `answerSuggestion`：
   - 高频题答案转成当前标准回答。
   - 场次题答案若与标准回答不同，则转成 `answerOverride`。
7. 导出新结构时写 `backupVersion: 2`，同时继续清空 API Key。

## 6. 关键业务规则

### 6.1 标准问题与真实问法

1. 每个真实场次题都保留原始问法。
2. 同一个标准问题可以关联多个 `QuestionOccurrence`。
3. `frequency` 由未删除的真实 `occurrences` 自动计算。

### 6.2 删除保护

1. 删除场次题默认只删当前 `occurrence`。
2. 如该题已关联标准问题，UI 必须明确区分：
   - 仅从本场删除
   - 同时删除标准问题
3. 删除标准问题时：
   - 默认只软删除标准问题
   - 保留真实 `occurrences`
   - 解除其他 `occurrence.questionId`
4. 不允许无提示级联物理删除真实面试记录。

### 6.3 回答规则

1. 标准问题展示当前标准回答。
2. 场次题默认继承标准回答。
3. 用户修改场次回答时必须二选一：
   - 改标准回答
   - 仅改本场回答
4. 改标准回答生成新 `AnswerRecord` 版本。
5. 仅改本场回答只写 `answerOverride`。

### 6.4 简历绑定规则

1. 系统始终标明主简历。
2. 新建面试默认绑定主简历，但允许切换。
3. 场次 AI 回答优先使用 `interview.resumeId`。
4. 单次 AI 调用允许临时切换参考简历，不改场次绑定。

### 6.5 重复题处理

1. AI 只给候选，不自动修改真实数据。
2. 候选动作：
   - 保留两个
   - 建立关联
   - 删除其中一个
   - 合并
3. 合并时允许：
   - 保留 A
   - 保留 B
   - 输入新的标准问题
4. 若双方都有回答，必须显式选择：
   - 保留 A
   - 保留 B
   - AI 综合

## 7. 页面调整

导航调整为：

1. 作战总览
2. 简历版本
3. 面试场次
4. 问题库
5. 系统设置

P0 页面重点：

1. 简历页显示版本列表、主简历、预测题和直接答题动作。
2. 面试页新增结构化字段、问题识别确认流、场次绑定简历。
3. 问题库页支持筛选、编辑、删除、收藏、掌握程度、重复题处理。
4. 设置页增加回收站和批量清空历史。

## 8. 核心验收

本轮至少验证以下主场景：

1. 两份简历 + 面试绑定指定简历后，AI 回答使用正确简历。
2. 两场不同面试问法可关联到同一标准问题并自动累计频率。
3. 场次回答只覆盖本场时，不污染标准回答。
4. 修改标准回答后，无覆盖的场次自动看到新版本。
5. 重复题合并后，来源、标签、出现次数和回答不丢失。
6. 删除标准问题时，不连带删除真实面试记录。
7. 自然语言面试复盘能进入“AI识别 -> 用户确认 -> 保存”流程。
8. 旧 `app-state.json` 和旧备份导入后，能迁移到新结构。

## 9. P0 实施顺序

1. 新状态模型、仓储层、迁移器。
2. 新后端 API 和 AI 结构化输出扩展。
3. 简历版本 + 面试结构化字段 + 问题库 API。
4. 回答版本、删除保护、重复题处理。
5. 前端重构与搜索、回收站。
6. 回归和场景验证。
