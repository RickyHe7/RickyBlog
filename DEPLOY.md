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

## 关键前提：你到底需不需要 Git 仓库？

你之前定的是「不建仓库」。这跟 Cloudflare Pages 的两种接入方式是这么个关系：

| 接入方式 | 需要 Git 仓库吗 | 谁来构建 | 以后怎么更新 |
| --- | --- | --- | --- |
| **Direct Upload**（命令行直传） | **不需要** | 你的电脑 | 重新跑一条命令 |
| **Git 集成**（Connect to Git） | **必须**（GitHub / GitLab） | Cloudflare 服务器 | 推到主分支即自动部署 |

**结论：不建仓库完全可行**，走路线 A。原来的计划（Git 集成）必须建仓库，两者冲突，你选一个。

我建议先用路线 A —— 它不逼你建仓库，也不需要把文章推到公开平台，而且换路线很容易（随时可以改成 Git 集成）。

---

## 路线 A：Cloudflare Pages · Direct Upload（推荐）

### 一次性准备（约 5 分钟）

1. **注册 Cloudflare 账号**（免费额度对个人博客绰绰有余）：https://dash.cloudflare.com/sign-up

2. **登录 wrangler**（Cloudflare 的官方 CLI，首次会自动下载）：

   ```bash
   npx --yes wrangler login
   ```

   会自动打开浏览器，点授权页的 **Allow**。

3. **创建 Pages 项目**（只需一次）：

   ```bash
   npx --yes wrangler pages project create ricky-blog
   ```

   `ricky-blog` 会成为你的域名前缀，最终地址形如 `https://ricky-blog.pages.dev`。
   想换名字就改这一处，同时改 `package.json` 里 `deploy` 脚本的 `--project-name`。

4. **建一个本机 `.env`**（可选，但建议）：

   ```bash
   cp .env.example .env
   ```

   然后填 `SITE_URL`。**这一步很关键**，下面单独说。

### 每次发布

```bash
npm run deploy
```

等价于：

```bash
npm run build
npx --yes wrangler pages deploy dist --project-name=ricky-blog
```

跑完会打印一个 https 链接，形如 `https://<一串 hash>.ricky-blog.pages.dev`。
（那串 hash 是本次部署的唯一地址，`https://ricky-blog.pages.dev` 永远指向最新一次。）

### ⚠️ Direct Upload 特有的一个坑：环境变量在本机

这一点和 Git 集成**完全相反**，很多人会踩：

| | 构建在哪跑 | 环境变量从哪读 | 生产/预览环境变量设在哪 |
| --- | --- | --- | --- |
| **Direct Upload** | **你的电脑** | 你本机的 `.env` | 没用 —— 产物是纯静态，HTML 已经生成好了 |
| Git 集成 | Cloudflare 服务器 | Pages 的 Settings → Environment variables | Pages 控制台 |

也就是说：Astro 在构建时就把 `PUBLIC_*` 这些值**内联进 HTML**了。所以

> **改了 `.env` 之后必须重新 `npm run deploy`，否则线上还是旧的。**

具体到本项目：

- `SITE_URL` → 影响 sitemap / canonical / OG / RSS 里的绝对地址
- `PUBLIC_GISCUS_*` → 决定评论区块是否出现
- `PUBLIC_UMAMI_*` → 决定统计脚本是否注入
- `PUBLIC_BUTTONDOWN_USERNAME` → 决定订阅表单是否出现

---

## 路线 B：Cloudflare Pages · Git 集成

只有当你愿意建 GitHub 仓库时才走这条。

1. 在 GitHub 建一个仓库（公开/私有都行）
2. 本地初始化并推送：

   ```bash
   git init && git add -A && git commit -m "init"
   git branch -M main
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```

3. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**，选中该仓库
4. 构建设置：

   | 配置项 | 值 |
   | --- | --- |
   | Framework preset | `Astro` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | 环境变量 **`NODE_VERSION`** | **`22`** ← 必须加，否则默认旧版 Node，Astro 7 装不上 |
   | 环境变量 `SITE_URL` 等 | 按需加（`PUBLIC_*` 同理） |

5. 保存并部署。以后 `git push` 到主分支会自动重新构建

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
