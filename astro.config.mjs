// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import pagefind from 'astro-pagefind';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import tailwindcss from '@tailwindcss/vite';

/**
 * 站点地址 —— 全站唯一的绝对 URL 来源。
 * sitemap / canonical / OG / RSS 全部由它推导。
 *
 * ⚠️ 为什么要显式 loadEnv：
 * Astro 不会把 .env 注入到「配置文件求值时」的 process.env 里（它只在渲染组件时提供
 * import.meta.env）。所以只读 process.env.SITE_URL 的话，本地 .env 会被完全忽略 ——
 * 实测过：.env 里写了 SITE_URL，构建出来的 canonical 仍然是占位域名。
 *
 * 因此两条路都要走：
 *   1. process.env.SITE_URL —— Cloudflare Pages 的环境变量是真实进程环境变量，走这条
 *   2. loadEnv(...).SITE_URL —— 本地 .env / .env.local，走这条
 *
 * 这是 Astro 官方文档推荐的用法（import { loadEnv } from 'vite'）。
 */
const fileEnv = loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', process.cwd(), '');

/**
 * 真实站点地址，写死作为最终兜底。
 *
 * 为什么写死：环境变量这条链有三个环节都可能失效 ——
 *   Cloudflare 上的变量没设、变量值写错、或者 Workers Builds 没有把变量暴露给构建进程。
 * 而 sitemap / canonical / OG / RSS 一旦指向错域名，搜索引擎就会收录错的东西。
 * 个人博客只有一个正式域名，写死在这里是收益最大、风险最低的做法。
 *
 * 换域名时改这一行（同时改 wrangler.jsonc 里的 name，如果 Worker 名也变了）。
 * 优先级仍是：环境变量 > .env > 这里，方便临时用别的值构建。
 */
const CANONICAL_SITE = 'https://rickysblog.1174716217.workers.dev';

const SITE_URL = (process.env.SITE_URL || fileEnv.SITE_URL || CANONICAL_SITE).trim();

/**
 * 兜底检查：抓到「地址不是自己的」这一类问题。
 *
 * 这条检查是踩坑之后加的：早期版本拿 `https://rickyblog.pages.dev` 当默认值，
 * 后来发现**那个域名属于别人的博客**（robots.txt 指向 rickyacc.me）。
 * 一旦构建时用的是那个值，sitemap / canonical / OG / RSS 就会静悄悄指向一个陌生人的站点 ——
 * 比直接坏掉危险得多，因为你看不出来。
 *
 * 所以这里对两种「明显不对」的值告警：保留域名，以及那个已知被占用的域名。
 */
if (/example\.com|rickyblog\.pages\.dev/.test(SITE_URL)) {
  console.warn(
    '\n[site] ⚠️  当前站点地址是 ' +
      SITE_URL +
      '\n[site]    这不是你的真实站点地址，sitemap / canonical / OG / RSS 会指向它。\n' +
      '[site]    请检查 Cloudflare 的环境变量、本地 .env，以及 astro.config.mjs 里的 CANONICAL_SITE。\n'
  );
}

if (process.env.DEBUG_SITE_URL) {
  console.log('[site] 最终使用的站点地址: ' + SITE_URL);
}

/**
 * 外链自动新窗口打开。
 *
 * 注意这里是 Sätteri 的 HAST 插件，不是 rehype 插件 ——
 * Astro 7 起默认的 Markdown 处理器换成了 Rust 写的 Sätteri，
 * 旧的 remark/rehype 链路需要额外安装 @astrojs/markdown-remark 才能用。
 * 为了一个属性把整条 unified 链路拉回来不划算，所以直接写原生插件。
 *
 * 插件签名：{ name, element: { filter: 标签名数组, visit(node, ctx) } }
 * Rust 侧先按标签名过滤，只有匹配的节点才会跨到 JS 侧，所以这个插件几乎不花时间。
 *
 * @type {import('satteri').HastPluginDefinition}
 */
const externalLinks = {
  name: 'external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.['href'];
      if (typeof href !== 'string') return;
      // 只处理站外 http(s) 链接；站内相对路径、锚点、mailto 都不动
      if (!/^https?:\/\//i.test(href)) return;
      ctx.setProperty(node, 'target', '_blank');
      ctx.setProperty(node, 'rel', ['noopener', 'noreferrer', 'external']);
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',

  // 悬停时预取目标页面，几乎零成本地让站内跳转「秒开」
  prefetch: true,

  integrations: [
    // 代码块：复制按钮 + 可选行号 + 与暗色模式联动的双主题
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      // 用 class 策略而不是媒体查询，这样能跟站点的主题切换按钮联动
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => (theme.type === 'dark' ? '.dark' : ':root'),
      plugins: [pluginLineNumbers()],
      defaultProps: {
        showLineNumbers: false,
        wrap: false,
      },
      styleOverrides: {
        borderRadius: '0.75rem',
        codeFontSize: '0.875rem',
      },
    }),
    mdx(),
    sitemap(),
    // 构建完成后自动执行 Pagefind 索引，无需手写 postbuild 脚本
    pagefind(),
  ],

  markdown: {
    processor: satteri({
      hastPlugins: [externalLinks],
      // features 保持默认：GFM（表格 / 脚注 / 任务列表 / 删除线）、
      // 标题 ID、智能标点都是开箱即用的，不需要额外插件。
    }),
  },

  vite: {
    // Tailwind v4 的官方接入方式（@astrojs/tailwind 在 v4 已不适用）
    plugins: [tailwindcss()],
  },
});
