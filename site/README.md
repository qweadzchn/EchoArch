# 百泉古建筑群开放世界导览

这是一个基于 `React + TypeScript + Vite` 的古建筑群展示网站。

当前版本已经完成：

- 开放世界式首页
- 点位漫游、缩放、点击切换
- 15 个建筑点位的图文接入
- 详情面板、图集切换
- 为后续“导游智能体”预留结构

## 运行项目

第一次运行：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm install
npm run sync:content
npm run dev
```

运行后打开终端显示的地址，通常是：

```text
http://localhost:5173
```

## 日常开发

如果只是修改前端代码：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm run dev
```

如果你新增了外层素材目录中的图片或文案，先同步内容再启动：

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm run sync:content
npm run dev
```

## 生产构建

```powershell
cd "d:\大三下比赛\古建筑群数字化展示\site"
npm run build
npm run preview
```

## 可用命令

- `npm run dev`：启动开发服务器
- `npm run sync:content`：把外层素材目录同步为前端可读取的数据和图片
- `npm run build`：构建生产版本
- `npm run preview`：本地预览生产版本
- `npm run lint`：运行 ESLint 检查

## 目录说明

```text
古建筑群数字化展示/
├─ 各建筑介绍/                原始素材目录
└─ site/
   ├─ public/heritage/        同步后的图片资源
   ├─ scripts/
   │  └─ build-heritage-data.mjs
   ├─ src/
   │  ├─ data/
   │  │  └─ heritage-data.ts  自动生成的点位数据
   │  ├─ App.tsx              主界面
   │  ├─ index.css            页面样式
   │  └─ types.ts             类型定义
   └─ README.md
```

## 素材同步说明

原始素材放在外层目录：

```text
各建筑介绍/
```

同步脚本会自动做这些事：

- 读取每个建筑文件夹中的 `.txt` 文案
- 读取图片素材
- 复制图片到 `public/heritage/`
- 生成前端使用的数据文件 `src/data/heritage-data.ts`

所以以后补素材时，原则上不用手写数据文件，只需要：

1. 把图文放进 `各建筑介绍`
2. 运行 `npm run sync:content`

## 当前已完成的内容

- 首页采用“开放世界地图”形式，而不是普通列表页
- 支持点位悬浮、点击查看、漫游与缩放
- 右侧详情面板可以查看当前建筑的主图、图集、摘要和原始资料
- 已经预留后续接入智能导游所需要的上下文结构

## 下一步建议

如果后面继续深化，推荐按这个顺序做：

1. 接入真实总览图，替换当前风格化地图
2. 给每个建筑区域做更精确的热区 hover 动效
3. 优化首页转场与详情进入动画
4. 接入导游智能体，支持讲解、问答、游线推荐

## 备注

当前首页点位布局是“开放世界风格化排布”，不是严格测绘图。

如果你后面提供整张景区总览图，我可以继续把首页升级成：

- 总览图 + 精确热区
- 鼠标悬浮区域描边/高亮
- 点击进入区域详情
- 更强的古风高级感动效
