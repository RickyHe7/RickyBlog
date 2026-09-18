# 部署指南

## 先回答问题：现在别人能访问吗？

**不能。** `npm run dev` 和 `npm run preview` 起的服务都只在你本机，`localhost` 这个地址在别人电脑上指向的是别人的电脑。

「能被访问」有四种程度，按投入从小到大排：

| 方式 | 谁能看到 | 地址 | 怎么做 | 关掉进程后 |
| --- | --- | --- | --- | --- |
| 本机预览 | 只有你自己 | `http://localhost:4321` | `npm run build && npm run preview` | 失效 |
| **局域网** | 同一 Wi-Fi 下的设备（手机、同办公室同事） | `http://192.168.1.236:4321` | `npm run preview:lan` | 失效 |
| 临时公网隧道 | 任何拿到链接的人 | 随机 `https://xxx.trycloudflare.com` | 见文末 | 失效 |
| **正式部署** | 任何人，长期 | 固定域名 | 见下文 | 长期有效 |

> 局域网方式最适合**用手机验证移动端布局** —— 手机上输入 `http://192.168.1.236:4321` 即可。
> 你的局域网 IP 会变（换网络、路由器重新分配），以 `npm run preview:lan` 启动时打印的 Network 那一行为准。
> 首次启动 Windows 可能弹出防火墙询问，要允许「专用网络」访问才能被其他设备看到。

---

## 关键前提：需不需要 Git 仓库？

Cloudflare Pages 有两种接入方式，它们对仓库的要求正好相反：

| 接入方式 | 需要 Git 仓库吗 | 谁来构建 | 以后怎么更新 |
| --- | --- | --- | --- |
| **Git 集成**（Connect to Git） | **必须**（GitHub / GitLab） | Cloudflare 服务器 | `git push` 即自动部署 |
| Direct Upload（命令行直传） | **不需要** | 你的电脑 | 重新跑一条命令 |

**本项目当前走 Git 集成**（见下一节）。代价是必须有一个 GitHub 仓库 —— 也就是说先前「不建仓库」那条决定已作废。
如果哪天不想再维护仓库，换到 Direct Upload 的成本很低：`npm run deploy` 一条命令的事，两种方式拿到的是同类 `*.pages.dev` 地址。

---

## 当前选择：路线 B（Git 集成）

> 这一节就是本项目**正在走的路线**。路线 A 保留在下面作为备选。
>
> 代价要提前说清楚：路线 B **必须有一个 GitHub 仓库**，也就是说之前「不建仓库」那条决定作废了。
> 好处是以后写完文章 `git push` 就自动上线，不用在本机跑构建。

### 一次性准备

**1. 在 GitHub 建仓库**

浏览器打开 https://github.com/new ，按下表填：

| 字段 | 建议值 | 说明 |
| --- | --- | --- |
| Repository name | `RickyBlog` | 与本地目录同名，好认 |
| Description | 随便写 | 例如「个人博客：小技巧 / 读书笔记 / 生活记录」 |
| **Visibility** | **Public** | 见下面说明 |
| Initialize with README | **不要勾** | 本地已经有 README 和首个提交了，勾了会冲突 |
| Add .gitignore / license | **都不选** | 同上，本地已经准备好了 |

**关于 Public 还是 Private：**

- **Public**：源码公开。你的文章本体在 `src/content/posts/` 里，公开等于文章源码公开（但博客本身也是公开的，所以通常无所谓）。**而且以后要开 Giscus 评论必须是 Public 仓库**，所以推荐 Public。
- **Private**：源码不公开，Cloudflare 那边需要额外授权 GitHub App 访问私有仓库。功能上没问题，但评论以后得再单独找一个公开仓库。

**2. 把本地代码推上去**

仓库建好后（**空仓库**，不要带任何初始化文件），把页面上显示的仓库地址发我，我来执行推送。
或者你自己跑：

```bash
cd C:/Repository/Person/RickyBlog
git remote add origin https://github.com/RickyHe7/RickyBlog.git   # 换成你的实际地址
git push -u origin main
```

首次推送会弹出浏览器让你登录 GitHub 授权（Git Credential Manager），点确认即可，之后不用再登。

**3. 在 Cloudflare 里接上**

Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 授权并选中 `RickyBlog` 仓库，然后按下表填构建配置：

| 配置项 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |

**4. 在 Pages 里加环境变量**（这一步不能省，因为 `.env` 被 gitignore 了，不会上传）

Settings → **Environment variables** → 选 **Production**（要对 Preview 也生效就再加一遍），逐条添加：

| 变量 | 值 | 必填 | 作用 |
| --- | --- | --- | --- |
| `NODE_VERSION` | `22` | **必填** | 不设会用默认旧版 Node，Astro 7 直接装不上。项目里已放 `.nvmrc`（内容 `22`），正常情况下会自动生效，但显式设一遍最稳 |
| `SITE_URL` | 你的真实域名 | **必填** | sitemap / canonical / OG / RSS 的绝对地址都靠它 |
| `PUBLIC_GISCUS_REPO` | 如 `RickyHe7/RickyBlog` | 可选 | 评论，四个都填才显示 |
| `PUBLIC_GISCUS_REPO_ID` | giscus.app 上取 | 可选 | 同上 |
| `PUBLIC_GISCUS_CATEGORY` | 如 `Announcements` | 可选 | 同上 |
| `PUBLIC_GISCUS_CATEGORY_ID` | giscus.app 上取 | 可选 | 同上 |
| `PUBLIC_UMAMI_SRC` | 如 `https://cloud.umami.is/script.js` | 可选 | 统计，两个都填才生效 |
| `PUBLIC_UMAMI_WEBSITE_ID` | Umami 里取 | 可选 | 同上 |
| `PUBLIC_BUTTONDOWN_USERNAME` | buttondown 用户名 | 可选 | 订阅表单，填了才出现 |

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
2. **构建失败要去看 Pages 的构建日志**，不是你本机的终端。最常见的失败原因就是 `NODE_VERSION` 没设成 22。

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

1. **把真实域名填回 `SITE_URL`，再部署一次**

   在正式域名确定前，`SITE_URL` 是占位的 `https://rickyblog.pages.dev`。如果一直不改，生成的
   sitemap / canonical / OG 会全部指向一个不存在的域名 —— 搜索引擎会收录错的东西。

   拿到真实地址后（比如 `https://ricky-blog.pages.dev`）：改 `.env` 里的 `SITE_URL` → 重新 `npm run deploy`。

2. **逐项核对线上**（`build + preview` 能过的，线上不一定）

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

## 绑定自己的域名（可选）

Cloudflare Pages → 你的项目 → **Custom domains** → **Set up a custom domain** → 输入域名 → 按提示改 DNS（域名没在 Cloudflare 托管的话，会给你一条 CNAME 记录去别处加）。

加完之后**记得回改 `SITE_URL` 并重新部署**。

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
