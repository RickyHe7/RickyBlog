---
title: "这个博客怎么写文章"
date: "2026-09-16"
description: "一篇可以当说明书用的示例文章：frontmatter 有哪些字段，以及本站支持的 Markdown 语法逐个示范。"
tags: ["Markdown", "写作", "效率工具"]
category: "技术"
draft: false
featured: true
---

> **注意：本文是站点初始化时生成的示例文章。**
> 它的作用是把排版和语法跑一遍给你看，不代表站主的真实经历，也不包含任何真实项目信息。
> 确认没问题后，删掉 `src/content/posts/` 下这三个文件，换上你自己的内容即可。

这篇文章同时干两件事：告诉你文件写在哪、有哪些字段；再把本站支持的 Markdown 语法逐个演一遍。

## 文件放在哪

所有文章都是 `src/content/posts/` 目录下的普通文本文件，`.md` 和 `.mdx` 都行：

```
src/content/posts/
├─ hello-markdown.md        →  /posts/hello-markdown
├─ astro-content-schema.md  →  /posts/astro-content-schema
└─ pagefind-in-astro.md     →  /posts/pagefind-in-astro
```

**文件名就是网址**。`hello-markdown.md` 会被发布到 `/posts/hello-markdown`，不需要在任何地方登记 —— 首页、文章列表、分类页、标签页、归档页、RSS、sitemap、搜索索引会在下一次构建时自动带上它。

## frontmatter 字段表

文件开头用三条短横线包起来的部分是 frontmatter：

```yaml
---
title: "文章标题"            # 必填
date: "2026-01-01"          # 必填，发布时间
updated: "2026-01-02"       # 可选，最后更新日期
description: "摘要"          # 必填，用于 SEO 和列表摘要
tags: ["标签1", "标签2"]     # 可选，默认空数组
category: "技术"             # 必填，分类
cover: "/images/cover.jpg"  # 可选，封面图
draft: false                # 可选，默认 false
featured: false             # 可选，默认 false，首页「精选」位
series: "系列名"             # 可选，系列文章
seriesOrder: 1              # 可选，系列内顺序，从 1 开始
---
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 显示在标题、列表、RSS、SEO title 里 |
| `date` | 是 | `"2026-01-01"` 这种写法会被自动转成日期 |
| `updated` | 否 | 填了才会在文章页显示「更新于」 |
| `description` | 是 | 会被塞进 `<meta name="description">` 和 OG 标签 |
| `tags` | 否 | 数组，可以有多个 |
| `category` | 是 | **只能填一个**（分类是唯一的，标签才可能多个） |
| `cover` | 否 | 留空则用纯 CSS 渐变生成一张秋色封面 |
| `draft` | 否 | `true` 时全站消失，包括 RSS 和搜索 |
| `featured` | 否 | `true` 时会出现在首页「精选」 |
| `series` / `seriesOrder` | 否 | 用来把多篇串成系列，上下篇会优先在系列内跳 |

写错了会怎样？**构建直接失败**，而不是悄悄生成一个坏页面。比如把 `tags` 写成字符串而不是数组，`npm run build` 会报错并指出是哪一篇的哪个字段。这是故意的设计。

## 正文语法

### 标题与段落

`##` 是二级标题，`###` 是三级标题。右侧目录会自动收集**二级和三级标题**，四级以下不收录（小屏上会挤成一团，收益也低）。

正文里可以用 **粗体**、*斜体*、~~删除线~~，以及 `行内代码`。

### 列表

无序列表：

- 第一项
- 第二项
  - 嵌套一层
  - 再嵌套一层

有序列表：

1. 先做这个
2. 再做那个
3. 最后收尾

任务列表：

- [x] 已经做完的
- [ ] 还没做的

### 引用

> 一句话引用。
>
> 引用里可以换段落，也可以放**粗体**和`行内代码`。

### 代码块

普通代码块，带一键复制按钮：

```ts
export function greet(name: string): string {
  return `你好，${name}`;
}
```

需要行号时，在语言后面加 `showLineNumbers`：

```js showLineNumbers
const posts = await getPublishedPosts();
const featured = getFeaturedPosts(posts, 2);

for (const post of featured) {
  console.log(post.data.title);
}
```

代码块还可以带文件名标题：

```bash title="deploy.sh"
npm run build
npx wrangler pages deploy dist
```

### 表格

| 语法 | 效果 | 什么时候用 |
| --- | --- | --- |
| `**文字**` | **粗体** | 强调结论 |
| `` `code` `` | `code` | 变量名、命令、文件名 |
| `[文字](url)` | 链接 | 外链会自动新窗口打开 |

### 图片

把图片放到 `src/assets/` 下，然后在 frontmatter 的 `cover` 里写文件名，就能用上 Astro 的图片优化（自动生成 WebP/AVIF、多种尺寸、懒加载）。

正文里插图：

```md
![图片说明](../../assets/demo.png)
```

本站刻意没有预置任何真实图片 —— 未经授权的素材不该出现在这里。需要插图时，放自己的图。

### 链接与脚注

外链会自动加上 `target="_blank"` 和 `rel="noopener noreferrer"`，例如 [Astro 官方文档](https://docs.astro.build/)。

脚注也能用[^1]，写起来是这样：

```md
正文里写[^1]，文末写 [^1]: 说明内容。
```

[^1]: 这就是脚注的样子，会统一收在文章末尾。

## 发布流程

1. 在 `src/content/posts/` 里新建一个 `.md` 文件
2. 写好 frontmatter 和正文
3. 本地看效果：`npm run dev`
4. 推送代码，Cloudflare Pages 会自动构建并上线

不需要改任何配置，也不需要手动登记。
