import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { SITE } from '../consts';
import { requireSite } from '../lib/seo';
import { getPublishedPosts } from '../lib/posts';
import { withBase } from '../lib/url';

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
    site: requireSite(context.site),
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
      // 也要带部署子路径，否则 @astrojs/rss 会把它解析到站点根（少了 /RickyBlog）
      link: withBase(`/posts/${post.id}/`),
      categories: [post.data.category, ...post.data.tags],
      author: SITE.email,
      customData: post.data.updated
        ? `<updated>${post.data.updated.toISOString()}</updated>`
        : undefined,
    })),
  });
};
