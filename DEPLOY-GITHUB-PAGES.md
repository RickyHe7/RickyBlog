# 部署到 GitHub Pages

> 本文件属于 **`github-pages` 分支**。`main` 分支走的是 Cloudflare，说明在 [DEPLOY.md](./DEPLOY.md)。

## 地址

**https://rickyhe7.github.io/RickyBlog/**

注意末尾那段 `/RickyBlog/` —— 这是 GitHub Pages 的「项目站点」形式：
`https://<用户名>.github.io/<仓库名>/`。
**这个子路径是本次改造唯一真正麻烦的地方**，见下面〈为什么要动那么多文件〉。

## 一次性设置（都在浏览器里，约 2 分钟）

1. 推送这条分支：

   ```bash
   git push -u origin github-pages
   ```

2. 仓库 → **Settings** → 左侧 **Pages**

3. **Build and deployment** → **Source** 选 **`GitHub Actions`**

   > ⚠️ 不要选 "Deploy from a branch" —— 那是另一条路（要往 `gh-pages` 分支提交构建产物），
   > 本仓库用的是工作流方式，`dist` 不进仓库。

4. 切到 **Actions** 标签，能看到 `Deploy to GitHub Pages` 已经在跑。
   跑完（约 1–2 分钟）地址就活了。

之后**每次推送到这条分支**都会自动重新构建并发布；
也可以在 Actions 页面手动 `Run workflow`（部署出问题时很好用）。

## 为什么要动那么多文件（子路径的代价）

站点从"根目录"变成"某个子目录"，所有**以 `/` 开头**的路径就都得多带一段前缀，
否则一律 404。这次的做法**不是到处手改字符串**，而是让 base 成为唯一开关：

| 位置 | 怎么处理 |
| --- | --- |
| `astro.config.mjs` 的 `SITE_BASE` | **唯一的开关**。`/RickyBlog` = 子路径部署；`/` = 根域名部署 |
| `_astro/*`、`pagefind/*` 等构建产物 | Astro 按 `base` 自动加前缀，不用管 |
| 组件里的链接（`href="/posts"`） | 统一走 `src/lib/url.ts` 的 `withBase()` |
| 导航数据（`src/consts.ts`） | 同上 |
| **Markdown 正文里手写的链接**（`[x](/tags/foo)`） | 走 `astro.config.mjs` 的 Sätteri 插件 `linkAndImageAttrs` |
| 运行时拼的地址（`absoluteUrl()`、RSS、robots.txt、Pagefind 的 `bundlePath`） | 各自内部已接 `withBase()` |

`withBase()` 读的是 `import.meta.env.BASE_URL`：`base` 没设时它是 `/`，
此时 `withBase()` 就是**恒等函数** —— 所以同一份代码放根域名下依然正确。
换句话说：**这次改造对 `main` 分支也是无害的**（只是多了一层无副作用的包装）。

> 怎么验证没漏？`dist` 里所有 HTML 的 `href` / `src`，凡是以 `/` 开头（且不是 `//`）
> 的路径，都必须以 `SITE_BASE` 开头。这是一次性穷举，比"我觉得都改到了"可靠。

## 想换成不带子路径的地址（https://rickyhe7.github.io/）

可以，但要换一个仓库：

1. 新建仓库，名字必须**正好**是 `RickyHe7.github.io`（GitHub 用户站点的命名规则）
2. 把这条分支推上去
3. `astro.config.mjs` 里把 `SITE_BASE` 改成 `'/'`
4. Settings → Pages → Source 选 `GitHub Actions`

代码不用再改（`withBase()` 会自动退化成恒等）。
代价是多一个仓库，而且**一个账号只能有一个用户站点**。

## ⚠️ 中国大陆的可达性（先看这条再决定）

这条是**退步**，必须说清楚：

| 地址 | 大陆直连 |
| --- | --- |
| `blog.infinitest.cloud`（`main` 分支：Cloudflare + 自有域名） | ✅ 能打开 |
| `*.workers.dev` | ❌ 打不开（DNS 污染） |
| **`*.github.io`** | ⚠️ **不稳定**：同样是境外域名，DNS 污染与 SNI 阻断都存在 |

`github.io` 在国内的处境和 `workers.dev` 属于**同一类问题**，并不是"GitHub 更稳"。
2026-09 查到的资料里，对策仍然是改 DNS / 改 hosts / 上代理 ——
而这些对**访客**都是门槛（总不能要求读者为了看你博客去改 hosts）。

所以：

- 如果这条分支成为**唯一**的线上地址，国内读者很可能打不开 ——
  这和你当初为了 `workers.dev` 打不开而去买域名的动机是冲突的。
- **推荐**：把 GitHub Pages 当**镜像 / 备份**，主站继续用自有域名。
  两个地址同时在线，国内走域名、境外走 github.io，成本几乎为零。

## 和 Cloudflare 怎么共存

两条分支各自独立、互不影响：

```bash
git switch main            # 回到 Cloudflare 那套配置（自有域名）
git switch github-pages    # 回到 GitHub Pages 那套配置
```

要注意的是：**内容改动得落到两条分支上**，否则两边会慢慢分叉。
这次改造刻意把配置差异压到最小（基本只有 `astro.config.mjs` 的两个常量、
`.github/workflows/`、`public/.nojekyll`），就是为了让同步不至于变成负担。
哪天决定只留一边，把另一条分支删掉即可。

## 常见问题

**构建成功，但页面没样式 / 链接全 404**
→ `SITE_BASE` 和 Pages 实际地址的路径不一致。项目站点的路径**必须**是 `/<仓库名>`，
斜杠和大小写都要和仓库名一致（路径大小写敏感）。

**Actions 里 `astro check` 报找不到类型**
→ 工作流里已经加了 `npx astro sync`。本地 `.astro/` 早就存在（且被 gitignore），
所以这个问题只在全新检出时出现，本地复现不了。

**`npm run build` 卡在最后一步不返回**
→ 见 `DEPLOY.md` 里那条〈构建收尾被删除守卫拦掉〉的排查记录（只有我这边的沙箱环境会这样，
GitHub Actions 与 Cloudflare 都不受影响）。本地遇到就重跑一次，或直接从上一份产物复制
`sitemap*.xml` + `pagefind/` 补齐。

**`.nojekyll` 是干嘛的**
→ 已在 `public/.nojekyll`（构建时复制到产物根目录）。走 Actions 部署其实不会跑 Jekyll，
但万一以后改成"从分支部署"，没有它 `_astro/` 会被 Jekyll 忽略 —— 那是经典翻车点，留着零成本。
