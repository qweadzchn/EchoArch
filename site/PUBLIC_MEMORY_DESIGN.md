# 公共记忆设计

## 1. 目标

公共记忆不是为了“记住游客本人”，而是为了让导游逐步学会这个园子里最常见的游览规律。

它服务于三个目标：

- 提高导游引导的命中率
- 降低重复问题的推理成本
- 在不打扰用户的前提下，让导游更像有经验的真人

一句话原则：

公共记忆记的是`游览模式`，不是`个人身份`。

## 2. 不做什么

公共记忆明确不承担以下职责：

- 不长期保存可识别的用户身份
- 不长期保存完整原始对话全文
- 不把一次偶然问题直接升格为系统记忆
- 不直接覆盖人工写定的人格与规则

## 3. 四层记忆模型

### 3.1 Static rules

人工维护，变化慢。

例如：

- 导游气质
- 页面动作边界
- 不该频繁出现的原则

### 3.2 Shared world knowledge

项目资料、图像说明、路线关系、碑刻内容、建筑关系。

这是导游的“知识底座”，应通过知识块和关系结构来管理。

### 3.3 Session memory

当前一次游览过程的短记忆。

例如：

- 当前路线
- 最近访问的点位
- 最近 3 到 8 轮交流
- 当前游客偏向细看还是快走

### 3.4 Public aggregated memory

匿名聚合后的群体经验。

例如：

- 某景点最常被问的 5 类问题
- 某页面最容易被忽略的细节
- 哪种轻提示最有效
- 哪条路线最常被接受

## 4. 公共记忆推荐条目

推荐优先维护以下五类。

### 4.1 Hot questions by spot

字段建议：

- `spot_id`
- `question_cluster`
- `frequency_30d`
- `answer_strategy`
- `last_seen_at`
- `confidence`

用途：

- 让导游优先准备高频讲解内容
- 给检索层提供更稳定的召回入口

### 4.2 Common confusions

字段建议：

- `scene_id`
- `confusion_type`
- `symptom`
- `recommended_hint`
- `frequency_30d`
- `last_seen_at`

用途：

- 用来提前提醒用户
- 用来优化页面引导而不是等用户发问

### 4.3 Effective hint patterns

字段建议：

- `scene_id`
- `trigger`
- `hint_text`
- `success_metric`
- `confidence`
- `cooldown_minutes`

用途：

- 控制导游“什么时候轻轻出现”
- 减少无效打扰

### 4.4 Route acceptance patterns

字段建议：

- `route_id`
- `entry_scene`
- `acceptance_rate`
- `best_intro_style`
- `best_next_stop`

用途：

- 让路线推荐更像经验丰富的导游，而不是固定模板

### 4.5 Blind spots

字段建议：

- `scene_id`
- `overlooked_target`
- `best_recovery_hint`
- `evidence_count`

用途：

- 提醒用户容易漏看的区域、细部、图像重点

## 5. 更新策略

公共记忆不应在每一轮对话后直接写入。

推荐采用三段式更新：

1. Event logging
2. Daily or batch aggregation
3. Memory summarization and curation

### 5.1 Event logging

只记录匿名事件，不记录可识别身份。

例如：

- 进入哪个场景
- 点击了哪个提示
- 问了哪类问题
- 是否接受路线推荐
- 是否执行了导游建议动作

### 5.2 Batch aggregation

将原始事件归纳为统计模式。

例如：

- `overview:first-visit` 场景中，`first-route-hint` 的点击率提高了 22%
- `boat-house` 页面中，很多人会问“这处和湖心亭什么关系”

### 5.3 Memory summarization

只有超过阈值的模式才进入公共记忆。

建议阈值：

- 连续出现 >= 10 次的问题聚类
- 连续 7 天稳定生效的提示
- 有明显点击提升的引导语

## 6. 如何在运行时使用公共记忆

公共记忆不应整份塞给模型，而应按场景读取。

推荐流程：

1. 先识别当前 `scene_id`
2. 读取该场景最相关的 1 到 3 条公共记忆
3. 将其作为“辅助策略”提供给 Presence Layer 或 Retrieval Layer
4. 只有真正需要语言生成时，再给模型

优先使用顺序：

1. 页面事件规则
2. 公共记忆中的有效提示
3. 检索证据
4. 模型生成

## 7. Token 与性能策略

为了控制成本，公共记忆主要承担“提前收束问题”的作用。

推荐策略：

- 轻提示尽量由前端事件系统和公共记忆完成
- 高频问题优先走缓存和预设答法
- 模型调用只用于真正需要叙事变化的时刻
- 公共记忆以短摘要存储，不存长文本

## 8. 隐私与边界

公共记忆应遵守以下原则：

- 不保存账号身份
- 不保存真实姓名、联系方式等个人信息
- 不把原始对话长久保存为可回溯档案
- 对任何记忆条目设置过期和降权机制

## 9. 实施顺序

### Phase 1

- 定义 schema
- 建立空白 seed 文件
- 先接入 `common_confusions` 与 `effective_hint_patterns`

### Phase 2

- 记录匿名事件
- 做离线聚合脚本
- 让公共记忆参与轻提示策略

### Phase 3

- 让公共记忆参与检索排序
- 让路线推荐引用群体经验
- 结合知识图谱补充更细的空间关系判断

## 10. 核心判断标准

公共记忆只有在满足以下条件时才算成功：

- 让导游更自然，而不是更爱说话
- 让引导更提前，而不是更频繁
- 让回答更精准，而不是更长
- 让成本更低，而不是更高
