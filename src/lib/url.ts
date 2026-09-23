/**
 * 子路径部署用的路径前缀。
 *
 * GitHub Pages 的**项目站点**会把站点放在 `https://<用户名>.github.io/<仓库名>/` 这个子路径下，
 * 于是所有"从站点根开始"的路径（`/posts`、`/favicon.svg`、`/pagefind/...`）都得带上这段前缀，
 * 否则一律 404 —— 而 `_astro/` 那些构建产物 URL 由 Astro 按 `base` 自动加上，只有我们自己写的
 * 链接需要经这里处理。
 *
 * `import.meta.env.BASE_URL` 由 `astro.config.mjs` 的 `base` 决定，**一定带结尾斜杠**：
 *   base 未设          → '/'
 *   base = '/RickyBlog' → '/RickyBlog/'
 * 所以下面把结尾斜杠去掉再拼，`withBase('/')` 得到 '/RickyBlog/'、`withBase('/posts')` 得到 '/RickyBlog/posts'。
 *
 * 这样写的好处：**站内链接一律照常写成站点根路径**，同一份代码既能部署在根域名下
 * （此时 withBase 是恒等函数），也能部署在子路径下 —— 换托管只改 astro.config.mjs 一处。
 */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string): string {
  // 外部链接、mailto、纯锚点不属于站点路径，原样返回
  if (!path.startsWith('/')) return path;
  // 协议相对地址（//host/path）也不是站点路径
  if (path.startsWith('//')) return path;
  return `${BASE}${path}`;
}
