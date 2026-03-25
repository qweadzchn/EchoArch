# 百泉古建筑群导游 Agent 接入报告

更新日期：2026-03-20

## 当前结论

这个项目最适合的形态不是“聊天网页”，而是：

- 开放世界式总览探索
- 随时可介入的导游路引
- 后端 Agent 返回结构化动作
- 前端执行页面跳转与路线切换

## 已落地

前端已经支持：

- 可拖动导游入口
- `open_spot`
- `go_home`
- `select_route`
- 本地 `mock`
- 公开 JSON 配置

本轮又补上了后端脚手架：

- `server/guide-agent.ts`
- `server/prompts/guide-backend-system.md`
- `.env.guide.example`
- `vite.config.ts` 本地代理

## 后端脚手架能力

现在仓库里的后端可以：

- 读取 `.env.guide`
- 提供 `GET /api/guide/health`
- 提供 `POST /api/guide`
- 调用 OpenAI `Responses API`
- 使用结构化输出约束返回格式
- 按 `sessionId` 保存 `previous_response_id`
- 返回前端可直接执行的 `actions`

## 为什么这样接更合适

这类网站不适合让模型直接自由控制 DOM。

更稳的模式是：

1. 前端把当前页面状态和导游语料发给后端
2. 后端组织上下文并调用模型
3. 模型返回导游文本和结构化动作
4. 前端执行动作

例如：

```json
{
  "reply": {
    "content": "这就带你去乾隆行宫。",
    "actions": [
      { "type": "select_route", "routeId": "academy" },
      { "type": "open_spot", "spotId": "qianlong-palace" }
    ]
  }
}
```

## 人设与语料建议

建议继续保持“文件化”：

- `src/guide/prompts/persona.md`
- `src/guide/prompts/experience-rules.md`
- `server/prompts/guide-backend-system.md`

后续再补：

- 每个建筑短讲
- 每条路线导语
- 实景 / 古风 / 素描图解释模板

## 官方资料结论

基于 OpenAI 官方资料，我这次后端脚手架采用的是：

- `Responses API` 作为主交互入口
- 结构化输出保证 reply 形状稳定
- 会话状态通过 `previous_response_id` 串联

参考：

- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/docs/guides/conversation-state
- https://platform.openai.com/docs/guides/structured-outputs
- https://platform.openai.com/docs/guides/function-calling

## 下一步

建议按这个顺序继续：

1. 先把真实后端跑通
2. 给每个建筑补导游短讲
3. 加强“报站 / 转场 / 下一站”节奏
4. 再考虑接 TTS 和更强的沉浸导览
