import { SITE, SOCIALS } from '../consts';
import type { Post } from './posts';

const FALLBACK_ORIGIN = 'https://rickyblog.pages.dev/';

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
