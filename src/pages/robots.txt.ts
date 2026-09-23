import type { APIRoute } from 'astro';

import { absoluteUrl } from '../lib/seo';
import { withBase } from '../lib/url';

/**
 * robots.txt 用端点生成而不是放 public/ 静态文件，
 * 目的是让 sitemap 的绝对地址永远跟着 astro.config.mjs 的 site 走 ——
 * 换域名/换子路径时不会漏改这里。
 *
 * ⚠️ 这里的 /search 与 /pagefind/ 也得走 withBase：部署在子路径下时，
 *    真实的路径是 /RickyBlog/search，写 '/search' 这条 Disallow 完全不生效。
 */
export const GET: APIRoute = ({ site }) => {
  const body = `User-agent: *
Allow: /

# 搜索结果页没有索引价值，避免抓取
Disallow: ${withBase('/search')}

# Pagefind 生成的索引资源不需要被搜索引擎抓取
Disallow: ${withBase('/pagefind/')}

Sitemap: ${absoluteUrl('/sitemap-index.xml', site)}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
