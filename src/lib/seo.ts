import { SITE, SOCIALS } from '../consts';
import type { Post } from './posts';

/**
 * 取站点 origin，**拿不到就直接报错**。
 *
 * 为什么这里刻意不给兜底域名：
 *   早期版本给了一个兜底 origin，后果是「域名写错时不报错、静默把 canonical 指向错域名」。
 *   这一点踩过两次 ——
 *     1. 曾拿 `rickyblog.pages.dev` 当兜底，后来发现那个域名其实属于别人的博客；
 *     2. `.env` 没被读到（Astro 不注入配置期的 process.env）而回退到占位值。
 *   **静默指错比构建失败危险得多**，所以改成硬失败。
 *
 * 现在 `Astro.site` 只可能来自 astro.config.mjs 的 `site` 字段，
 * 而那个字段就是全站**唯一**的域名来源 —— 拿不到值说明配置被改坏了，应当立刻发现。
 */
export function requireSite(site: URL | undefined): URL {
  if (!site) {
    throw new Error(
      '[seo] Astro.site 为空。请检查 astro.config.mjs 的 `site` 字段 —— ' +
        '它是全站唯一的域名来源，sitemap / canonical / OG / RSS 全部由它推导。'
    );
  }
  return site;
}

/** 把站内路径拼成绝对 URL。sitemap / canonical / OG / RSS 全走这里，保证一致。 */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(path, requireSite(site)).href;
}

export type JsonLd = Record<string, unknown>;

export function websiteJsonLd(site: URL | undefined): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    alternateName: SITE.tagline,
    description: SITE.description,
    url: absoluteUrl('/', site),
    inLanguage: SITE.locale,
    author: { '@type': 'Person', name: SITE.author },
  };
}

export function personJsonLd(site: URL | undefined): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.author,
    alternateName: SITE.authorEn,
    description: SITE.intro,
    url: absoluteUrl('/about', site),
    email: `mailto:${SITE.email}`,
    sameAs: SOCIALS.filter((s) => s.href.startsWith('http')).map((s) => s.href),
  };
}

export function blogPostingJsonLd(
  post: Post,
  site: URL | undefined,
  options: { url: string; image: string; wordCount?: number }
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.description,
    url: options.url,
    image: options.image,
    datePublished: post.data.date.toISOString(),
    dateModified: (post.data.updated ?? post.data.date).toISOString(),
    inLanguage: SITE.locale,
    keywords: post.data.tags.join(', '),
    articleSection: post.data.category,
    author: {
      '@type': 'Person',
      name: SITE.author,
      url: absoluteUrl('/about', site),
    },
    publisher: {
      '@type': 'Person',
      name: SITE.author,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': options.url,
    },
    ...(options.wordCount ? { wordCount: options.wordCount } : {}),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
