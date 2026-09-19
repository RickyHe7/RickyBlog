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
 * ⭐ 站点地址 —— **全站唯一的域名来源。换域名只改这一行。**
 *
 * 这里刻意**不接受环境变量覆盖**，这是踩坑之后改的：
 *
 *   原设计是「环境变量 SITE_URL > .env > 这里」。2026-09-19 换域名时踩了 ——
 *   Cloudflare 里遗留的 `SITE_URL` 还是旧域名，它把代码里改好的新域名**整个盖掉**，
 *   线上 canonical / sitemap 一直指着那个大陆打不开的 workers.dev 地址；
 *   而**本地构建完全正常**（本地没有那个变量），于是很难往「远端变量」上想，白查了很久。
 *
 * 教训：个人博客只有一个正式域名，让「看不见的远端变量」能覆盖「看得见的代码」，
 * 收益极小（本来也没有多环境需求），风险很大（静默指错域名，而且现象只在线上出现）。
 * 所以现在 `CANONICAL_SITE` 是**唯一权威**，`SITE_URL` 一律忽略（并会告警提醒去删掉它）。
 *
 * 真需要临时用别的域名构建，设 `FORCE_SITE_URL` —— 刻意换了个不常见的新名字，
 * 避免任何历史遗留的 `SITE_URL` 又悄悄生效。
 *
 * 代码里**没有第二处**写死地址：src/lib/seo.ts 的 absoluteUrl / requireSite
 * 拿不到 `Astro.site` 时会直接抛错，不会退回某个兜底域名。
 */
const CANONICAL_SITE = 'https://blog.infinitest.cloud';

/**
 * 备用地址：`https://rickysblog.1174716217.workers.dev` 依然可以访问（Worker 的默认域名），
 * 但**中国大陆直连打不开**（DNS 污染），所以它只作备用，不写进 canonical / sitemap。
 */

/** 显式覆盖开关。优先级高于 CANONICAL_SITE，但必须主动设这个名字才会生效。 */
const FORCE_SITE_URL = (process.env.FORCE_SITE_URL || '').trim();

/** 规范化：去掉末尾斜杠，避免生成 `https://a.com//posts` 这种地址
 * @param {string} u
 */
const normalizeSite = (u) => String(u).trim().replace(/\/+$/, '');

const SITE_URL = normalizeSite(FORCE_SITE_URL || CANONICAL_SITE);

/**
 * 告警：检测到遗留的 `SITE_URL`。
 *
 * 它**已经不再参与计算**，但必须喊出来 —— 否则你会以为它还有效，
 * 去改它、发现改了没反应，又浪费一轮排查（这正是这次踩坑的经过）。
 */
const legacySiteUrl = (process.env.SITE_URL || '').trim();
if (legacySiteUrl && normalizeSite(legacySiteUrl) !== SITE_URL) {
  console.warn(
    '\n[site] ⚠️  检测到环境变量 SITE_URL = ' +
      legacySiteUrl +
      '\n[site]    它已不再生效 —— 现在只有 astro.config.mjs 的 CANONICAL_SITE 说了算。' +
      '\n[site]    本次构建实际使用：' +
      SITE_URL +
      '\n[site]    建议去 Cloudflare 把这个变量删掉，免得以后又误以为改它有用。\n'
  );
}

/**
 * 兜底检查：抓到「地址不是自己的」这一类问题。
 *
 * 这条检查是踩坑之后加的：早期版本拿 `https://rickyblog.pages.dev` 当默认值，
 * 后来发现**那个域名属于别人的博客**（robots.txt 指向 rickyacc.me）。
 * 一旦构建时用的是那个值，sitemap / canonical / OG / RSS 就会静悄悄指向一个陌生人的站点 ——
 * 比直接坏掉危险得多，因为你看不出来。
 *
 * 所以这里对两种「明显不对」的值告警：保留域名，以及那个已知被占用的域名。
 *
 * 正常情况下 SITE_URL 只可能来自 CANONICAL_SITE（或显式的 FORCE_SITE_URL），
 * 所以一旦命中，说明 CANONICAL_SITE 本身被改坏了。
 */
if (/example\.com|rickyblog\.pages\.dev/.test(SITE_URL)) {
  console.warn(
    '\n[site] ⚠️  当前站点地址是 ' +
      SITE_URL +
      '\n[site]    这不是你的真实站点地址，sitemap / canonical / OG / RSS 会指向它。' +
      '\n[site]    请检查 astro.config.mjs 里的 CANONICAL_SITE（它是唯一来源）。\n'
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
