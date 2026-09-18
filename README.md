# Ricky's Blog

个人博客。记录小技巧、读书笔记和生活。

**技术栈**：Astro 7 · Tailwind CSS 4 · MDX · Pagefind · Cloudflare Pages
**特点**：纯静态、默认零客户端 JS、秋日落叶主题、暗色模式、全站可键盘操作

---

## 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | **≥ 22.12.0** | Astro 7 的硬性要求，低于这个版本装不上 |
| npm | ≥ 9.6.5 | 项目用 npm，锁文件是 `package-lock.json` |

> Astro 7 的 Markdown 处理器换成了 Rust 写的 **Sätteri**。它原生支持 GFM（表格、脚注、任务列表、删除线）、标题 ID 和智能标点，所以**不需要** remark-gfm 之类的插件。

## 快速开始

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器 → http://localhost:4321
```

```bash
npm run build     # 生产构建（含 Pagefind 索引）
npm run preview   # 本地预览构建产物 → http://localhost:4321
npm run check     # 类型与模板检查（astro check）
```

### 想让别人看到

| 需求 | 命令 | 结果 |
| --- | --- | --- |
| 手机测移动端布局 | `npm run preview:lan` | 同一 Wi-Fi 下访问 `http://<你的内网IP>:4321` |
| 临时给同事看一眼 | `npx --yes cloudflared tunnel --url http://localhost:4321` | 临时公网 https 地址 |
| **正式上线** | `git push` | Cloudflare Pages 自动构建并发布 |

完整步骤（GitHub 仓库设置、Cloudflare 构建配置、环境变量清单、域名绑定、回滚）见 **[DEPLOY.md](./DEPLOY.md)**。

## 目录结构

```
RickyBlog/
├─ astro.config.mjs          站点地址、集成、Markdown 处理器、外链插件
├─ pagefind.yml              Pagefind 索引配置（排除导航/页脚）
├─ .env.example              环境变量示例
├─ DEPLOY.md                 部署指南（Git 集成 / Direct Upload 对照、域名绑定、回滚）
├─ .nvmrc                    Node 版本（22），让 Cloudflare 构建与本地一致
├─ public/
│  ├─ favicon.svg            手写枫叶图标
│  ├─ avatar.svg             手写枫叶头像
│  └─ og-default.png         默认社交分享图（1200×630）
├─ scripts/
│  └─ generate_og_image.py   可选：重新生成分享图（日常构建不需要）
└─ src/
   ├─ consts.ts              站名 / 导航 / 社交链接 —— 改配置只改这里
   ├─ content.config.ts      内容集合与 frontmatter 校验规则
   ├─ data/optional.ts       项目 / 友链 / 装备 / 近况（默认全空）
   ├─ styles/global.css      设计令牌（@theme）+ 落叶动效 + 正文排版
   ├─ lib/
   │  ├─ posts.ts            全站唯一的文章查询出口（过滤草稿 + 排序）
   │  ├─ format.ts           日期格式化、阅读时长
   │  └─ seo.ts              canonical / OG / JSON-LD 构造
   ├─ layouts/               BaseLayout / ListLayout / PostLayout
   ├─ components/            Header / Footer / Sidebar / PostCard / TOC / …
   ├─ content/
   │  ├─ posts/              文章正文（.md 与 .mdx）
   │  └─ pages/about.md      「关于我」正文
   └─ pages/                 路由
```

## 页面清单

| 路径 | 说明 |
| --- | --- |
| `/` | 首页：Banner + 精选 + 最新文章（`#indexCard`）+ 分类 + 系列 |
| `/posts` | 文章列表（第 1 页） |
| `/posts/page/2` | 文章列表分页 |
| `/posts/<文件名>` | 文章详情 |
| `/tags` · `/tags/<标签>` | 标签总览 / 标签详情 |
| `/categories` · `/categories/<分类>` | 分类总览 / 分类详情 |
| `/archives` | 按年份归档 |
| `/search` | 站内搜索（Pagefind） |
| `/about` | 关于我 |
| `/projects` | 项目作品集 |
| `/links` · `/uses` · `/now` | 友链 / 工具装备 / 近况 |
| `/newsletter` | 订阅说明 |
| `/rss.xml` · `/sitemap-index.xml` · `/robots.txt` | 订阅与 SEO |
| `/404` | 404 页面 |

## 写一篇文章

在 `src/content/posts/` 下新建一个 `.md` 或 `.mdx` 文件。**文件名就是网址**：`hello.md` → `/posts/hello`。

```yaml
---
title: "文章标题"            # 必填
date: "2026-01-01"          # 必填
updated: "2026-01-02"       # 可选，填了才会显示「更新于」
description: "摘要"          # 必填，用于 SEO 与列表摘要
tags: ["标签1", "标签2"]     # 可选，数组
category: "技术"             # 必填，只能一个
cover: "my-cover.jpg"       # 可选，见下方说明
draft: false                # 可选，true 时全站消失
featured: false             # 可选，true 时进首页「精选」
series: "系列名"             # 可选
seriesOrder: 1              # 可选，从 1 开始
---
```

**frontmatter 写错会直接构建失败**，而不是静默生成坏页面。校验规则在 `src/content.config.ts`。

发表之后**不需要改任何配置**：首页、列表、分类、标签、归档、RSS、sitemap、搜索索引会在下次构建时自动带上它。

### 封面图

两种写法，自动走不同路径：

| 写法 | 行为 |
| --- | --- |
| `cover: "my-cover.jpg"` | 图片放在 `src/assets/` 下 → 用 Astro `<Image>` 做真实优化（WebP/AVIF、多尺寸 srcset、懒加载） |
| `cover: "/images/foo.jpg"` | 图片放在 `public/images/` 下 → 普通 `<img>`，显式宽高 + 懒加载（不压缩） |
| 不写 `cover` | 用纯 CSS 渐变 + 枫叶水印生成一张秋色封面，同一篇文章永远得到同一张 |

### 分类与标签

需求里约定的四个分类：**技术 / 项目复盘 / 读书笔记 / 生活**。

分类只从「已存在文章」里推导 —— 没有文章的分类不会出现在任何页面上（这是故意的，避免出现空分类）。

### 系列文章

给多篇文章填相同的 `series`，再用 `seriesOrder` 标明顺序，就会自动获得：

- 文章页顶部的系列标识（「系列：xxx · 第 N 篇」）
- 文章底部的系列目录（高亮当前篇）
- 「上一篇 / 下一篇」优先在**系列内部**按 `seriesOrder` 跳转

### MDX

需要在一个文件里混用 JSX 和 Markdown 时，把扩展名改成 `.mdx`。示例可以看 `src/content/posts/astro-search-comparison.mdx`，它在正文里直接用了一个组件、`export const` 数据和一个 `.map()` 循环。

## ⚠️ 搜索在开发服务器里不可用（这是正常的）

Pagefind 索引的是**构建出来的 HTML**，不是 Markdown 源文件。`npm run dev` 下不存在索引文件，所以 `/search` 会显示一段说明而不是装作能搜。

要看搜索效果：

```bash
npm run build
npm run preview
```

然后访问 preview 输出的地址下的 `/search`。快捷键 `⌘K` / `Ctrl+K` 可以从任意页面跳到搜索页。

同样地，搜索**只在构建产物上**生效，所以这个功能只能在 preview 或线上验证。

## 需要配置才能启用的功能

评论、统计、订阅三项都**默认关闭**，且未配置时组件完全不渲染 —— 构建永远不会因为它们缺失而失败。要启用就在 `.env` 里填（本地）或填到 Cloudflare Pages 的环境变量里（线上）。

| 功能 | 需要的变量 | 取值 |
| --- | --- | --- |
| 评论（Giscus） | `PUBLIC_GISCUS_REPO` `PUBLIC_GISCUS_REPO_ID` `PUBLIC_GISCUS_CATEGORY` `PUBLIC_GISCUS_CATEGORY_ID` | https://giscus.app/zh-CN （需要一个**公开**仓库并开启 Discussions） |
| 统计（Umami） | `PUBLIC_UMAMI_SRC` `PUBLIC_UMAMI_WEBSITE_ID` | Cloud：`https://cloud.umami.is/script.js`；也可自建 |
| 订阅（Buttondown） | `PUBLIC_BUTTONDOWN_USERNAME` | buttondown.com 的用户名 |
| 站点地址 | `SITE_URL` | 换域名时用，不填则用 `astro.config.mjs` 里的默认值 |

完整示例见 `.env.example`。

## 部署

走 **Cloudflare Pages · Git 集成**：推到 GitHub，Cloudflare 自动构建发布。
**详细步骤在 [DEPLOY.md](./DEPLOY.md)**，这里只给要点。

1. 在 GitHub 建一个仓库（**空仓库**，不要勾 README / gitignore / license）
2. 本地推送：

   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

3. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选中仓库
4. 构建设置：Build command `npm run build`，Output directory `dist`，Framework preset `Astro`
5. **环境变量必须加**（`.env` 被 gitignore 了，不会上传到 Cloudflare）：

   | 变量 | 值 | 必填 |
   | --- | --- | --- |
   | `NODE_VERSION` | `22` | **必填**，否则默认旧版 Node，Astro 7 装不上 |
   | `SITE_URL` | 你的真实域名 | **必填**，sitemap / canonical / OG / RSS 全靠它 |
   | `PUBLIC_GISCUS_*`、`PUBLIC_UMAMI_*`、`PUBLIC_BUTTONDOWN_USERNAME` | 见 `.env.example` | 可选，不填则对应区块不渲染 |

   > **别把 `SITE_URL` 填成 `https://rickyblog.pages.dev`** —— 那个域名属于别人的博客（实测确认）。
   > `SITE_URL` 留空时构建会回退到保留域名 `rickyblog.example.com` 并打警告，不会悄悄指错。

   > 本地构建读 `.env`（靠 `astro.config.mjs` 里的 `loadEnv()`），
   > 线上构建读 Pages 的环境变量 —— `SITE_URL` 两条路都支持，细节见 DEPLOY.md。

6. 保存并部署。以后 `git push` 即自动重新构建

> 项目里已放 `.nvmrc`（内容 `22`），正常情况 Node 版本会自动对齐；`NODE_VERSION` 是显式保险。

**上线后别忘了**：把真实域名填回 `SITE_URL`。sitemap / canonical / OG / RSS 全靠它推导绝对地址，用占位域名会让搜索引擎收录错的东西。

不想维护仓库的话，也可以改用 Direct Upload（`npm run deploy`，不需要 Git）—— 两种方式的对照表在 DEPLOY.md。

## 设计系统

主题是**秋日落叶**。所有令牌都在 `src/styles/global.css` 的 `@theme` 里（Tailwind v4 是 CSS-first，没有 `tailwind.config.js`）。

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `paper-50/100/200/300` | 暖米白系 | 亮色背景、卡片、分隔线 |
| `bark-900/700/500` | 暖棕系 | 正文、次级文字 |
| `maple-500` | `#e2701f` | 主色：装饰、大字、当前态 |
| `maple-700` | `#9e4613` | **正文链接专用**（对暖白背景对比度 ≈ 5.9:1） |
| `ginkgo-400/500` | 银杏黄 | 强调、系列标识 |
| `crimson-400/500` | 枫红 | 警示、点缀 |
| `night-900/800/700` | 暖棕黑 | 暗色模式背景与卡片 |
| `night-200` | `#f7a869` | 暗色模式链接（对比度 ≈ 9.2:1） |

**为什么链接不直接用主色**：`maple-500` 对白底只有 3.2:1，够用于大字和 UI，但正文链接需要 ≥ 4.5:1。所以链接统一用更深的 `maple-700`。

字体全部走系统字体栈，零外部字体请求。图标全部是手写内联 SVG，无图标库、无版权问题。

落叶动效是纯 CSS（7 片叶子，窄屏 3 片），系统开启「减少动效」时整层隐藏。

## 已知限制与待办

- **圆角与动效**：卡片 `rounded-xl`（12px）、按钮 `rounded-lg`、标签 `rounded-full`；过渡 150–200ms，无滚动视差
- **`/projects` `/links` `/uses` `/now`** 目前是空状态页：这些内容只有本人能提供，页面已经接好数据结构，填空即可
- **`about.md`** 的「我在做什么」段落留了骨架待补
- **示例文章**三篇（`hello-markdown`、`astro-search-comparison`、`astro-content-schema`）都是通用技术题材，用于演示排版，可以随时删除
- **多语言（i18n）** 未实现，当前只有中文单语
- **OG 图不自动生成**：目前是 `public/og-default.png` 一张默认图；需要按文章动态生成时再引入

### 重新生成分享图（可选）

```bash
pip install pillow
python scripts/generate_og_image.py
```

日常开发与构建**不需要** Python —— 产物已经提交，这个脚本只在改站名或换配色时才需要跑。

## 授权

内容（文章、图片）版权归作者所有，转载请注明出处。
代码部分可自由参考。
