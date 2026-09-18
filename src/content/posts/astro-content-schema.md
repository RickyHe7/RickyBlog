---
title: "内容集合：让 frontmatter 写错就构建失败"
date: "2026-09-18"
description: "用 zod 给 Markdown 的 frontmatter 加一道校验，把「日期写成中文」「tags 忘了用数组」这类错误提前到构建阶段。"
tags: ["Astro", "TypeScript", "工程经验"]
category: "技术"
series: "站点搭建笔记"
seriesOrder: 2
draft: false
---

> **注意：本文是站点初始化时生成的示例文章。**
> 内容是通用技术说明，不涉及任何真实项目信息。排版确认无误后可以删掉。

上一篇说 Pagefind 索引的是构建产物。这一篇换个话题，讲怎么让「写错文章元信息」这件事在本地就暴露出来，而不是等上线后才发现某篇文章的日期显示成了 `NaN`。

## 问题：Markdown 的元信息是没有类型的

frontmatter 本质上是 YAML，而 YAML 不认识「日期」这个类型 —— 它只认识字符串、数字、布尔和列表。所以下面这段是合法 YAML：

```yaml
---
title: 我的文章
date: 2026 年 1 月 1 日
tags: Markdown
---
```

但 `tags` 应该是数组，`date` 应该能被解析成日期。没有校验时，构建会成功，问题被推迟到运行时：列表页排序乱掉、标签页凭空多出一个「Markdown」，或者日期直接渲染成 `Invalid Date`。

## 解法：给集合声明 schema

Astro 的内容集合允许给每类内容声明一个 schema。声明之后，不符合的条目会在构建时直接报错：

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    category: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
```

几个值得注意的点：

### `z.coerce.date()` 而不是 `z.date()`

YAML 解析出来的是字符串，`z.date()` 会直接拒绝。`z.coerce.date()` 会先尝试转换再校验，于是 `"2026-01-01"` 能正常通过，而 `"2026 年 1 月 1 日"` 会失败。

### `.default()` 把「可选」和「默认值」分开

`tags: z.array(z.string()).default([])` 的意思是：可以不写，不写就当空数组。这比 `z.array(z.string()).optional()` 好用 —— 后者会让下游每处都要判断 `undefined`。

### 报错信息足够定位问题

校验失败时构建会中止，并指出是哪个文件、哪个字段、期望什么类型。这比上线后逐个页面肉眼排查快得多。

## 把校验用起来：所有查询走同一个出口

声明了 schema 只是第一步。真正让「新增文章自动出现在各处」成立的关键，是全站只有一个地方负责读文章列表：

```ts
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
```

首页、列表页、标签页、归档页、RSS、sitemap 全部调用它。好处有两个：

一来过滤草稿的逻辑只有一份。想改规则（比如加一个「定时发布」），改这一处就够，不会出现「列表里没了但 RSS 里还在」这种漏洞。

二来排序规则也只有一份。日期字段一旦校验通过，排序就不会因为某篇文章格式不对而错位。

## 一个反直觉的副作用

草稿文章的页面**根本不会被生成**。因为动态路由的路径也是从这个函数来的：

```ts
export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}
```

`draft: true` 的文章既不在列表里，也没有自己的页面，还不在 sitemap 和搜索索引里 —— 一次性全排除，不需要在五个地方各写一遍判断。
