/**
 * 把 astro.config.mjs 的部署目标固定成指定值。
 *
 * 用法：
 *   node scripts/set-deploy-target.mjs pages         # GitHub Pages 项目站点
 *   node scripts/set-deploy-target.mjs cloudflare    # Cloudflare + 自有域名
 *   node scripts/set-deploy-target.mjs pages --check # 只校验不改写，不一致时退出码 1
 *
 * ## 为什么需要它（这一步不能省）
 *
 * `github-pages` 分支的内容是从 `main` 自动同步过来的
 * （见 `.github/workflows/sync-pages.yml`）。两条分支**唯一该有的差异**就是
 * astro.config.mjs 的 `SITE_ORIGIN` / `SITE_BASE` 这两个常量。
 *
 * 但**合并本身保不住这个差异**：当 `github-pages` 正好是 `main` 的祖先时，
 * `git merge` 会直接**快进**，`github-pages` 的内容被整个改写成 `main` 的 ——
 * 包括那两个常量（变成 Cloudflare 的 `SITE_BASE = '/'`）。
 *
 * 后果特别隐蔽：构建**照样成功**，但产物里所有 `_astro/*`、`pagefind/*` 路径
 * 都少掉 `/RickyBlog` 前缀，Pages 站点打开是一片 404 或全无样式。
 * （`scripts/check-subpath.mjs` 也救不了 —— 它的期望前缀正是从这个文件读的，
 * 跟着一起变错，检查反而通过。）
 *
 * 所以在同步流程里，合并之后必须**显式**把目标写回来：用正则做精确替换，
 * 不依赖合并算法、不依赖冲突处理，结果可预测。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'astro.config.mjs');

/** 两个部署目标。base 必须与 `check-subpath.mjs` 读到的写法保持一致。 */
const TARGETS = {
  cloudflare: { origin: 'https://blog.infinitest.cloud', base: '/' },
  pages: { origin: 'https://rickyhe7.github.io', base: '/RickyBlog' },
};

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const name = argv.find((a) => !a.startsWith('-'));

if (!name || !TARGETS[name]) {
  console.error(
    `用法: node scripts/set-deploy-target.mjs <${Object.keys(TARGETS).join('|')}> [--check]`
  );
  process.exit(2);
}
const { origin, base } = TARGETS[name];

const before = readFileSync(configPath, 'utf8');

/**
 * 精确替换 `const KEY = '...';` 里的字面量。
 * @param {string} source
 * @param {string} key
 * @param {string} value
 */
function replaceConst(source, key, value) {
  const re = new RegExp(`(const ${key} = )'[^']*'(;)`);
  if (!re.test(source)) {
    console.error(`没在 astro.config.mjs 里找到 \`const ${key} = '...'\` 这一行`);
    process.exit(1);
  }
  return source.replace(re, `$1'${value}'$2`);
}

const after = replaceConst(replaceConst(before, 'SITE_ORIGIN', origin), 'SITE_BASE', base);

if (after === before) {
  console.log(`部署目标已经是 ${name}（SITE_ORIGIN='${origin}'、SITE_BASE='${base}'），无需改动`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `部署目标不是 ${name} —— 期望 SITE_ORIGIN='${origin}'、SITE_BASE='${base}'` +
      `\n（本条分支若用于 ${name} 部署，产物路径前缀会全错。用不带 --check 的调用修正。）`
  );
  process.exit(1);
}

writeFileSync(configPath, after, 'utf8');
console.log(`已把部署目标设为 ${name}：SITE_ORIGIN='${origin}'、SITE_BASE='${base}'`);
