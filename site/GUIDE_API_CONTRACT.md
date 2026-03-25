# 导游 API 接口约定

前端已经内置：

- 导游 UI
- 本地 `mock`
- 真实 API 适配层
- 前端可执行动作 `actions`

现在仓库里也已经附带了一个本地可跑的后端脚手架：

- `server/guide-agent.ts`

## 推荐接法

推荐让网页请求你自己的后端导游 API，而不是让前端直接请求 OpenAI。

原因：

- `public/guide-agent.config.json` 是公开文件
- 真实 OpenAI 密钥应该放在后端
- 后端更适合保存导游人设、知识文件和系统规则
- 后端更适合做上下文拼装、结构化输出和安全控制

## 本地开发默认路径

本地联调建议使用：

```text
/api/guide
```

Vite 已经代理到本地后端端口 `8787`。

健康检查：

```text
GET /api/guide/health
```

正式调用：

```text
POST /api/guide
```

## 请求方式

```http
POST {apiUrl}
Content-Type: application/json
Authorization: Bearer {apiToken}
```

其中 `Authorization` 可选。如果你在后端设置了 `GUIDE_SERVER_TOKEN`，前端这里就填对应公开 token。

## 请求体

示例：

```json
{
  "sessionId": "guide-lq3m4u-1ax9bm",
  "input": "带我去乾隆行宫",
  "mode": "ask",
  "currentView": "home",
  "currentSpotId": null,
  "visitedSpotIds": ["weiyuan-temple"],
  "activeRouteId": "first-arrival",
  "currentSpot": null,
  "relatedSpots": [],
  "guideBundle": {
    "persona": "......",
    "experienceRules": "......",
    "profileName": "泉上引游人",
    "profileSubtitle": "不急着回答，先陪你入景",
    "routeCatalog": [
      {
        "id": "first-arrival",
        "title": "初入北岸",
        "subtitle": "从门庭与古庙缓缓入景",
        "description": "先看入园气口，再从门庭、题刻与旧学脉慢慢铺开。",
        "prompt": "请带我走一条适合第一次游览的北岸入园线",
        "spotIds": ["weiyuan-temple", "yongjin-pavilion", "qianlong-palace"]
      }
    ]
  }
}
```

## 返回体

示例：

```json
{
  "sessionId": "guide-lq3m4u-1ax9bm",
  "reply": {
    "id": "guide-k82m0d",
    "role": "guide",
    "mode": "route",
    "title": "转往乾隆行宫",
    "content": "这就带你去乾隆行宫。先别急着读满资料，到了那里先看它最醒目的气口。",
    "suggestedPrompts": [
      "到了后先讲一段",
      "顺着这一处再往下走",
      "回总览再看全局"
    ],
    "suggestedSpotIds": ["qianlong-palace", "south-hall"],
    "actions": [
      { "type": "select_route", "routeId": "academy" },
      { "type": "open_spot", "spotId": "qianlong-palace" }
    ]
  }
}
```

## `mode` 说明

- `welcome`: 总览开场、入园引导
- `story`: 当前建筑讲解
- `route`: 路线推荐或引路
- `image`: 图像讲解
- `ask`: 自由提问

## `actions` 说明

当前前端支持这三种动作：

### 1. 打开建筑详情

```json
{ "type": "open_spot", "spotId": "qianlong-palace" }
```

### 2. 返回总览首页

```json
{ "type": "go_home" }
```

### 3. 切换当前游线

```json
{ "type": "select_route", "routeId": "waterfront" }
```

后端可以一次返回多个动作，前端会按顺序执行。

推荐组合：

```json
[
  { "type": "select_route", "routeId": "waterfront" },
  { "type": "open_spot", "spotId": "qinghui-pavilion" }
]
```

## 运行时 JSON 配置

前端优先读取：

```text
public/guide-agent.config.json
```

推荐本地联调配置：

```json
{
  "enabled": true,
  "apiUrl": "/api/guide",
  "apiToken": "",
  "supportsClientActions": true,
  "actionSchemaVersion": "1.0",
  "notes": "Do not place a raw OpenAI secret key in this public file."
}
```

注意：

- 编辑 `public/guide-agent.config.json`
- 不要编辑 `dist/guide-agent.config.json`
- 不要把原始 OpenAI 密钥放进公开 JSON

## 现在仓库里的后端脚手架做了什么

`server/guide-agent.ts` 已经实现：

- `POST /api/guide`
- `GET /api/guide/health`
- 读取 `.env.guide`
- 读取本地后端提示词文件
- 调用 OpenAI `Responses API`
- 使用结构化输出约束 reply 格式
- 支持 `previous_response_id` 会话状态
- 返回前端可直接执行的 `actions`

## 后端推荐做法

推荐流程：

1. 接收前端当前上下文
2. 读取后端自己的导游人设与知识文件
3. 结合 `spotId`、`activeRouteId`、访问历史组织上下文
4. 调用模型生成导游回复
5. 如需跳转页面，返回结构化 `actions`

## 关于人设文件

前端目前也会随请求带上最小可用语料：

- `persona`
- `experienceRules`
- `routeCatalog`

这样你可以先把接口跑通。

但更稳妥的生产方案仍然是：

- 后端保存自己的导游人设文件
- 后端保存路线导语、建筑短讲、图像解释模板
- 前端传来的 `guideBundle` 只作为补充或版本提示
