// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import pagefind from 'astro-pagefind';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import tailwindcss from '@tailwindcss/vite';

/**
 * 站点地址 —— 全站唯一的绝对 URL 来源。
 * sitemap / canonical / OG / RSS 全部由它推导，换域名只改这一行（或设置环境变量 SITE_URL）。
 */
const SITE = process.env.SITE_URL ?? 'https://rickyblog.pages.dev';

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
  site: SITE,
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
