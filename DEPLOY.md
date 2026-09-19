# 部署指南

## 先回答问题：现在别人能访问吗？

先分清两种情况：

- **本地预览**（`npm run dev` / `npm run preview`）：**只有你这台机器能看到。**
  `localhost` 这个地址在别人电脑上，指向的是**别人自己的电脑**。
- **线上部署**：**已经上线了** → **https://blog.infinitest.cloud**
  （备用地址 `https://rickysblog.1174716217.workers.dev` 仍可访问，但**大陆直连打不开**）

本地预览有四种程度，按投入从小到大排：

| 方式 | 谁能看到 | 地址 | 怎么做 | 关掉进程后 |
| --- | --- | --- | --- | --- |
| 本机预览 | 只有你自己 | `http://localhost:4321` | `npm run build && npm run preview` | 失效 |
| **局域网** | 同一 Wi-Fi 下的设备（手机、同办公室同事） | `http://192.168.1.236:4321` | `npm run preview:lan` | 失效 |
| 临时公网隧道 | 任何拿到链接的人 | 随机 `https://xxx.trycloudflare.com` | 见文末 | 失效 |
| **正式部署** | 任何人，长期 | **`https://blog.infinitest.cloud`** | 见下文 | 长期有效 |

> 局域网方式最适合**用手机验证移动端布局** —— 手机上输入 `http://192.168.1.236:4321` 即可。
> 你的局域网 IP 会变（换网络、路由器重新分配），以 `npm run preview:lan` 启动时打印的 Network 那一行为准。
> 首次启动 Windows 可能弹出防火墙询问，要允许「专用网络」访问才能看到。

> ### ✅ 中国大陆访问问题 —— 已解决
>
> 正式地址：**`https://blog.infinitest.cloud`**（自有域名，大陆可直连）。
>
> 历史背景：最初部署在 `*.workers.dev` 这个 Cloudflare 免费二级域名上，它在中国大陆被
> **DNS 污染**，表现为「挂代理能开、关掉 VPN 打不开」。**这与配置无关**，任何项目用
> 那个域名都一样。已通过绑定自有域名解决。
>
> 完整的原因分析、当初的三条备选路线、以及想要更快时的进阶优化，见下方
> 〈让中国大陆也能访问〉一节。

---

## 关键前提：需不需要 Git 仓库？

Cloudflare Pages 有两种接入方式，它们对仓库的要求正好相反：

| 接入方式 | 需要 Git 仓库吗 | 谁来构建 | 以后怎么更新 |
| --- | --- | --- | --- |
| **Git 集成**（Connect to Git） | **必须**（GitHub / GitLab） | Cloudflare 服务器 | `git push` 即自动部署 |
| Direct Upload（命令行直传） | **不需要** | 你的电脑 | 重新跑一条命令 |

**本项目当前走 Git 集成**（见下一节）。代价是必须有一个 GitHub 仓库 —— 也就是说先前「不建仓库」那条决定已作废。
如果哪天不想再维护仓库，成本很低：`npm run deploy` 一条命令直接上传 `dist`，不用 Cloudflare 帮你构建。

> 无论集成还是直传，**域名都要单独处理**：默认拿到的是 Cloudflare 免费二级域名
> （`*.workers.dev` / `*.pages.dev`），在大陆被污染。解决办法统一见
> 〈让中国大陆也能访问〉——本项目已通过绑定自有域名解决。

---

## 当前选择：Cloudflare **Workers** + Git 集成

> 实际部署走的是这条路。正式地址 **`https://blog.infinitest.cloud`**
> （自有域名绑定到 Worker）；备用地址 `https://rickysblog.1174716217.workers.dev`
> 仍可访问，但**大陆直连打不开**，因此不写进 canonical / sitemap。
>
> 注意 Worker 的默认域名是 `workers.dev` 而不是 `pages.dev` —— 这是 **Workers**，不是 Pages。
> 两个产品不一样：**Workers 托管静态站点时必须有一份 `wrangler.jsonc`** 告诉它构建产物在
> 哪个目录，否则 `npx wrangler deploy` 会因为找不到入口而失败，或者部署出一个什么都返回不了的空壳。
> 这个文件已经在仓库里了（`wrangler.jsonc`，`assets.directory = "./dist"`）。

> 代价要提前说清楚：这条路**必须有一个 GitHub 仓库**，也就是说最初「不建仓库」那条决定作废了。
> 好处是以后写完文章 `git push` 就自动上线。

### 一次性准备

**1. 在 GitHub 建仓库 —— ✅ 已完成**

仓库：**https://github.com/RickyHe7/RickyBlog**（Public）。本地 `origin` 已指向它。

**2. 把本地代码推上去**

本地仓库已经初始化好，remote 也已经指向 `https://github.com/RickyHe7/RickyBlog.git`，直接推：

```bash
cd C:/Repository/Person/RickyBlog
git push -u origin main
```

首次推送会弹出浏览器让你登录 GitHub 授权（Git Credential Manager），点确认即可，之后不用再登。
你机器上 GCM 已经存过 `RickyHe7` 账号，正常情况下点一下授权就完事。

> **这一步必须在有桌面环境的终端里跑**（Windows Terminal / Git Bash / VS Code 终端都行）。
> 在无人值守或非交互环境里执行会失败：git 会去调 `git credential-manager get` 取令牌，
> 而 GCM 需要能弹窗/唤起浏览器，取不到就直接退出（表现为 `exit 128` 且没有任何报错信息）。

**3. 在 Cloudflare 里接上 —— ✅ 已完成**

实际走的是 **Workers** 而不是 Pages：Cloudflare Dashboard → **Workers & Pages** → **Create** →
**Workers** → **Import a repository** → 授权并选中 `RickyBlog`。构建配置：

| 配置项 | 值 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy`（默认值，读仓库里的 `wrangler.jsonc`） |

**关键差异：Workers 靠 `wrangler.jsonc` 找构建产物**，而 Pages 是在控制台里填一个「输出目录」。
仓库里的 `wrangler.jsonc` 已经写好了：

```jsonc
{
  "name": "rickysblog",                 // 决定地址前缀：rickysblog.<账号子域>.workers.dev
  "compatibility_date": "2026-09-19",
  "assets": {
    "directory": "./dist",              // astro build 的输出目录
    "not_found_handling": "404-page"    // 未知路径返回 dist/404.html
  }
}
```

少了这份配置，`wrangler deploy` 会因为找不到入口而失败或部署出空壳 —— 这是 Workers 上最容易漏的一步。

**4. 加环境变量**（`.env` 被 gitignore 了，不会上传到 Cloudflare）

> 入口在哪 —— 分两种情况，Cloudflare 还改过名字，所以都对不上号时会有点迷惑：
>
> | 你在哪 | 入口 |
> | --- | --- |
> | 还在创建流程的 **Set up builds and deployments** 页面 | 就在该页 Build output directory 下面，有个可折叠区块叫 **Environment variables (advanced)**，点标题展开 → **Add variable** |
> | 项目已经建好了 | Workers & Pages → 点进你的项目 → **Settings** → **Variables and Secrets**（旧界面叫 **Environment variables**）→ 下面分 **Production** / **Preview** 两块，各自 **Add** |
>
> **注意**：环境变量只在「构建时」生效，而我们的值会被内联进 HTML。所以**改完必须重新部署一次**：
> 项目 → **Deployments** → 最新那条右侧 **⋯** → **Retry deployment**。不重新构建等于没改。

Settings → **Environment variables** → 选 **Production**（要对 Preview 也生效就再加一遍），逐条添加：

| 变量 | 值 | 必填 | 作用 |
| --- | --- | --- | --- |
| `NODE_VERSION` | `22` | 保险项 | Cloudflare Pages 构建镜像**默认已经是 Node 22.16.0**，本来就满足 Astro 的 ≥22.12.0。项目里也放了 `.nvmrc`（内容 `22`），Cloudflare 会读它。所以这条基本是多余的，设了也无害 |
| `SITE_URL` | — | ❌ **不要设** | **已经失效**：站点地址现在只认 `astro.config.mjs` 的 `CANONICAL_SITE`（唯一来源）。设了不仅没用，还会在构建日志里打一条告警提醒你删掉它。**历史遗留的这条变量曾经把换好的新域名整个盖掉、导致线上 SEO 一直指旧域名** —— 如果你之前在 Cloudflare 设过它，**建议直接删掉** |
| `PUBLIC_GISCUS_REPO` | 如 `RickyHe7/RickyBlog` | 可选 | 评论，四个都填才显示 |
| `PUBLIC_GISCUS_REPO_ID` | giscus.app 上取 | 可选 | 同上 |
| `PUBLIC_GISCUS_CATEGORY` | 如 `Announcements` | 可选 | 同上 |
| `PUBLIC_GISCUS_CATEGORY_ID` | giscus.app 上取 | 可选 | 同上 |
| `PUBLIC_UMAMI_SRC` | 如 `https://cloud.umami.is/script.js` | 可选 | 统计，两个都填才生效 |
| `PUBLIC_UMAMI_WEBSITE_ID` | Umami 里取 | 可选 | 同上 |
| `PUBLIC_BUTTONDOWN_USERNAME` | buttondown 用户名 | 可选 | 订阅表单，填了才出现 |

> ### ⚠️ 关于项目名：`rickyblog.pages.dev` 已经被别人占了
>
> 实测过：`https://rickyblog.pages.dev` 返回 200，但**那不是我们的站** ——
> 它的 `robots.txt` 里写着 `https://rickyacc.me/sitemap-index.xml`，所有路径都返回同一个页面。
> 也就是说，别人早先建了一个叫 `rickyblog` 的 Pages 项目。
>
> 两个后果：
> 1. Cloudflare 里创建项目时如果名字已被占用，它会给你加后缀（形如 `rickyblog-a1b.pages.dev`）或直接拒绝。
>    建好后**务必用 Dashboard 里显示的完整地址**，别照着 `rickyblog.pages.dev` 填。
> 2. 任何人都不要把站点地址配成 `https://rickyblog.pages.dev` —— 那会把 canonical / sitemap
>    指向陌生人的站点。

> ### ⚠️ 站点地址只认 `astro.config.mjs` 的 `CANONICAL_SITE`
>
> 它现在**是唯一权威**，环境变量不参与计算。历史上不是这样（曾经是「环境变量 > `.env` > 配置」
> 的覆盖链），结果 2026-09-19 换域名时踩了坑：Cloudflare 里遗留的 `SITE_URL` 是旧域名，
> 把代码里改好的新域名整个盖掉 —— 线上 SEO 一直指错，而本地构建完全正常，很难往远端变量上想。
>
> 现在如果检测到残留的 `SITE_URL` 且与配置不一致，构建会打一段醒目告警提醒你删掉它。
> 需要临时用别的域名构建时，用 `FORCE_SITE_URL`（刻意换了不常见的新名字）。
>
> 完整排查经过见〈以后换域名怎么办 → 历史教训〉。

**5. 保存并部署**

Cloudflare 会自动拉代码、装依赖、构建、发布。首次构建大约 1–2 分钟。

### 以后怎么更新

```bash
git add -A
git commit -m "post: 新增一篇文章"
git push
```

推完 Cloudflare 自动重新构建。**注意：在 Pages 里改了环境变量，也要手动触发一次重新部署**（Deployments → 最新那条 → Retry deployment），因为变量的值是在构建时被写进 HTML 的。

### 这类方式特有的两个坑

1. **环境变量在 Cloudflare 侧，不在你本机。** 所以本地 `npm run build` 用的是本机 `.env`，线上用的是 Pages 里的值 —— 两边可能不一致。调试线上问题时先怀疑这点。
2. **构建失败要去看 Pages 的构建日志**，不是你本机的终端。最典型的失败原因是 Node 版本不够
   （Astro 7 要求 ≥ 22.12.0）—— 不过 Cloudflare 现在的构建镜像默认就是 22.16.0，一般不会碰到。

---

## 备选路线：Cloudflare Pages · Direct Upload

**不需要 Git 仓库**，在你本机构建好再上传。适合「就是不想建仓库」或者只想快速试一下。

```bash
npx --yes wrangler login                             # 一次性
npx --yes wrangler pages project create ricky-blog   # 一次性
npm run deploy                                       # 以后每次发布
```

和路线 B 相反的两个点：

| | Direct Upload | Git 集成（路线 B） |
| --- | --- | --- |
| 需要 Git 仓库 | 不需要 | **必须** |
| 构建在哪跑 | 你的电脑 | Cloudflare 服务器 |
| 环境变量从哪读 | 你本机 `.env` | Pages 控制台 |
| 更新方式 | `npm run deploy` | `git push` |
| 改了环境变量后 | 重新 `npm run deploy` | 在 Pages 里 Retry deployment |

两种方式都得到 `*.pages.dev` 地址，随时可以互相切换。

---

## 首次上线后必做

1. **站点地址 —— ✅ 已配好**

   正式地址写死在 `astro.config.mjs` 的 `CANONICAL_SITE`：**`https://blog.infinitest.cloud`**。
   它是**唯一权威** —— 环境变量不再参与计算。构建实测验证过：地址正确传播到全部产物
   （每个页面的 canonical + og:url、`robots.txt`、`rss.xml`、`sitemap`）。

   > ⚠️ **如果你之前在 Cloudflare 设过 `SITE_URL`，去把它删掉。**
   >
   > 它现在**已经不生效了**（代码改成只认 `CANONICAL_SITE`），但留着会造成误判 ——
   > **2026-09-19 换域名时就吃过这个亏**：那条遗留变量是旧域名，把代码里改好的新域名整个盖掉，
   > 线上 canonical / sitemap 一直指着大陆打不开的 `workers.dev`；
   > 而本地构建完全正常（本地没有那个变量），于是很难往远端变量上想，白查了很久。
   >
   > 删除路径：Worker → **Settings** → **Variables and Secrets**。
   > 如果构建日志里出现 `[site] ⚠️ 检测到环境变量 SITE_URL = ...` 就是在提醒你这事。

   **换域名时只改 `CANONICAL_SITE` 这一处**（完整清单见〈以后换域名怎么办〉）。

2. **逐项核对线上**（`build + preview` 能过的，线上不一定）

   一条命令即可，不用手动点：

   ```powershell
   .\scripts\check-live.ps1 -Base https://blog.infinitest.cloud
   ```

   它会检查 24 条路由是否可达、404 是否返回 404、canonical / robots / sitemap / rss 里的
   绝对地址用的是不是你给的域名、Pagefind 索引有没有真的部署上去，最后汇总哪些没过。
   **它还会确认这个地址确实是你自己的站**（查首页有没有 `#indexCard`）——
   这一步不是多余的：`rickyblog.pages.dev` 就属于别人的博客。

   手动核对的话看这张表：

   | 检查项 | 期望 |
   | --- | --- |
   | `/` | 首页 Banner + 打字机 + `#indexCard` 文章卡片区 |
   | `/posts` | 3 篇示例文章，卡片有渐变封面 |
   | `/posts/hello-markdown` | 代码块有复制按钮、脚注、右侧目录 |
   | `/search` | **能真的搜出东西**（这是 Pagefind 唯一能验证的地方） |
   | `/rss.xml` | 合法 XML，含 3 篇文章 |
   | `/sitemap-index.xml` | 可达，且里面的域名是新域名 |
   | `/robots.txt` | Sitemap 那一行是新域名 |
   | 随便访问一个不存在的路径 | 自定义 404（落叶 + 「这片叶子被风吹走了」） |
   | 手机上打开 | 单栏、导航折叠成菜单、落叶只剩 3 片 |

3. **提交给搜索引擎**（可选）：Google Search Console / Bing Webmaster 里提交 `sitemap-index.xml`

---

## 让中国大陆也能访问（已解决，留档备查）

> ### ✅ 当前状态：已通过方案 B 解决
>
> 正式地址 **`https://blog.infinitest.cloud`**（自有域名绑定到 Worker），大陆可直连。
> 下面保留完整的排查过程与备选路线，供以后换域名或想进一步提速时参考。

### 当初的问题：站是好的，域名不行

| | 结果 |
| --- | --- |
| 境外访问 `https://rickysblog.1174716217.workers.dev` | ✅ 完全正常（页面、文章、RSS、sitemap、搜索索引都在） |
| 中国大陆直连 | ❌ 打不开 |
| 中国大陆 + 代理 | ✅ 正常 |

自查方法：**手机连中国大陆移动网络直连打不开、挂上代理立刻能开** —— 就是这个特征。
实测解析这个域名会返回 `31.13.88.169` 这类 **Meta（Facebook）网段的 IP**，
而 Cloudflare 的地址不可能是那个网段 —— 这是典型的 **DNS 污染**。

`*.workers.dev` 和 `*.pages.dev` 这类 Cloudflare 赠送的免费二级域名，在中国大陆长期处于
被污染 / 阻断状态。**换成任何人、任何项目，只要用这个域名，结果都一样，跟你写没写错没关系。**

问题在于：对一个中文博客来说，**国内读者打不开就等于没有读者**。这比任何样式问题都优先。

### 先说一条铁律，能省你很多时间

> **免费 + 免备案 = 没有可靠的国内访问路径。**

中国大陆的 CDN / 加速节点强制要求域名完成 **ICP 备案**才允许把流量解析到大陆节点。
各平台赠送的免费二级域名（`workers.dev`、`edgeone.cool`、`pages.dev` …）都没有备案。
网上那些「免备案方案」，本质都是绕开大陆节点走境外线路 —— 能不能打开取决于运气和运营商，
不是可靠方案。

### 三条路，按投入排序

| 方案 | 国内能打开吗 | 花钱 | 时间 | 状态 |
| --- | --- | --- | --- | --- |
| A. 保持现状 | ❌ 不能（除非对方自己挂代理） | 0 | — | 未采用 |
| **B. 买域名绑到 Cloudflare** | ⚠️ **能打开**，但速度一般 | 域名约 ¥30–80/年 | 当天 | ✅ **已采用** |
| C. 域名 + 备案 + 大陆加速 | ✅ 稳定、快 | 域名 + 国内接入资源 | 备案 1–2 周 | 备选，想更快再走 |

---

### 方案 B：绑一个自己的域名（✅ 已完成）

**原理**：被封的是 `*.workers.dev` 这个**共享域名**，不是你的站。
换成你自己的域名之后，内容一模一样，只是入口换了。

**实际执行记录**：

| 步骤 | 结果 |
| --- | --- |
| 1. 买域名 | `infinitest.cloud` |
| 2. 托管到 Cloudflare | ✅ 已加站点并改 NS |
| 3. 给 Worker 绑自定义域名 | ✅ `blog.infinitest.cloud` |
| 4. 改 `CANONICAL_SITE` 并推送 | 见下 —— 必须做，否则 SEO 元数据仍指向旧域名 |

**第 4 步为什么必须做**：不改的话，页面里的 canonical、`sitemap`、`rss.xml`、OG 标签
写的还是那个**大陆打不开的 `workers.dev` 地址**。站能开，但搜索引擎收录的、RSS 里列的
全是错的地址 —— 等于 SEO 白做。

#### 通用流程（留档：绑一个新域名照这个走）

> 这是**首次绑定**的从零流程。如果是「已经有域名在跑，想换成另一个」，
> 见后面的〈以后换域名怎么办〉——那边多了旧域名 301、`SITE_URL` 残留清理等注意事项。

**1. 买域名**

阿里云 / 腾讯云 / Cloudflare Registrar 都行。`.com` 约 ¥60–80/年，`.top` / `.xyz` 约 ¥10–30/年。

> 💡 如果以后可能走方案 C 备案，**一开始就在阿里云 / 腾讯云 / 华为云买**，
> 并完成实名认证。备案要求域名在具备备案资质的注册商处，事后迁移会多一次麻烦。

**2. 把域名托管到 Cloudflare**

Dashboard → **Add a site** → 填域名 → 选 **Free** 计划 → 它会给你两条 NS 记录 →
去域名注册商那里把 DNS 服务器改成这两条。等几分钟到几小时生效。

> 不想把整个域名的 DNS 交给 Cloudflare 也可以：跳过这步，直接用下面的
> 「添加自定义域」流程，Cloudflare 会给你一条 CNAME 记录让你去原注册商加。

**3. 给 Worker 绑自定义域名**

Workers & Pages → 你的 Worker（`rickysblog`）→ **Settings** → **Domains & Routes**
（也可能显示为 **Triggers → Custom Domains**）→ **Add** → **Custom Domain** →
填子域名，例如 `blog.infinitest.cloud`。

Cloudflare 会自动创建 DNS 记录并签发证书，几分钟后生效。

**4. 改地址，推一次**

改 `astro.config.mjs` 里的 `CANONICAL_SITE`（**代码里唯一写死域名的地方**）：

```js
const CANONICAL_SITE = 'https://blog.infinitest.cloud';
```

`git push` 一次即可（会触发 Cloudflare 重新构建）。
不改的话 sitemap / canonical / OG / RSS 指向的还是那个打不开的 `workers.dev` 地址。

**5. 核对**

```powershell
.\scripts\check-live.ps1 -Base https://blog.infinitest.cloud
```

它会 24 条路由逐条打通、检查 404、canonical / robots / sitemap / rss 里的域名是否已切换、
Pagefind 索引有没有部署，并确认这个地址确实是本站（查首页 `#indexCard`）。

#### ⚠️ 方案 B 的预期管理（别抱太高期望）

Cloudflare 免费版在中国大陆**没有专门优化**：默认可能把你的访客导向北美节点，
**晚高峰有明显的延迟和丢包**。结论是「**能打开，但不算快**」。

对个人博客这是可接受的 —— 先能用，比追求快重要。真觉得慢，社区里成熟的免费做法是
「**优选 IP + DNS 分线路**」：

- 用 CloudflareSpeedTest 测出对你所在线路延迟最低的 Cloudflare 边缘 IP
- 把域名 NS 从 Cloudflare 挪回 DNSPod，国内线路解析到优选 IP，境外线路继续走 Cloudflare
- Worker 侧要配合 **Cloudflare for SaaS（自定义主机名）**，否则优选 IP 上的边缘节点
  不认识你的域名，请求会被拒

这套配置对新手偏繁琐，**建议先把方案 B 的 1–4 步做完**（当天能上线），嫌慢再考虑调优。
需要的话我可以帮你写具体步骤。

---

### 方案 C：域名 + 备案（想稳定就必须走这条）

**流程大致是：**

1. 域名在阿里云 / 腾讯云完成**实名认证**
2. 通过云服务商提交 **ICP 备案**：填网站信息 → 手机 App 人脸核验 →
   接入商初审 1–2 天 → 管局终审 5–20 个工作日
3. 备案通过后，把站点部署到「含中国大陆加速区」的平台。本项目是**纯静态产物**，
   **代码一行都不用改**，`dist/` 目录可以直接换平台：
   - 腾讯云 **EdgeOne Pages**：加速区域选「全球可用区（含中国大陆）」+ 绑定自定义域名
   - 阿里云 **OSS + CDN**：静态文件托管 + CDN 加速
   - 或者继续留在 Cloudflare，但下面这条要注意 👇
4. 结果：国内直连、速度快、合规

> **⚠️ 未备案时不要选 EdgeOne Pages 的「全球可用区（不含中国大陆）」**。
> 那个区域会**主动屏蔽中国大陆 IP（返回 401）**，等于白折腾 —— 这条路的成立前提就是备案。

> 📌 备案通过后，网站底部需要展示 ICP 备案号。**这一步目前还没做** ——
> 备案下来之后告诉我，我在页脚加一个备案号位（现在没有这个位置）。
> 备案号格式形如「京ICP备2026xxxxxx号」，通常还要链到 https://beian.miit.gov.cn/。

---

### 哪些我能替你做，哪些不能

| 事项 | 我 | 说明 |
| --- | --- | --- |
| 改 `CANONICAL_SITE`、配 `wrangler.jsonc`、写步骤、上线后逐项核对 | ✅ 能 | 已经有自检脚本，给地址就行 |
| 加备案号到页脚 | ✅ 能 | 等备案下来 |
| 买域名 | ❌ 不能 | 需要你实名 + 付款 |
| 提交 ICP 备案 | ❌ 不能 | 需要你的身份证和人脸核验，且必须本人操作 |

---

---

## 以后换域名怎么办

**先说结论：代码只需要改一行。**

域名已经收敛到 `astro.config.mjs` 的 `CANONICAL_SITE`，全站 canonical / sitemap / OG /
RSS / robots 都从它推导。实测确认：**`src/` 目录里零处出现当前域名**（`grep` 过），
`.env` 里的 `SITE_URL` 也留空（而且它现在根本不会被读取）。

> 为什么刻意不留兜底域名：早期 `src/lib/seo.ts` 有一个兜底 origin，后果是「域名写错时不报错、
> 静默把 canonical 指向错域名」——踩过两次。现在拿不到 `Astro.site` 会**直接报错**。
> 静默指错比构建失败危险得多。

### 两种情况

| 情况 | 例子 | 要买新域名吗 | 要动 Cloudflare 的 zone 吗 |
| --- | --- | --- | --- |
| **A. 换子域名**（同域名下） | `blog.infinitest.cloud` → `www.infinitest.cloud` | 不用 | 不用，zone 已有 |
| **B. 换整个域名** | `infinitest.cloud` → `新域名.com` | 要 | 要：Add a site + 改 NS |

### 五步

**1. Cloudflare：把新域名绑到 Worker**

- **情况 B** 先做：Dashboard → **Add a site** → 加新域名 → 去注册商改 NS → 等生效
- 两种情况都要：Worker（`rickysblog`）→ **Settings** → **Domains & Routes** →
  **Add** → **Custom Domain** → 填新域名。证书自动签发，几分钟生效

**2. 代码：改一行**

```js
// astro.config.mjs
const CANONICAL_SITE = 'https://新域名';
```

**3. 顺手删掉 Cloudflare 里的 `SITE_URL`（如果有）**

**这一步现在已经不是必须的了** —— 代码改成只认 `CANONICAL_SITE`，环境变量不再参与计算。
但**留着有害**：它会让你误以为改它能生效，从而在排查时走错方向。所以还是删掉。
删完构建日志里那条 `[site] ⚠️ 检测到环境变量 SITE_URL = ...` 也会消失。

> 📌 这一步是**用一次真实的翻车换来的**（见下面〈历史教训〉）——
> 换域名时它把新域名整个盖掉，导致线上 SEO 一直指旧域名，而本地构建却完全正常。

**4. 推送**

```bash
git push
```

Cloudflare 自动重新构建，canonical / sitemap / RSS / OG 全部跟着切。
**不推送 = 站能在新域名打开，但 SEO 元数据还指着旧域名**（这次切到 `infinitest.cloud`
时就先遇到了这个状态，实测确认过）。

**5. 验证**

```powershell
.\scripts\check-live.ps1 -Base https://新域名
```

重点看 `首页 canonical 用真实域名` 和 `robots.txt 的 Sitemap 指向本站` 这两项。

#### 历史教训：「代码改了却不生效」的排查顺序

2026-09-19 换到 `infinitest.cloud` 时踩的坑，记下来避免重演：

1. 代码改了 `CANONICAL_SITE`、也 `git push` 了（远程 SHA 已核对）→ **线上 canonical 还是旧域名**
2. 连续多次抓取确认不是 CDN 缓存延迟
3. 本地用同一份代码构建 → **产物里是新域名**（29 个文件，旧域名 0 残留）
4. ⇒ 差异只可能来自**构建环境**，而唯一能影响它的就是环境变量
5. 根因：Cloudflare 里遗留的 `SITE_URL` = 旧域名，优先级高于代码

**结论：以后遇到"本地对、线上不对且只和域名有关"，第一个怀疑对象就是远端环境变量。**
现在代码层面已经禁止它生效，并会在构建日志里告警。

### ⚠️ 旧域名要处理，否则是重复内容

同一个站有两个地址都能打开，搜索引擎得自己猜哪个是正主。canonical 指向新域名能**缓解**，
但 **301 才是干净做法**。

**如果旧域名是你自己的域名（有 zone）：**

Rules → **Redirect Rules** → Create → Single Redirect：

| 字段 | 值 |
| --- | --- |
| When | Hostname equals `旧域名` |
| Then | Dynamic redirect → `concat("https://新域名", http.path)` |
| Status | **301**（永久） |

> 实测查过：**Single Redirects 在所有计划都可用，Free 每个 zone 10 条**，支持通配符
> （不支持正则，那是 Business 起）。前提是**旧域名的 DNS 必须走 Cloudflare 代理**（橙云）。
> 另外它不是 Bulk Redirects —— 后者是账号级、免费 1 万条静态映射，本项目用不上。

**如果旧域名是平台分配的、你没有 zone**（比如当前这个 `rickysblog.1174716217.workers.dev`）：

**没法加重定向规则**（没有 zone 可挂）。两个选择：

- **推荐**：Worker → Settings → **Domains & Routes** → 关掉 `workers.dev` 路由，
  旧地址直接停止服务（避免重复内容）
- 或者不管它 —— canonical 已指向新域名，搜索引擎会自己收敛

> ⚠️ 关掉 `workers.dev` 之前确认新域名已经正常，否则会把自己锁在外面。

### 不用动的东西

| 东西 | 为什么 |
| --- | --- |
| **Giscus 评论** | 用的是 `data-mapping="pathname"`（已确认），只跟路径有关，换域名不丢评论 |
| **Umami 统计** | 按页面路径统计，与域名无关 |
| **RSS 订阅者** | 旧域名 301 后阅读器会跟着跳转（订阅数可能短期波动） |
| 本地开发 / 构建 | `npm run dev` / `npm run build` 不依赖线上域名 |
| `wrangler.jsonc` | `name` 只在 Worker 名也变时才改；`routes` 那段保持注释就行 |

### ⚠️ 会影响备案

ICP 备案是**按域名**的：

- 换域名要**为新域名重新备案**，不是改一下就行
- 旧的备案号要记得注销，否则可能被列入异常

### 收尾清单

- [ ] 新域名能打开 —— **手机连流量、关掉 VPN** 测一次（这才算数）
- [ ] `.\scripts\check-live.ps1 -Base https://新域名` 全绿
- [ ] 旧域名 301 到新域名（或关掉 `workers.dev` 路由）
- [ ] Google Search Console / Bing Webmaster 提交新的 `sitemap-index.xml`
- [ ] 检查正文/关于页里手写过的旧链接（`src/content/**`、`src/consts.ts`）
- [ ] 更新外部地方的旧链接：签名档、友链、社交主页

### 我能替你做 / 不能做

改 `CANONICAL_SITE`、更新文档、上线后逐项核对 → **给我域名就行**。
买域名（实名 + 付款）、在控制台绑域名、提交备案（身份证 + 人脸核验）→ **必须你本人**。

---

## 更新、回滚、下线

| 想做的事 | 怎么做 |
| --- | --- |
| 更新内容 | 改文章 → `npm run deploy`（Git 集成则 `git push`） |
| 回滚到上一个版本 | Dashboard → 项目 → **Deployments** → 找历史版本 → **Rollback**。Cloudflare 保留每次部署的产物 |
| 临时下线 | Deployments → 把当前生产部署改成别的历史版本 |
| 彻底删除 | 项目 → **Settings** → 删除项目（`*.pages.dev` 会失效） |

---

## 想先临时给别人看一眼（不部署）

```bash
# 同一 Wi-Fi 下即可访问，适合手机测样式
npm run preview:lan

# 临时公网地址，任何拿到链接的人都能看，不需要账号，关掉终端就失效
npx --yes cloudflared tunnel --url http://localhost:4321
```

`cloudflared` 会打印一个 `https://xxx.trycloudflare.com` 地址，把它发给别人即可。
注意这是**临时**的，且内容会被 Cloudflare 中转，别用来传敏感东西。

---

## 常见问题

**中国大陆打不开，挂上代理就能开**

不是你的配置有问题 —— `*.workers.dev` 在中国大陆被 DNS 污染，任何项目用这个域名都一样。
判据：`Resolve-DnsName <你的域名>` 解析出来是 `31.13.88.169` 这类 **Meta 网段**的 IP
（Cloudflare 不可能用那个网段）。解决办法见 〈让中国大陆也能访问〉。

**能打开，但很慢 / 时好时坏**

正常。Cloudflare 免费版在中国大陆**没有专门优化**，晚高峰尤其明显。
想改善见方案 B 末尾的「优选 IP + DNS 分线路」。

**`npm run preview` 报找不到 dist**
先 `npm run build`。preview 只是把 `dist/` 起个静态服务器，不负责构建。

**`/search` 在本地一直是「搜索索引还没有生成」**
正常。Pagefind 索引的是构建产物，`npm run dev` 下不存在。用 `npm run build && npm run preview`，
或者直接看线上。

**`npx wrangler login` 卡住 / 浏览器没弹出来**
手动复制终端里给的 URL 到浏览器。公司网络可能拦截 OAuth 回跳，换个网络或用手机热点试。

**部署成功但页面是旧的**
九成是忘了重新构建。`npm run deploy` 已经带了 `build`，但如果只跑了 `wrangler pages deploy dist`
就会上传上一次的 `dist`。

**`wrangler pages project create` 说项目已存在**
正常，说明之前建过，直接跑 `npm run deploy` 即可。
