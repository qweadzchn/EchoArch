# 百泉古建筑群展示站

这是一个基于 `React + TypeScript + Vite` 的古建筑群数字展示网站。

当前已包含：

- 总览图首页与点位互动
- 独立建筑详情页
- 古风导游伴游组件
- 本地 `mock` 导游
- 可接入真实后端 API 的导游协议
- 可拖动入口与页面动作跳转
- 本地可跑的导游后端脚手架

## 运行前端

第一次运行：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm install
npm run sync:content
npm run dev
```

开发地址通常是：

```text
http://127.0.0.1:5173
```

## 运行导游后端

先复制环境文件：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
Copy-Item .env.guide.example .env.guide
```

然后打开 `.env.guide`，至少填：

```env
OPENAI_API_KEY=你的_OpenAI_Key
OPENAI_GUIDE_MODEL=gpt-5-mini
GUIDE_API_PORT=8787
GUIDE_ALLOWED_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
GUIDE_SERVER_TOKEN=
GUIDE_USE_CONVERSATION_STATE=true
```

启动后端：

```powershell
npm run guide:dev
```

如果你想前后端一起开：

```powershell
npm run dev:all
```

本地健康检查：

```text
http://127.0.0.1:8787/api/guide/health
```

## 前端怎么接后端 API

编辑这个文件：

```text
public/guide-agent.config.json
```

不要编辑：

```text
dist/guide-agent.config.json
```

`dist/` 只是构建产物，每次重新构建都会被覆盖。

本地联调推荐这样配：

```json
{
  "enabled": true,
  "apiUrl": "/api/guide",
  "apiToken": "",
  "supportsClientActions": true,
  "actionSchemaVersion": "1.0",
  "notes": "Fill apiUrl with your own backend guide API. Do not place a raw OpenAI secret key in this public file."
}
```

这里的 `/api/guide` 会通过 Vite 代理转发到本地后端 `8787` 端口。

## 导游动作

当前前端支持：

- `open_spot`
- `go_home`
- `select_route`

所以用户说：

- `去乾隆行宫`
- `回总览`
- `走湖心听水`

导游不只是能回答，也能直接带页面跳转。

## 素材同步

原始素材放在外层目录 `各建筑介绍/`。同步脚本会自动：

- 读取各建筑 `.txt`
- 读取对应图片
- 复制图片到 `public/heritage/`
- 生成前端数据 `src/data/heritage-data.ts`

每次补素材后执行：

```powershell
npm run sync:content
```

## 导游语料

当前导游核心语料已经拆成文件：

- `src/guide/prompts/persona.md`
- `src/guide/prompts/experience-rules.md`
- `server/prompts/guide-backend-system.md`

如果后面继续深化，推荐补：

- 每个建筑一段 80-150 字短讲
- 每条路线一段导语与收束语
- 实景图 / 古风图 / 素描图三类解释模板

## 验证

```powershell
npm run lint
npm run build
```

## 相关文档

- `GUIDE_API_CONTRACT.md`
- `AGENT_INTEGRATION_REPORT.md`
- `EXPERIENCE_BENCHMARK_REPORT.md`
- `PLAN.md`
