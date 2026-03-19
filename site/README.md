# 百泉古建筑群展示站

这是一个基于 `React + TypeScript + Vite` 的古建筑群数字展示网站。

当前版本已经包含：

- 总览图首页与建筑点位交互
- 点击点位后进入独立建筑详情页
- 图像切换、建筑介绍、关联建筑跳转
- 古风导游入口、路线化导览、到达耳语提示
- 本地 `mock` 导游与后续真实 API 接入结构

## 运行项目

第一次运行：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm install
npm run sync:content
npm run dev
```

开发地址通常是：

```text
http://localhost:5173
```

如果只是继续改前端：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm run dev
```

## 内容同步

原始素材仍然放在外层目录 `各建筑介绍/`。

同步脚本会自动：

- 读取各建筑的 `.txt` 介绍
- 读取建筑图片
- 复制图片到 `public/heritage/`
- 生成前端使用的数据文件 `src/data/heritage-data.ts`

每次补素材后执行：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm run sync:content
```

## 导游接入

当前导游有两种模式：

- 没有配置 API 时，自动使用本地 `mock` 导游
- 配置 API 后，自动请求真实后端

在 `site` 目录下新建 `.env`：

```powershell
VITE_GUIDE_API_URL=https://your-domain.com/api/guide
VITE_GUIDE_API_TOKEN=your-token-if-needed
```

然后重新启动：

```powershell
npm run dev
```

接口字段说明见：

```text
GUIDE_API_CONTRACT.md
```

## 导游人设与上下文

当前已经把导游的核心上下文拆成独立文件，便于后续后端直接读取或迁移：

- `src/guide/prompts/persona.md`
- `src/guide/prompts/experience-rules.md`

如果后续继续细化，推荐再补一层“导游专用资料”：

- 每个建筑一段 `80-150` 字的口播讲解词
- 每个建筑的亮点标签
- 每条路线的简短导语
- 图像说明词，区分实景图 / 古风图 / 素描图

这样模型输出会更像导游，而不是直接朗读原始资料。

## 当前导游体验

现在的导游不是普通聊天框，而是偏“随身引游物”的交互：

- 默认以灯笼入口出现，不常驻大面板
- 切换场景时会有短暂“耳语”提示
- 面板顶部改为当前场景引导卡
- 支持四条路线化游法
- 自由提问被收进可展开区域，减少产品感

同时导游模块已改为懒加载，减轻首页首屏压力。

## 构建与检查

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm run lint
npm run build
npm run preview
```

## 目录说明

```text
古建筑群数字化展示/
├─ 各建筑介绍/                 原始素材
└─ site/
   ├─ public/heritage/        同步后的图片资源
   ├─ scripts/
   │  └─ build-heritage-data.mjs
   ├─ src/
   │  ├─ data/
   │  │  └─ heritage-data.ts
   │  ├─ guide/               导游 UI、提示词、mock 与 API 适配
   │  ├─ App.tsx
   │  ├─ index.css
   │  └─ types.ts
   ├─ GUIDE_API_CONTRACT.md
   ├─ AGENT_INTEGRATION_REPORT.md
   └─ README.md
```

## 下一步建议

推荐继续按这个顺序深化：

1. 继续细修总览图热区与转场质感
2. 为每个建筑补一段更适合网页和口播的导览词
3. 接入真实后端 Agent API
4. 再升级到可播放讲解音频
5. 最后再评估是否做实时语音导游
