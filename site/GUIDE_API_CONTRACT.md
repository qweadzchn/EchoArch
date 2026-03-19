# 导游 API 接口约定

前端已经内置导游 UI、本地 `mock` 模式和后续真实 Agent 的适配层。

只要提供：

- `VITE_GUIDE_API_URL`
- 可选：`VITE_GUIDE_API_TOKEN`

就可以从本地演示切到真实后端。

## 请求方式

```http
POST {VITE_GUIDE_API_URL}
Content-Type: application/json
Authorization: Bearer {VITE_GUIDE_API_TOKEN}
```

其中 `Authorization` 可省略。

## 请求体

示例：

```json
{
  "sessionId": "guide-lq3m4u-1ax9bm",
  "input": "请先讲讲这一处",
  "mode": "story",
  "currentView": "detail",
  "currentSpotId": "weiyuan-temple",
  "visitedSpotIds": ["weiyuan-temple"],
  "activeRouteId": "first-arrival",
  "currentSpot": {
    "id": "weiyuan-temple",
    "order": 1,
    "name": "卫源庙",
    "region": "北岸门庭",
    "world": "north-shore",
    "era": "隋启明清风貌",
    "highlight": "百泉“点睛之笔”",
    "mood": "中轴古庙",
    "accent": "#b88a4b",
    "position": { "x": 324, "y": 220 },
    "description": "......",
    "excerpt": "......",
    "fullText": "......",
    "related": ["yongjin-pavilion", "south-hall", "qianlong-palace"],
    "images": []
  },
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
    "mode": "story",
    "title": "卫源庙 · 导览短讲",
    "content": "眼前这一处是卫源庙......",
    "suggestedPrompts": [
      "这一处最值得细看哪个细节",
      "这座建筑和附近景点怎么串起来看"
    ],
    "suggestedSpotIds": ["yongjin-pavilion", "south-hall"]
  }
}
```

## mode 说明

- `welcome`：总览页开场、入园引导
- `story`：当前建筑讲解
- `route`：路线推荐
- `image`：图像讲解
- `ask`：自由提问

## 后端推荐做法

推荐后端流程：

1. 接收当前前端上下文
2. 使用后端自己的系统提示词作为主提示
3. 参考前端传来的 `guideBundle` 和 `activeRouteId`
4. 调用 OpenAI `Responses API`
5. 返回统一格式数据

## 关于人设文件

当前前端已经把最小可用的人设与规则打包传入：

- `persona.md`
- `experience-rules.md`
- `routeCatalog`

这能保证你后面“只接一个 API”也能先跑起来。

但更稳妥的生产做法仍然是：

- 后端保存自己的导游人设文件
- 后端保存路线说明与讲解规则
- 前端传来的 `guideBundle` 只作为兜底或版本提示

## 推荐的后端能力

如果后面继续深化，后端最好再提供这些能力：

- 根据 `spotId` 读取建筑上下文
- 根据 `activeRouteId` 生成更连贯的路线讲解
- 根据图片类型做图像说明
- 生成适合口播的短讲解文本

这样后续扩到语音讲解时，不需要重做接口结构。
