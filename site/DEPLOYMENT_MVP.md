# EchoArch MVP 部署说明

## 本地开发

```powershell
cd site
npm install
npm run dev:all
```

前端默认地址是 `http://127.0.0.1:5173`，后端默认地址是 `http://127.0.0.1:8787`。

## 必填环境变量

复制 `.env.guide.example` 为 `.env.guide`，至少填写：

- `OPENAI_API_KEY`：DeepSeek 或兼容 OpenAI 接口的文本模型密钥。
- `OPENAI_BASE_URL`：DeepSeek 默认 `https://api.deepseek.com`。
- `OPENAI_GUIDE_MODEL`：默认 `deepseek-v4-flash`。
- `AUTH_SECRET`：登录 Cookie 签名密钥，部署时必须换成长随机字符串。
- `GUIDE_ALLOWED_ORIGIN`：正式域名，例如 `https://example.com`。
- `STORAGE_DRIVER`：本地演示用 `file`，正式服务器用 `prisma`。
- `DATABASE_URL`：正式服务器 PostgreSQL 连接地址。
- `GUIDE_SERVE_STATIC`：如果希望 Node 后端直接托管 `dist/`，设为 `true`。

可选多模态配置：

- `QWEN_API_KEY`
- `QWEN_BASE_URL`
- `QWEN_VISION_MODEL`
- `QWEN_ASR_MODEL`
- `QWEN_TTS_MODEL`

当前 MVP 已完成图片、语音、TTS 的接口与降级体验；未配置 Qwen 时会返回 mock 分析，前端仍可演示完整流程。

## 存储模式

项目现在支持两种存储模式：

- `STORAGE_DRIVER=file`：默认模式，数据写入 `server/runtime/mvp-store.json`，适合本地演示。
- `STORAGE_DRIVER=prisma`：正式模式，数据写入 PostgreSQL，适合服务器部署。

`prisma/schema.prisma` 已给出正式数据库结构，服务端存储层已经可以通过环境变量切换到 Prisma。

服务器切 PostgreSQL 时建议：

1. 创建数据库并设置 `DATABASE_URL`。
2. 将 `.env.guide` 中的 `STORAGE_DRIVER` 改为 `prisma`。
3. 执行 `npm run db:generate`。
4. 首次部署可以执行 `npm run db:push` 快速同步结构；正式迭代建议改用 `npm run db:migrate:dev` 生成迁移，再在服务器执行 `npm run db:migrate`。

## 生产部署建议

```powershell
npm run build
npm run db:generate
npm run guide:dev
```

生产环境不要使用 `vite preview` 作为正式服务器。推荐：

- Nginx 托管 `dist/` 静态资源。
- Nginx 将 `/api` 和 `/uploads` 反代到 Node 后端。
- Node 后端用 PM2 或 systemd 常驻。
- 配置 HTTPS。

如果早期想简化部署，也可以设置：

```env
GUIDE_SERVE_STATIC=true
```

然后同一个 Node 后端会托管 `dist/`，同时提供 `/api` 与 `/uploads`。后续访问量上来后，再切换为 Nginx 托管静态资源。

## 手机端访问

当前项目按响应式 Web 推进。绑定域名并配置 HTTPS 后，电脑端和手机端都访问同一个域名即可。小程序不是第一阶段必需项，后续如果需要微信生态能力，可以复用当前后端，再单独做小程序前端。
