import type { APIRoute } from 'astro';

import { requireSite } from '../lib/seo';

/**
 * robots.txt 用端点生成而不是放 public/ 静态文件，
 * 目的是让 sitemap 的绝对地址永远跟着 astro.config.mjs 的 site 走 ——
 * 换域名时不会漏改这里。
 */
export const GET: APIRoute = ({ site }) => {
  const base = requireSite(site).href.replace(/\/$/, '');

  const body = `User-agent: *
Allow: /

# 搜索结果页没有索引价值，避免抓取
Disallow: /search

# Pagefind 生成的索引资源不需要被搜索引擎抓取
Disallow: /pagefind/

Sitemap: ${base}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
