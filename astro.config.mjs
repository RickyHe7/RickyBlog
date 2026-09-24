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
 * ⭐⭐ **部署目标 —— 换托管只改这两个常量。**
 *
 *   SITE_ORIGIN  站点源（协议 + 主机）
 *   SITE_BASE    站点所在子路径。**GitHub Pages 的"项目站点"必须填 `/<仓库名>`**
 *                （地址形如 https://rickyhe7.github.io/RickyBlog/ → 填 '/RickyBlog'）；
 *                部署在根域名下就填 '/'。
 *
 * ⚠️⚠️ **这两个常量是 `main` 与 `github-pages` 两条分支之间唯一的差异。**
 *    `main`          = Cloudflare + 自有域名（base 为 '/'）
 *    `github-pages`  = GitHub Pages 项目站点（base 为 '/RickyBlog'）
 *
 *    刻意维持「只差这两行」的形态：`main` 的改动会自动合并进 `github-pages`
 *    （见 `.github/workflows/sync-pages.yml`），差异越小越不会冲突。
 *    **不要**为了某一条分支的方便去改这个文件的其他部分 —— 那会给每次同步埋冲突。
 *    真到了要改结构的时候，两条分支都得改同一份、同样的内容。
 *
 * 为什么 base 必须交给 Astro 而不是自己到处拼字符串：Astro 用它给 `_astro/*`、
 * `pagefind/*` 那些**构建产物** URL 加前缀；而我们自己写的站内链接统一走
 * `src/lib/url.ts` 的 `withBase()`（它读的也是这个 base）。两边一致，
 * 于是同一份代码既能放根域名、也能放子路径 —— 换托管真的只改这里。
 */
const SITE_ORIGIN = 'https://blog.infinitest.cloud';
const SITE_BASE = '/';

/**
 * 去掉结尾斜杠后的子路径；部署在根路径时是空串（`'/'.replace(/\/+$/,'') === ''`）。
 *
 * ⚠️ 这里刻意用 replace 而不是 `SITE_BASE === '/' ? '' : SITE_BASE`：
 *    后者会被 TS 收窄成字面量类型而报 **ts(2367)「类型无交集」**
 *    （`const SITE_BASE = '/RickyBlog'` 之后拿它跟 `'/'` 比较）。
 *    这个坑本项目已经踩过两次（另一次在 CursorBurst 的 glyph 常量），
 *    记在 .workbuddy/memory/MEMORY.md 里，别再写回比较形式。
 */
const SUBPATH = SITE_BASE.replace(/\/+$/, '');

/**
 * 站点地址 —— 全站唯一的绝对 URL 来源（canonical / sitemap / OG / RSS 都从它推导）。
 *
 * 这里刻意**不接受环境变量覆盖**，是踩坑之后改的： *
 *   原设计是「环境变量 SITE_URL > .env > 这里」。2026-09-19 换域名时踩了 ——
 *   Cloudflare 里遗留的 `SITE_URL` 还是旧域名，把代码里改好的新域名**整个盖掉**，
 *   线上 canonical / sitemap 一直指着那个大陆打不开的 workers.dev 地址；
 *   而**本地构建完全正常**（本地没那个变量），于是很难往「远端变量」上想，白查很久。
 *
 * 教训：个人博客只有一个正式地址，让「看不见的远端变量」能覆盖「看得见的代码」，
 * 收益极小（本来也没有多环境需求）、风险很大（静默指错，而且现象只在线上出现）。
 * 所以 `CANONICAL_SITE` 是**唯一权威**，`SITE_URL` 一律忽略（并会告警提醒去删掉它）。
 *
 * 真需要临时换地址构建，设 `FORCE_SITE_URL` —— 刻意换了个不常见的新名字，
 * 避免任何历史遗留的 `SITE_URL` 又悄悄生效。
 *
 * 代码里**没有第二处**写死地址：src/lib/seo.ts 的 absoluteUrl / requireSite
 * 拿不到 `Astro.site` 时会直接抛错，不会退回某个兜底域名。
 */
const CANONICAL_SITE = SITE_ORIGIN + SUBPATH;

/**
 * 备用地址（只作参考，**不写进 canonical**）：
 *   - `https://rickysblog.1174716217.workers.dev` —— Cloudflare Worker 默认域名，
 *     **中国大陆直连打不开**（DNS 污染）。
 *   - `https://rickyhe7.github.io/RickyBlog/` —— GitHub Pages 项目站点（`github-pages` 分支）。
 *   上面的 SITE_ORIGIN / SITE_BASE 决定本次构建实际用哪一个。
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
 * Markdown 正文里的链接与图片：
 *   1. 站外 http(s) 链接 → 自动新窗口打开（target=_blank + rel）
 *   2. 站内根路径（'/tags/foo'、'/images/a.jpg'）→ 补上部署子路径
 *
 * 注意这里是 Sätteri 的 HAST 插件，不是 rehype 插件 ——
 * Astro 7 起默认的 Markdown 处理器换成了 Rust 写的 Sätteri，
 * 旧的 remark/rehype 链路需要额外安装 @astrojs/markdown-remark 才能用。
 * 为了一个属性把整条 unified 链路拉回来不划算，所以直接写原生插件。
 *
 * 为什么"补子路径"这件事必须在 Markdown 管线里也做一遍：
 *   组件里的链接走 `src/lib/url.ts` 的 `withBase()`，但**正文里手写的** `[x](/tags/foo)`
 *   绕过了组件 —— 部署到 GitHub Pages 的子路径下时它会 404（这是很容易漏的一处）。
 *   在这里统一处理，写正文的人就不必关心部署在根域名还是子路径。
 *
 * 插件签名：{ name, element: { filter: 标签名数组, visit(node, ctx) } }
 * Rust 侧先按标签名过滤，只有匹配的节点才会跨到 JS 侧，所以这个插件几乎不花时间。
 *
 * @type {import('satteri').HastPluginDefinition}
 */
const linkAndImageAttrs = {
  name: 'link-and-image-attrs',
  element: {
    filter: ['a', 'img'],
    visit(node, ctx) {
      // <img> 用 src、<a> 用 href，统一成"属性名 + 值"
      const attr = node.tagName === 'img' ? 'src' : 'href';
      const value = node.properties?.[attr];
      if (typeof value !== 'string') return;

      if (node.tagName === 'img') {
        // 图片只做子路径补全
        if (SUBPATH && value.startsWith('/') && !value.startsWith('//')) {
          ctx.setProperty(node, attr, `${SUBPATH}${value}`);
        }
        return;
      }

      // 站外链接：新窗口打开
      if (/^https?:\/\//i.test(value)) {
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', ['noopener', 'noreferrer', 'external']);
        return;
      }

      // 站内根路径：补子路径（锚点 '#x'、mailto、相对路径都不动）
      if (SUBPATH && value.startsWith('/') && !value.startsWith('//')) {
        ctx.setProperty(node, attr, `${SUBPATH}${value}`);
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // 子路径部署的关键：Astro 用它给 _astro/* 等产物 URL 加前缀。
  // 根域名部署时它就是 '/'，等价于不设。
  base: SITE_BASE,
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
      hastPlugins: [linkAndImageAttrs],
      // features 保持默认：GFM（表格 / 脚注 / 任务列表 / 删除线）、
      // 标题 ID、智能标点都是开箱即用的，不需要额外插件。
    }),
  },

  vite: {
    // Tailwind v4 的官方接入方式（@astrojs/tailwind 在 v4 已不适用）
    plugins: [tailwindcss()],
  },
});
