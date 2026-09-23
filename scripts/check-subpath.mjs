/**
 * 子路径部署体检 —— 确认产物里没有"漏掉前缀的根路径"。
 *
 * 用法（零依赖）：
 *   npm run build
 *   node scripts/check-subpath.mjs
 *
 * 为什么需要它：站点部署在子路径下（GitHub Pages 项目站点 → `/RickyBlog/`）时，
 * 任何以 `/` 开头的路径少了前缀都会 404，而且**往往只坏一两个入口**，很难一眼看出来。
 * 所以这里用穷举代替"我觉得应该都改到了"：把 dist 里每个 HTML 的 href/src 全扫一遍。
 * CI 里也接了这一步（见 .github/workflows/deploy-pages.yml），漏了就构建失败。
 *
 * 前缀不写死在这里，而是从 astro.config.mjs 的 SITE_BASE 读 —— 免得两处漂移。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

// --- 从配置里读期望前缀 ---
const config = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
const m = config.match(/const SITE_BASE = '([^']*)'/);
if (!m) {
  console.error("没在 astro.config.mjs 里找到 `const SITE_BASE = '...'` 这一行");
  process.exit(1);
}
const PREFIX = m[1].replace(/\/+$/, ''); // '/' -> ''

// --- 收集 dist 下所有 HTML ---
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const ATTR = /\b(href|src)="([^"]*)"/g;
const bad = new Map(); // 值 -> 出现的文件集合
const seen = new Map(); // 值 -> 次数
let total = 0;

for (const file of htmlFiles) {
  const text = readFileSync(file, 'utf8');
  for (const [, attr, value] of text.matchAll(ATTR)) {
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    total += 1;
    seen.set(value, (seen.get(value) ?? 0) + 1);
    if (PREFIX && !value.startsWith(PREFIX)) {
      if (!bad.has(value)) bad.set(value, new Set());
      bad.get(value).add(relative(dist, file));
    }
  }
}

console.log(`扫描 ${htmlFiles.length} 个 HTML，${total} 个根路径。期望前缀：${PREFIX || '（根部署，无需前缀）'}`);

// --- 顺带确认 withBase 在客户端包里也拿到了正确的前缀 ---
// withBase 会被打包成独立 chunk，BASE_URL 在构建期替换进去；它错了运行期拼的路径就全错。
const astroDir = join(dist, '_astro');
let urlChunkOk = null;
try {
  for (const name of readdirSync(astroDir)) {
    if (!/^url\..*\.js$/.test(name)) continue;
    const body = readFileSync(join(astroDir, name), 'utf8');
    urlChunkOk = PREFIX ? body.includes(PREFIX) : true;
    console.log(`withBase 客户端 chunk：${name}  → ${urlChunkOk ? '前缀正确 ✅' : '❌ 没看到前缀'}`);
  }
} catch {
  /* 没有 _astro 目录就算了 */
}

let failed = false;

if (bad.size) {
  failed = true;
  console.error(`\n❌ 有 ${bad.size} 种根路径漏掉了前缀（共 ${[...bad.values()].reduce((n, s) => n + s.size, 0)} 处引用）：`);
  for (const [value, files] of [...bad.entries()].slice(0, 20)) {
    console.error(`   ${value}`);
    console.error(`      出现在：${[...files].slice(0, 3).join('、')}`);
  }
  console.error('\n   排查方向：组件里手写的链接要用 withBase()；前件里赋给变量的路径正则扫不到；');
  console.error('   Markdown 正文里的链接由 astro.config.mjs 的 linkAndImageAttrs 插件负责。');
} else {
  console.log('✅ 没有漏掉前缀的根路径');
}

if (urlChunkOk === false) {
  failed = true;
  console.error('❌ withBase 的客户端 chunk 里没有期望前缀 —— 检查 astro.config.mjs 的 base / SITE_BASE');
}

// sitemap 与 pagefind 是构建收尾阶段生成的，缺失时只告警（本地某些环境会拦掉这一步）
for (const [label, rel] of [
  ['sitemap-index.xml', 'sitemap-index.xml'],
  ['pagefind/', 'pagefind'],
]) {
  const exists = (() => {
    try {
      statSync(join(dist, rel));
      return true;
    } catch {
      return false;
    }
  })();
  console.log(`${exists ? '✅' : '⚠️ '} ${label} ${exists ? '已生成' : '缺失（构建收尾没跑完？）'}`);
}

process.exit(failed ? 1 : 0);
