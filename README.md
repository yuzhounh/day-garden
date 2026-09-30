# Day Garden · 日常花园

一个轻盈、安静的生活首页：看看天气，读一首诗，感受四季，也照顾自己。

## 已实现

- 磨砂玻璃卡片、鼠尾草绿 / 淡桃 / 淡紫背景、植物插画，支持手机布局与深色模式。
- 七日天气（前两天、今天、后四天），可看体感温度、降水概率和紫外线。实时失败时明确标注缓存或示例数据；缓存按城市和有效期校验。
- 24 篇古典诗词，按季节推荐；支持全文、读诗随想、季节筛选及收藏。
- 16 条植物与物候内容，覆盖全年；可按月浏览，附观察提示与适宜场所。花期是一般参考，并非实时当地开花报告。
- 12 条健康提醒、6 条有官方来源的生活建议、3 项每日行动打卡。打卡按本地日期分别保存，跨日更新。
- 重要日子管理、模块开关、偏好导出与导入。
- 可选账户同步：用户名与密码登录，Cloudflare Pages Functions + D1 存储诗词收藏与每日打卡；未登录也可本地使用。

## 保存与同步

未登录数据保存在本浏览器；刷新后仍保留，但清除站点数据或换设备不会自动带过去。登录后收藏与打卡按用户隔离，网络失败的操作先存本机，联网或返回页面时重试；也可在账户面板手动同步。

首次登录可选择合并本机未登录时的收藏与打卡。每个账户的本地缓存与未登录数据分开存储。修改以单项操作上传，避免整份记录覆盖其他设备的数据。同一项并发修改按服务器最后收到的操作生效。

当前账户支持两种登录方式：
- **快捷社交登录**：支持 Google 登录与 GitHub 登录，授权成功后自动同步资料、头像与云端数据，并可在账户面板一键解除绑定或关联其他登录方式。
- **轻量独立密码**：支持传统的 3—32 位用户名与密码登录；不提供邮件找回密码，请使用密码管理器妥善保存。
城市、自定义日程和其他偏好仍保存在本机。账户面板可随时导出收藏与打卡 JSON。

## 本地开发

```powershell
npm ci
npm run db:local
# 创建不入库的 .dev.vars，设置 PASSWORD_PEPPER 为随机字符串
# 如需本地调试真实第三方登录，可在 .dev.vars 中设置 GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID
npm run build      # 生成网页及 Pages Functions 的 _worker.js
npm run dev:cloud  # Pages + 本地 D1，端口 8787
npm run dev        # Vue 开发页，端口 5180，/api 代理到 Pages
```

```powershell
npm run build
node tests/api.mjs  # 需本地 Pages 在 8787 运行；仅写入本地测试数据库
```

## Cloudflare 部署与 OAuth 配置

- 线上地址：[Day Garden](https://day-garden.pages.dev/)
- Pages 项目：`day-garden`，生产分支 `main`
- D1：`day-garden`
- 配置：`wrangler.jsonc`
- 数据库迁移：`worker/migrations/`
- 本地数据与密钥：`.wrangler/`、`.dev.vars`，均已忽略。

```powershell
npx wrangler login
npm run db:remote
npm run deploy
npx wrangler pages secret put PASSWORD_PEPPER --project-name day-garden
```

### 配置 Google 登录 (OAuth 2.0)
1. 在 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 创建 OAuth 2.0 客户端 ID（Web 应用）。
2. 在已获授权的重定向 URI 中填入：
   - 线上：`https://day-garden.pages.dev/api/auth/google/callback`
   - 本地：`http://127.0.0.1:8787/api/auth/google/callback` 及 `http://localhost:5180/api/auth/google/callback`
3. 设置 Cloudflare Pages 密钥：
   ```powershell
   npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name day-garden
   npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name day-garden
   ```

### 配置 GitHub 登录 (OAuth Apps)
1. 在 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App。
2. 填写 Authorization callback URL：
   - 线上：`https://day-garden.pages.dev/api/auth/github/callback`
   - 本地：`http://127.0.0.1:8787/api/auth/github/callback`
3. 设置 Cloudflare Pages 密钥：
   ```powershell
   npx wrangler pages secret put GITHUB_CLIENT_ID --project-name day-garden
   npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name day-garden
   ```

生产环境的 PASSWORD_PEPPER 必须保持稳定；丢失或更改会让现有账户无法验证密码。不要提交密钥或本地 D1 文件。

API 使用密码加盐及服务端密钥、HttpOnly / SameSite / Secure 会话 Cookie（Secure 仅 HTTPS）、来源检查、参数化 SQL、账户隔离和 D1 登录限流（每 IP 每分钟 10 次，仅存储哈希摘要）。前端与接口由同一 Pages 项目托管，避免跨站会话问题。系统通知需要浏览器授权，且只在页面打开时检查；目前没有后台推送调度。

原 `day-garden.yuzhounh.workers.dev` 入口已停用；退休配置在 `worker/wrangler.retired.jsonc`，禁用默认及预览访问地址。现有 D1 数据库和密码密钥沿用；用户换域名后需要重新登录。旧域名浏览器里的未登录数据和偏好不会自动跨域迁移。

## 内容出处

健康内容核对 WHO、CDC、ADA 和 AAO EyeWiki 官方资料，来源链接可在卡片内打开。古典诗词为公版作品，读诗随想为本项目原创文字。物候为中国温带及江南常见植物的一般参考。
