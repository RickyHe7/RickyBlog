import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { SITE } from '../consts';
import { FALLBACK_ORIGIN } from '../lib/seo';
import { getPublishedPosts } from '../lib/posts';

/**
 * RSS 订阅源。
 *
 * 和别处一样只取 getPublishedPosts()，所以 draft 文章不会漏进订阅源。
 * 说明：这里用 frontmatter 的 description 作为条目摘要，不内联全文 ——
 * 全文需要把渲染后的 HTML 抽成字符串，代价大于收益，且很多阅读器会自己抓取原页。
 */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  return rss({
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? FALLBACK_ORIGIN,
    trailingSlash: false,
    customData: [
      `<language>zh-cn</language>`,
      `<managingEditor>${SITE.email} (${SITE.author})</managingEditor>`,
      `<webMaster>${SITE.email} (${SITE.author})</webMaster>`,
      `<copyright>© ${new Date().getFullYear()} ${SITE.author}</copyright>`,
    ].join(''),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
      author: SITE.email,
      customData: post.data.updated
        ? `<updated>${post.data.updated.toISOString()}</updated>`
        : undefined,
    })),
  });
};
