# 导游系统架构

## 1. 产品定义

本项目中的智能导览，不是通用聊天助手，也不是网页外挂问答框。

它的目标是：

- 像一位在场的引路人，而不是被动客服
- 先理解游客所处场景，再决定是否开口
- 能说、能引、能带路，但不过度打扰
- 尽量基于项目内部资料回答，而不是空泛生成

一句话定义：

`泉上引路人` 是一个有场景感知、资料检索、空间判断与页面行动能力的游园同行者。

## 2. 当前已落地的能力

当前系统已经具备以下基础能力：

- 导游人格、语气、规则已拆分为独立 prompt 文件
- 前端会将当前页面、当前景点、已访问点位、当前路线、相关点位传给后端
- 后端会先做轻量资料召回，再把相关证据送入模型
- 后端支持结构化动作：`open_spot`、`select_route`、`go_home`
- 前端会执行模型动作，完成景点跳转、路线切换、回总览
- 支持会话级短记忆
- 支持 OpenAI `responses` 与兼容 `chat.completions` 的双通道模型接入
- 支持低打扰轻提示、到站轻讲、打开导览后的续讲

## 3. 系统分层

推荐将导游系统明确为六层。

### 3.1 Presence Layer

职责：决定导游什么时候出现、什么时候收起、什么时候只做轻提醒。

当前状态：

- 已有轻提示广播与自动收起
- 已有开场、到站、续讲逻辑

后续目标：

- 不把导游做成常驻聊天框
- 让导游主要以“报站、轻引、顺势提醒”的方式存在
- 只有在用户明确需要时才展开完整面板

### 3.2 Scene Layer

职责：理解游客当前所处的游览状态。

输入包括：

- 当前页面：首页 / 总览 / 景点详情 / 碑刻页
- 当前景点
- 当前路线
- 已访问点位
- 相邻景点
- 当前触发事件

后续目标：

- 增加事件维度，例如“首次进入”“停留过久”“反复悬停未点击”“图像区停留”
- 为每种场景定义引导策略

### 3.3 Retrieval Layer

职责：从项目内部资料中快速找到“当前最值得引用”的证据。

目标要求：

- Precision first
- Relevance first
- Low latency

推荐策略：

1. 离线切块，不在运行时扫描整篇长文
2. 为每个知识块补全元数据
3. 先做场景过滤，再做召回
4. 使用混合检索：关键词 + 实体别名 + rerank
5. 最终只向模型提供少量高质量证据块

推荐知识块字段：

- `chunk_id`
- `spot_id`
- `kind`
- `source`
- `era`
- `world`
- `keywords`
- `priority`
- `text`

### 3.4 Narration Layer

职责：把证据与场景翻译成“像导游说的话”。

约束：

- 先点明眼前所见
- 再补一层历史或空间关系
- 最后顺势给出下一步引导
- 优先短、轻、稳，不写成论文

后续目标：

- 针对首页、总览、景点详情、碑刻页分别设计不同叙事模版
- 区分“轻陪看”和“深讲解”两种叙事强度

### 3.5 Action Layer

职责：把导游判断转成网页动作。

当前动作：

- `open_spot`
- `select_route`
- `go_home`

后续候选动作：

- `focus_hotspot`
- `open_image_mode`
- `highlight_route_segment`
- `scroll_to_section`
- `suggest_compare_spot`

原则：

- 强动作应以用户明确意图为前提
- 默认优先“建议”而不是“擅自跳转”
- 页面动作要为沉浸感服务，而不是为了炫技

### 3.6 Memory Layer

职责：记住“这一次同行”和“这个园子里常见的游览规律”。

推荐拆成四层：

1. Static guide rules
2. Shared world knowledge
3. Session memory
4. Public aggregated memory

重点原则：

- 记路，不记人
- 记当前同行，不记永久个体身份
- 记群体模式，不记大量原始私有对话

## 4. 文档化管理建议

不强行模仿外部命名，按职责清晰管理即可。

推荐文件：

- `guide-core.md`
- `guide-voice.md`
- `guide-presence.md`
- `guide-actions.md`
- `guide-memory-policy.md`
- `guide-retrieval-policy.md`
- `guide-scene-playbook.md`

当前文件与推荐职责的对应关系：

- `server/prompts/guide-backend-system.md` -> `guide-core.md`
- `src/guide/prompts/persona.md` -> `guide-voice.md`
- `src/guide/prompts/experience-rules.md` -> `guide-presence.md` + `guide-scene-playbook.md`

后续可逐步迁移，不必一次性重构命名。

## 5. 近期优先级

### Priority A

- 把内部资料切成知识块并补齐 metadata
- 引入场景过滤后的精准检索
- 设计公共记忆结构，不直接存用户原始身份

### Priority B

- 将“轻提示触发”从静态文案升级为事件驱动策略
- 为不同页面补齐 scene playbook
- 增加缓存与预取，减少响应等待

### Priority C

- 引入轻量知识图谱
- 增加更多细粒度页面动作
- 为热门问题与高频导览段落增加公共记忆辅助

## 6. 判断标准

后续所有导游能力都应通过这四个标准来判断值不值得做：

- 是否更自然
- 是否更精准
- 是否更省打扰
- 是否更像真正带人游园

如果只是在增加技术名词，而没有让游客更像“被带着走”，就不应优先实现。
