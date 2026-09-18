import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// z 从 astro/zod 导入：astro:content 里再导出的那个 z 已被标记 deprecated
import { z } from 'astro/zod';

/**
 * 文章集合。
 *
 * 这里定义的 schema 会在构建期校验每篇 Markdown 的 frontmatter：
 * 字段缺失或类型写错 —— 例如 date 写成 "2026/01/01" 之外的非法值、tags 忘了用数组 ——
 * 构建会直接失败，而不是静默生成一个坏页面。
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    /** 标题 */
    title: z.string(),
    /** 首次发布日期（"2026-01-01" 字符串会被自动转成 Date） */
    date: z.coerce.date(),
    /** 最后更新日期，可选 */
    updated: z.coerce.date().optional(),
    /** 摘要：用于 SEO description 与列表展示，必填（逼着你写） */
    description: z.string(),
    /** 标签 */
    tags: z.array(z.string()).default([]),
    /** 分类：技术 / 项目复盘 / 读书笔记 / 生活 */
    category: z.string(),
    /**
     * 封面图路径，可选。
     * 指到 src/assets 里的图片可以走 Astro 的图片优化；留空则用纯 CSS 渐变封面。
     */
    cover: z.string().optional(),
    /** 草稿：true 时从列表、标签、归档、RSS、sitemap、搜索里全部消失 */
    draft: z.boolean().default(false),
    /** 精选：会出现在首页「精选」区块 */
    featured: z.boolean().default(false),
    /** 系列名，可选 */
    series: z.string().optional(),
    /** 在系列内的顺序，从 1 开始 */
    seriesOrder: z.number().optional(),
  }),
});

/** 单页内容（例如「关于我」），方便不改代码就能改文案 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, pages };
