# Day Garden · 日常花园

一个轻盈、安静的生活首页：看看天气，读一首诗，感受四季，也照顾自己。

## 已实现

- 磨砂玻璃卡片、鼠尾草绿 / 淡桃 / 淡紫背景、植物插画，支持手机布局与深色模式。
- 七日天气（前两天、今天、后四天），可看体感温度、降水概率和紫外线。实时失败时明确标注缓存或示例数据；缓存按城市和有效期校验。
- 105 篇古典诗词，按季节推荐；支持全文、读诗随想、季节筛选及收藏。
- 47 条植物与物候内容，覆盖全年；可按月浏览，附观察提示与适宜场所。花期是一般参考，并非实时当地开花报告。
- 44 条健康提醒、28 条有官方来源的生活建议、116 条运动建议、103 条名言和 155 处景点；3 项每日行动打卡按本地日期保存并跨日更新。
- 重要日子管理、模块开关、偏好导出与导入。
- 可选账户同步：邮箱/用户名密码、Google 和 GitHub 登录。Cloudflare Pages 的 `_worker.js` 接口与 D1 保存账户、诗词收藏、每日打卡和自定义日程；未登录也可本地使用。
- 卡片与内容库按需加载；排序支持拖拽、触屏按钮和键盘。

## 保存与同步

未登录数据保存在本浏览器；刷新后仍保留，但清除站点数据或换设备不会自动带过去。登录后收藏、打卡和日程按用户隔离，网络失败的操作先存本机，联网或返回页面时重试；也可在账户面板手动同步。本机存储不可写时页面会提示，当前内存中的修改应及时导出。

首次登录可选择合并本机未登录时的收藏、打卡和日程；默认样例日程不会自动上传。已有账户的旧本机日程与云端不一致时，先保留为本机备份；在账户面板明确选择“合并旧本机日程”才上传，已有日程保留云端内容，也可先导出查看。每个账户的本地缓存与未登录数据分开存储。修改以单项操作上传；不同事件相互独立，同一事件并发修改按服务器最后收到的操作生效。删除后的合法空列表会覆盖本地缓存，升级不会自动复活已删除日程。

当前账户支持两种登录方式：
- **快捷社交登录**：支持 Google 登录与 GitHub 登录，授权成功后自动同步资料、头像与云端数据，并可在账户面板一键解除绑定或关联其他登录方式。
- **轻量独立密码**：支持邮箱地址或 3—32 位用户名；密码为 10—128 位。不提供邮件找回密码，请使用密码管理器妥善保存。

城市、主题、卡片排序、景点状态、随笔与通知设置仍保存在本机，并按账户分别读取。设置面板导出的版本 2 配置备份支持导入（同时兼容旧版配置）；账户面板的收藏/打卡/日程导出是独立的数据副本。个人导出放在已忽略的 `private/`，不随源码发布。

公历日期必须真实存在；2 月 29 日在下一闰年提醒。农历按常规月份计算，不在闰月重复；当年没有三十日时取廿九。月历、倒计时与提醒共用这一规则，同一天可保留多个日程。通知按账户、日期、事件和提醒档位去重，需要页面打开及浏览器授权。

日程接口使用 `PUT /api/events/:id` 与 `DELETE /api/events/:id`（兼容旧的单项 POST）；整份列表替换返回 405，错误载荷返回 400，不会清空数据。

## 本地开发

```powershell
npm ci
npm run db:local
# 创建不入库的 .dev.vars，设置 PASSWORD_PEPPER 为随机字符串
# 如需本地真实 OAuth，配置对应 CLIENT_ID 和 CLIENT_SECRET
npm run build      # 生成网页及 Pages Functions 的 _worker.js
npm run dev:cloud  # Pages + 本地 D1，端口 8787
npm run dev        # Vue 开发页，端口 5180，/api 代理到 Pages
```

```powershell
npm run build
npm test  # 自动构建，运行单元/API/桌面与手机浏览器回归；创建独立临时 D1，不使用现有用户数据
npm run test:unit  # 仅运行日期、存储、同步、OAuth 回调回归
```

浏览器回归在 Windows 使用已安装的 Chrome；其他环境先运行 `npx playwright install --with-deps chromium`。测试程序自动启动和关闭 Pages，并清理临时数据库；失败诊断保存在 `tmp/playwright/`。CI 执行相同的 `npm test`。

## Cloudflare 部署与 OAuth 配置

- 线上地址：[Day Garden](https://day-garden.pages.dev/)
- Pages 项目：`day-garden`，生产分支 `main`
- D1：`day-garden`
- 配置：`wrangler.jsonc`
- 数据库迁移：`worker/migrations/`
- 本地数据与密钥：`.wrangler/`、`.dev.vars`，均已忽略。

```powershell
npx wrangler login
npx wrangler pages secret put PASSWORD_PEPPER --project-name day-garden
npm run db:remote
npm run deploy
```

### 配置 Google 登录 (OAuth 2.0)
1. 在 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 创建 OAuth 2.0 客户端 ID（Web 应用）。
2. 在已获授权的重定向 URI 中填入：
   - 线上：`https://day-garden.pages.dev/api/auth/google/callback`
   - 本地 Pages：`http://127.0.0.1:8787/api/auth/google/callback`
   - 本地 Vite：`http://127.0.0.1:5180/api/auth/google/callback`
   - 若使用 `localhost`，须注册对应 localhost URI 并全程保持同一主机名。
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
   - GitHub 本地 OAuth App 的回调应与浏览器入口一致；使用 Vite 时为 `http://127.0.0.1:5180/api/auth/github/callback`，建议与生产 OAuth App 分开。
3. 设置 Cloudflare Pages 密钥：
   ```powershell
   npx wrangler pages secret put GITHUB_CLIENT_ID --project-name day-garden
   npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name day-garden
   ```

生产环境的 PASSWORD_PEPPER 必须保持稳定；丢失或更改会让现有账户无法验证密码。不要提交密钥或本地 D1 文件。

发布本次 OAuth 改动前必须执行迁移 `0005_oauth_states.sql`。绑定意图在发起授权时与一次性 state 一起存入 D1，10 分钟过期；回调不依赖跨站时可能缺失的 Strict 会话 Cookie。页面只接受同源、同一弹窗及请求编号匹配的消息；关闭或超时后可重试。

Google/GitHub 凭据未配置时对应按钮禁用。本地模拟登录仅在 localhost / 127.0.0.1 可用。自动化覆盖真实回调路由及服务端绑定，外部授权服务使用可控响应；真实第三方账户授权仍需用已配置凭据完成一次人工验收。

API 使用密码加盐及服务端密钥、HttpOnly / SameSite / Secure 会话 Cookie（Secure 仅 HTTPS）、来源检查、参数化 SQL、账户隔离和 D1 登录限流（每 IP 每分钟 10 次，仅存储哈希摘要）。前端与接口由同一 Pages 项目托管，避免跨站会话问题。系统通知需要浏览器授权，且只在页面打开时检查；目前没有后台推送调度。

原 `day-garden.yuzhounh.workers.dev` 入口已停用；退休配置在 `worker/wrangler.retired.jsonc`，禁用默认及预览访问地址。现有 D1 数据库和密码密钥沿用；用户换域名后需要重新登录。旧域名浏览器里的未登录数据和偏好不会自动跨域迁移。

## 内容出处

健康内容核对 WHO、CDC、ADA 和 AAO EyeWiki 官方资料，来源链接可在卡片内打开。古典诗词为公版作品，读诗随想为本项目原创文字。物候为中国温带及江南常见植物的一般参考。
