import { SITE, SOCIALS } from '../consts';
import type { Post } from './posts';

/**
 * 兜底 origin。
 *
 * ⚠️ 必须与 astro.config.mjs 里的 PLACEHOLDER_SITE 保持一致，且**不能**改成任何真实的
 * `*.pages.dev` 地址 —— `rickyblog.pages.dev` 实际属于别人的博客，
 * 拿它当兜底会让 canonical / sitemap 悄悄指向陌生人的站点。
 * 用 IANA 保留域名，坏掉时是显性的。
 *
 * 正常情况下 Astro.site 一定有值（astro.config.mjs 里设了 site），这里只是防御性兜底。
 */
export const FALLBACK_ORIGIN = 'https://rickyblog.example.com/';

/** 把站内路径拼成绝对 URL。sitemap / canonical / OG / RSS 全走这里，保证一致。 */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(path, site ?? FALLBACK_ORIGIN).href;
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
