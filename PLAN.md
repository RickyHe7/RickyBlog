# Ricky's Blog — 实现计划（待确认，未开始编码）

> 状态：**仅计划**。等你确认本文件 + 回答第 9 节的问题后，才进入 Phase 0 写代码。
> 版本核实时间：2026-09-18（实测 npm registry，非记忆值）

---

## 0. 结论先行

### 0.1 技术栈评估：合适，无需更换

Astro + Tailwind + MDX 对「阅读优先、加载快、SEO 好」的个人博客是最优解之一：

| 诉求 | Astro 的对应能力 |
| --- | --- |
| 加载快 / Lighthouse 90+ | 默认静态输出、默认零客户端 JS，只有显式 `client:*` 的组件才下水 |
| Markdown/MDX 写文章 | 一等公民，MDX 只需一个集成 |
| 代码高亮 + 复制 + 行号 | 内置 Shiki；Expressive Code 补齐行号与复制按钮，构建期渲染无运行时开销 |
| 图片优化 | 内置 `<Image>` / `getImage()`，自动生成响应式格式与尺寸 |
| 全文搜索 | Pagefind 索引 build 产物，纯前端、零服务端 |
| 部署 | Cloudflare Pages 官方支持，产物就是静态文件 |

### 0.2 需要修正的 3 处

1. **Tailwind 用官方 Vite 插件，不用 `@astrojs/tailwind`**。该集成在 Tailwind v4 已不适用；v4 是 CSS-first，**没有 `tailwind.config.js`**，设计令牌写在 CSS 的 `@theme` 里。配置入口是 `astro.config.mjs` 的 `vite.plugins: [tailwindcss()]`。
2. **Pagefind 只在 build 产物上有索引，dev server 下必然搜不到东西**（这是机制问题，不是配置问题）。方案：用 `astro-pagefind` 集成自动挂钩 build，并加 `predev` 脚本生成一份 dev 用的索引快照。验收搜索必须走 `build + preview`。
3. **需求内部有两处冲突**：包管理器（§8 写 npm / §11 验收写 pnpm），代码仓库（`StdfLab.git` 看着是另一个项目，不是博客仓库）。见第 9 节。

### 0.3 唯一建议减配的地方

**自动生成 OG 图**（satori / resvg）是全套需求里唯一明显增重的项：会引入 canvas/wasm 依赖、拉长构建、在 Cloudflare 构建机上偶发字体问题。建议先用「静态 SVG 模板 + 标题参数化」顶住，真需要动态生成时再作为 Phase 7 单独加。

### 0.4 已核实版本（2026-09-18）

```
astro                              7.3.3    (engines: node >=22.12.0, npm >=9.6.5)
tailwindcss / @tailwindcss/vite    4.3.3
@tailwindcss/typography            0.5.20
@astrojs/mdx                       8.0.1
@astrojs/sitemap                   3.7.4
@astrojs/rss                       4.0.19
@astrojs/check                     0.9.10
pagefind                           1.5.2
astro-pagefind                     2.0.1    (peer: astro ^2~^7 ✅)
astro-expressive-code              0.44.2   (peer: astro ^7.0.0 ✅)
@expressive-code/plugin-line-numbers 0.44.2
reading-time                       1.5.0
rehype-external-links              3.0.0
```

本机环境：Node **22.22.2** ✅（满足 Astro 7 的 ≥22.12.0）、npm 10.9.7。

---

## 1. 目录结构

```
C:\Repository\Person\RickyBlog\
├─ .github/workflows/deploy.yml      # 可选：GitHub Actions 部署（与 Pages Git 集成二选一）
├─ .gitignore                        # dist/ node_modules/ .env public/pagefind/
├─ .env.example                      # 所有外部服务的占位变量
├─ README.md                         # 安装 / 开发 / 构建 / 部署 / 写文章说明
├─ PLAN.md                           # 本文件
├─ astro.config.mjs                  # site + integrations + vite(tailwind) + expressive-code
├─ pagefind.yml                      # 索引排除选择器（nav/footer/sidebar）
├─ tsconfig.json
├─ package.json
├─ public/
│  ├─ favicon.svg                    # 手写 SVG（橘色落日），无第三方版权风险
│  ├─ robots.txt                     # 指向 sitemap-index.xml
│  ├─ og-default.svg                 # 默认社交分享图
│  └─ images/placeholder-cover.svg   # 无封面时的占位图
└─ src/
   ├─ content.config.ts              # Content Layer 集合定义（Astro 5+ 放在 src/ 根，不是 src/content/config.ts）
   ├─ consts.ts                      # 站名/副标题/导航/社交/作者信息的唯一数据源
   ├─ env.d.ts
   ├─ styles/
   │  └─ global.css                  # @import "tailwindcss" + @plugin typography + @theme 令牌 + @custom-variant dark
   ├─ content/
   │  ├─ posts/                      # 文章正文
   │  │  ├─ hello-world.md
   │  │  ├─ markdown-guide.mdx
   │  │  └─ astro-blog-notes.md
   │  └─ pages/about.md              # 关于我正文（留空可后补）
   ├─ layouts/
   │  ├─ BaseLayout.astro            # <html> / head / 主题内联脚本 / skip-link / header / footer
   │  ├─ ListLayout.astro            # 列表页骨架：主内容 + 右侧边栏
   │  └─ PostLayout.astro            # 文章页骨架：正文 + 右侧 TOC
   ├─ components/
   │  ├─ BaseHead.astro              # title/description/canonical/OG/Twitter/JSON-LD/Umami
   │  ├─ Header.astro  Footer.astro  MobileNav.astro  ThemeToggle.astro
   │  ├─ Sidebar.astro  AuthorCard.astro
   │  ├─ PostCard.astro  Pagination.astro  EmptyState.astro
   │  ├─ TagList.astro  CategoryBadge.astro
   │  ├─ TOC.astro                   # 由渲染结果的 headings 生成，含滚动高亮
   │  ├─ PrevNext.astro
   │  ├─ Comments.astro              # Giscus，未配置环境变量则整块不渲染
   │  ├─ Analytics.astro             # Umami，同上
   │  ├─ Newsletter.astro            # Buttondown，同上
   │  └─ SearchBox.astro             # 挂载 Pagefind UI
   ├─ lib/
   │  ├─ posts.ts                    # 已发布文章查询 / 标签归类 / 上下篇 / 系列排序
   │  ├─ format.ts                   # 日期格式化、阅读时长
   │  └─ seo.ts                      # OG、JSON-LD 构造
   └─ pages/
      ├─ index.astro                 # 首页
      ├─ posts/index.astro           # 列表第 1 页（主内容 + 右侧边栏）
      ├─ posts/page/[page].astro     # 列表第 2..N 页（分页）
      ├─ posts/[...slug].astro       # 文章详情
      ├─ tags/index.astro  tags/[tag].astro
      ├─ categories/index.astro  categories/[category].astro
      ├─ archives.astro              # 按年月分组
      ├─ search.astro                # Pagefind
      ├─ projects.astro  links.astro  uses.astro  now.astro  newsletter.astro
      ├─ about.astro
      ├─ 404.astro
      └─ rss.xml.ts
```

**路由设计说明**：文章列表用 `/posts`（需求里「`/blog` 或 `/posts`」二选一 + 详情写死 `/posts/[slug]`，统一到 `/posts` 最不容易出错）。分页刻意放在 `/posts/page/2`，避免 `[...page]` 与 `[...slug]` 两个动态段在 `src/pages/posts/` 下冲突。

---

## 2. 分阶段计划

每阶段结束我都会给你「改了什么 + 怎么自己验证」，验证通过再进入下一阶段。

### Phase 0 — 初始化与地基
**动手内容**：`npm init` → 装 astro 7.3.3 及集成 → `astro.config.mjs`（site、mdx、sitemap、tailwind vite 插件）→ `tsconfig.json`（`astro/tsconfigs/strict`）→ `.gitignore` → `global.css` 挂上 Tailwind → `consts.ts` 填站名/副标题/导航/社交 → `Layout.astro` 最小版。
**验证**：`npm run dev` 打开 5173 看到 Tailwind 生效；`npm run build` 成功且 `dist/` 里有产物；`npx astro check` 0 error。

### Phase 1 — 设计系统与布局骨架
**动手内容**：`@theme` 里定义橘色系令牌、圆角、容器宽度、行高；`@custom-variant dark` 打开类名暗色模式；`BaseLayout`（语义化 landmark、skip-link、`prefers-reduced-motion`）；`Header`（桌面导航 + 移动端抽屉）、`Footer`、`ThemeToggle` 与防闪烁内联脚本；`ListLayout` 双栏骨架 + `Sidebar`。
**验证**：亮/暗切换无闪烁、刷新后保持；320px / 768px / 1280px 三档无横向滚动；Tab 键可走完全部导航；对比度用 DevTools 检查正文与链接 ≥ 4.5:1。

### Phase 2 — 页面与路由
**动手内容**：`content.config.ts` 建 `posts` 集合（zod schema）；首页（最新 + 精选 + 分类入口 + 个人介绍）；`/posts` 列表 + 分页；`/posts/[...slug]` 详情；`/tags` 与 `/tags/[tag]`；`/categories` 与 `/categories/[category]`；`/archives`；`/about`；`404`；可选页 `projects` `links` `uses` `now` `newsletter` 先给不编造的空壳。
**验证**：逐个 URL 手点一遍；导航栏每一项都能到；文章详情能显示标题/日期/分类/标签/封面；故意给一个 slug 打错日期类型，`build` 应当失败（证明 schema 真的在校验）。

### Phase 3 — 内容系统
**动手内容**：`lib/posts.ts` 统一「排除 draft + 按日期倒序」的查询，全站只走这一个出口；MDX 集成；`@tailwindcss/typography` 的 `prose` 接管正文排版并针对橘色主题微调；Expressive Code 配行号开关 + 一键复制；`TOC.astro` 从 `headings` 生成并滚动高亮；`PrevNext`；阅读时长；脚注、表格、引用、外链新窗口（`rehype-external-links`）。
**验证**：新增一个 `.md` 文件 → 不重启 dev 就能在列表、标签页、归档、RSS 里同时出现（一份数据源多处生效）；`draft: true` 后它从列表/Tags/归档/RSS/sitemap 全部消失；代码块复制按钮可用；窄屏代码块横向滚动而不是撑破布局。

### Phase 4 — 功能增强
**动手内容**：Pagefind（`astro-pagefind` + `pagefind.yml` + `data-pagefind-body` 限定索引范围 + 搜索页 UI + Ctrl/Cmd+K 唤起）；`rss.xml`；`sitemap`；`robots.txt`；`Comments`（Giscus，`mapping=pathname`）；`Analytics`（Umami）；`Newsletter`（Buttondown）；未配置的环境变量一律「组件静默不渲染」，绝不因此 build 失败。
**验证**：`npm run build && npm run preview` 后在 `/search` 搜关键词能出结果（**dev 下搜不到属正常，见风险 #1**）；`/rss.xml` 是合法 XML 且含最新文章；`/sitemap-index.xml` 可达；临时把 `.env` 清空重跑 build，仍应成功。

### Phase 5 — SEO / 性能 / 可访问性
**动手内容**：`BaseHead` 补齐 title 模板、description、canonical、OG（`article:*`）、Twitter Card、`JSON-LD`（BlogPosting / Person / WebSite）、`<html lang>`；`<Image>` 接管封面图（响应式 + 懒加载 + 预置宽高防 CLS）；列表页分页与字段裁剪；404 与错误态。
**验证**：跑 Lighthouse（移动端）四项尽量 90+，把实测分数贴给你；Lighthouse 无障碍项 0 报错；用分享调试工具核对 OG 抓取；缩放到 200% 检查布局不破。

### Phase 6 — 部署
**动手内容**：`README.md`（写文章流程、frontmatter 字段表、常用命令、部署步骤）；`.env.example`；Cloudflare Pages 配置说明（build command / output dir / `NODE_VERSION=22`）；按你选择给 GitHub Actions 或走 Pages Git 集成；首次部署跑通。
**验证**：线上 URL 打开正常；线上 `/rss.xml`、`/sitemap-index.xml`、`/search` 均可用；push 一次提交能自动触发新部署。

### Phase 7 —（可选，最后做）
自动生成 OG 图、多语言 i18n。**不放进首版**，理由见 0.3 与第 9 节问题 15。

---

## 3. 依赖清单

### 运行时依赖（`dependencies`）

| 包 | 版本 | 用途 |
| --- | --- | --- |
| astro | 7.3.3 | 框架本体 |
| @astrojs/mdx | 8.0.1 | `.mdx` 支持 |
| @astrojs/sitemap | 3.7.4 | `sitemap-index.xml` |
| @astrojs/rss | 4.0.19 | `rss.xml` |
| tailwindcss | 4.3.3 | 样式引擎 |
| @tailwindcss/vite | 4.3.3 | Astro/Vite 接入（**替代已废弃的 @astrojs/tailwind**） |
| @tailwindcss/typography | 0.5.20 | 正文 `prose` 排版 |
| astro-expressive-code | 0.44.2 | 代码块：复制按钮 + 行号 + 标题 |
| @expressive-code/plugin-line-numbers | 0.44.2 | 行号开关 |
| astro-pagefind | 2.0.1 | 构建后自动执行索引 |

### 开发依赖（`devDependencies`）

| 包 | 版本 | 用途 |
| --- | --- | --- |
| pagefind | 1.5.2 | 索引 CLI（供集成调用 + dev 快照脚本） |
| @astrojs/check + typescript | 0.9.10 / latest | `astro check` 类型与模板检查 |
| reading-time | 1.5.0 | 阅读时长 |
| rehype-external-links | 3.0.0 | 外链 `target="_blank"` + `rel` |

**刻意不引入**：任何 UI 组件库、图标库、外部字体、CSS-in-JS、状态管理、CDN 资源。图标全部手写内联 SVG，字体走系统字体栈。总依赖数控制在 14 个以内。

---

## 4. 内容模型（frontmatter）

`src/content.config.ts`，用 zod 校验，写错字段直接 build 失败：

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),          // "2026-01-01" 字符串会被转成 Date
    updated: z.coerce.date().optional(),
    description: z.string(),        // 用于 SEO / 列表摘要，必填
    tags: z.array(z.string()).default([]),
    category: z.string(),
    cover: z.string().optional(),   // 缺省用 public/images/placeholder-cover.svg
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),   // 首页「精选」
    series: z.string().optional(),          // 系列文章（问题 14）
    seriesOrder: z.number().optional(),
  }),
});

export const collections = { posts };
```

与你给的示例完全兼容；只多了 `featured` / `series` / `seriesOrder` 三个**可选**字段。

---

## 5. 需求 → 实现映射（逐条对照）

| 需求 | 实现方式 |
| --- | --- |
| 代码高亮 / 复制 / 行号可选 | Expressive Code + line-numbers 插件，行号按语言或全局开关 |
| 文章 TOC | 由渲染结果的 `headings` 生成，滚动高亮，移动端折叠 |
| 上一篇 / 下一篇 | 基于「已发布 + 时间倒序」数组的索引差一位；系列文章内优先取同系列 |
| 阅读时长 | `reading-time`，中英混排系数本地调过 |
| 暗色 / 亮色 | 类名策略；`@custom-variant dark`；`localStorage` + `<head>` 内联阻塞脚本防闪烁 |
| 响应式 / 移动端优先 | 单栏起手 → `md:` 双栏 + 侧边栏；侧边栏在窄屏折到内容下方 |
| 搜索 | Pagefind + `data-pagefind-body` 只索引正文；`pagefind.yml` 排除 nav/footer/sidebar |
| RSS / sitemap / robots | `@astrojs/rss` 星标 `rss.xml.ts`；`@astrojs/sitemap`；手写 `public/robots.txt` |
| SEO | `BaseHead` 统一产出 title 模板 / description / canonical / OG / Twitter Card / JSON-LD |
| 图片优化 | Astro 内置 `<Image>`，显式宽高防 CLS，首屏外懒加载；封面缺失走 SVG 占位 |
| 评论 | Giscus（GitHub Discussions），懒加载，未配置则整块隐藏 |
| 访问统计 | Umami，只需要 `script src` + `website-id`，未配置则隐藏 |
| 邮件订阅 | Buttondown 内嵌表单，未配置则隐藏 |
| 外链新窗口（可选） | `rehype-external-links`，同时补 `rel="noopener noreferrer"` |
| 性能与可访问性 | 语义化 landmark、skip-link、`focus-visible`、`prefers-reduced-motion`、对比度校验 |

---

## 6. 设计系统（先给默认值，等你改）

| 令牌 | 值 | 说明 |
| --- | --- | --- |
| 主色 brand | `#F97316` | 橘色，用于强调、当前态、图标 |
| 强调/可点击色 | `#C2410C` | **链接与正文强调用这个更深的橘**，保证白底对比度 ≥ 4.5:1；`#F97316` 只用于装饰与大字号 |
| 日出渐变 | `#FDBA74 → #FB923C → #F97316` | 用于头像环、封面占位、页脚氛围 |
| 亮色背景 | `#FFFBF5` / 卡片 `#FFFFFF` | 暖白，不是纯白，避免刺眼 |
| 暗色背景 | `#17120E` / 卡片 `#211A15` | 暖黑（带橘调），不是纯黑 |
| 字体 | 系统字体栈 | 中文优先 `PingFang SC / Microsoft YaHei`，无外部字体请求 |
| 布局 | 内容 `max-w-3xl` + 侧边栏 `w-64`，整体 `max-w-6xl` | 阅读优先，留白充足 |
| 圆角 | 卡片 `rounded-xl`、按钮 `rounded-lg`、标签 `rounded-full` | 需求里留空，这是我的默认，可改 |
| 动效 | `150–200ms` 过渡 + 悬停微抬升 | 不做滚动视差/进入动画，尊重 `prefers-reduced-motion` |
| 图标 | 手写内联 SVG，`stroke-width: 1.75` | 无图标库依赖、无版权问题 |

---

## 7. 风险点与对策

| # | 风险 | 影响 | 对策 |
| --- | --- | --- | --- |
| 1 | **Pagefind 在 dev server 下无索引** | `/search` 本地看起来是坏的，容易被误判为 bug | `astro-pagefind` 集成自动挂钩 build；加 `predev` 快照脚本；README 明确「搜索验收走 build + preview」 |
| 2 | Tailwind v4 是 CSS-first，网上海量教程仍是 v3 写法 | 照抄配置会失败 | 只用 `@theme` / `@plugin` / `@custom-variant`；不生成 `tailwind.config.js` |
| 3 | Astro 7 要求 Node ≥ 22.12.0 | 构建机 Node 太旧直接装不上 | 本机 22.22.2 ✅；Cloudflare Pages 必须显式设 `NODE_VERSION=22`，否则可能用默认旧版 |
| 4 | **头像 / 封面 / 项目 / 友链 素材缺失** | 有编造你个人经历的风险 | 一律用无版权的 SVG/CSS 占位，并在文件里写 `TODO`；绝不编造项目与人际关系 |
| 5 | Giscus / Umami / Buttondown 需要外部账号与 ID | 缺配置时可能 build 失败 | 全部经环境变量注入；**未配置就静默不渲染**，构建永远通过 |
| 6 | 暂无域名 | sitemap / canonical / OG 需要绝对 URL | `site` 只在 `astro.config.mjs` 一处定义，先用 `https://<project>.pages.dev` 占位，换域名改一行 |
| 7 | 自动生成 OG 图会显著增重 | 构建变慢、CI 偶发失败 | 首版用静态 SVG 模板，动态生成降级为 Phase 7 可选项 |
| 8 | 暗色模式首屏闪烁（FOUC） | 体验瑕疵，Lighthouse 不扣但肉眼可见 | `<head>` 内联阻塞脚本，渲染前读 `localStorage` 并打 `class` |
| 9 | 文章变多后列表页体积膨胀 | 首屏变慢，Lighthouse 掉分 | 分页 + 列表只传摘要字段，不把正文带进列表数据 |
| 10 | 无 CSS 框架兜底时样式易散落 | 维护成本上升 | 设计令牌集中在 `@theme`，组件样式只用令牌与 Tailwind 工具类，不写魔数 |
| 11 | 仓库地址疑似写错（`StdfLab.git`） | 代码推到别的项目里 | 见问题 2，等你确认 |

---

## 8. 验收标准对照

| 你的验收项 | 我这边怎么保证 |
| --- | --- |
| `install && dev` 可运行 | Phase 0 交付时当面跑给你看 |
| `build` 成功 | 每个 Phase 结束都跑一次，失败不进入下一阶段 |
| 移动/桌面正常 | 320 / 768 / 1280 三档逐页检查 |
| 导航、链接、RSS、sitemap 可用 | Phase 4 逐条手点 + 贴出实际输出 |
| 新增 Markdown 自动出现在列表 | Phase 3 用一个真实新增文件现场演示 |
| 暗色模式正常 | Phase 1 起每阶段回归一次 |
| 无控制台错误 | 每个 Phase 结束时检查浏览器 Console 与 `astro check` |
| SEO 标签完整 | Phase 5 用 `view-source` 逐项核对并贴给你 |

---

## 9. 需要你确认的问题（一次性，共 15 条）

### A. 会阻塞开工的（4 条）

1. **包管理器**：§8 写 npm，§11 验收写 pnpm，用哪个？→ 建议 **npm**（与 §8 一致，你本机 npm 10.9.7 就绪），验收命令改成 `npm install && npm run dev`。
2. **代码仓库**：`https://github.com/RickyHe7/StdfLab.git` 看起来是你 StdfLab 项目的仓库，不是博客的。→ 建议**新建独立仓库** `RickyBlog`（与本地目录 `C:\Repository\Person\RickyBlog` 对齐）。确认仓库名后我才会 `git remote`。
3. **Cloudflare Pages 接入方式**：用 Pages 自带的 Git 集成（**推荐，零配置，push 即部署**），还是走 GitHub Actions（§10 提到的）？两者同时开会导致重复部署，建议二选一。
4. **Giscus 需要**：一个**公开** GitHub 仓库 + 已开启 Discussions。用哪个仓库？（未定就先接好代码、留空配置，评论区块不显示）

### B. 需要素材/内容（缺失我就用占位、不编造，3 条）

5. **头像**：你说暂无 → 我打算用「贺」字首字母头像（纯 CSS/SVG 生成，零版权风险），拿到图后替换一行即可。可以吗？
6. **关于我**：先写「3 段待补充」的骨架占位，等你补正文。可以吗？
7. **`/projects`、`/links`、`/uses`、`/now`、`/newsletter`**：你的真实项目、友链、装备清单我没有。→ 建议**只建页面结构 + 一句「内容待补充」**，不塞假数据（因为 §12 明令禁止编造）。同意吗？
8. **示例 3 篇文章**：用通用技术题材（如「Astro 博客搭建笔记」「Markdown 写作规范」「暗色模式实现细节」）并标注为示例文章，还是你直接给 3 篇真实内容？

### C. 设计细节我给了默认值，你可以直接改（3 条）

9. **「双栏 + 侧边栏」的落法**：我计划 —— 列表页＝左侧文章流 + 右侧边栏（个人介绍/标签云/最新文章）；文章页＝左侧正文 + 右侧 TOC + 作者卡；窄屏全部折成单栏。符合你的设想吗？
10. **圆角**：需求里留空 → 默认卡片 `rounded-xl`、按钮 `rounded-lg`、标签 `rounded-full`。
11. **动效「适中」**：默认 `150–200ms` 过渡 + 悬停微抬升，不做滚动视差和进入动画（对性能和无障碍更友好）。

### D. 需要你拍板的功能范围（4 条）

12. **Umami**：用 **Umami Cloud**（免费额度，只需 `website-id`）还是自建（需要服务器 + 域名）？域名没定之前，建议先做「配置就绪、默认不启用」。
13. **Buttondown**：有账号吗？没有的话先接好表单、不启用。
14. **系列文章**：§3 的「是/否」没圈定 → 我计划加 `series` + `seriesOrder` 字段（不填就不显示），并让「上一篇/下一篇」优先在同系列内跳转。可以吗？
15. **多语言**：§13「以上都有」包含多语言，但 §2 写的是「中文/英文/中英双语」。真做 i18n 会让路由和内容量翻倍。→ 建议**首版只做中文单语**，把 i18n 放到 Phase 7，等站跑顺了再评估。同意吗？
16. **域名未定**：`site` 先用 `https://rickyblog.pages.dev` 占位（集中一处，换域名改一行），sitemap/canonical/OG 都由它推导。可以吗？

---

## 10. 开工顺序（确认后立即执行）

```
确认本计划 + 回答第 9 节
        │
        ▼
Phase 0  初始化与地基 ──► 验证：dev 起得来 + build 通过
        │
        ▼
Phase 1  设计系统与布局 ──► 验证：暗色切换 / 三档响应式 / 键盘可达
        │
        ▼
Phase 2  页面与路由 ──────► 验证：逐 URL 手点 + schema 故意报错
        │
        ▼
Phase 3  内容系统 ────────► 验证：新增 md 全站生效 / draft 全站消失
        │
        ▼
Phase 4  功能增强 ────────► 验证：build+preview 下搜索 / RSS / sitemap
        │
        ▼
Phase 5  SEO 与性能 ──────► 验证：Lighthouse 实测分数
        │
        ▼
Phase 6  部署上线 ────────► 验证：线上 URL + push 自动部署
```
