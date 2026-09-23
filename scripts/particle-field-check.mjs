/**
 * 粒子层冒烟测试 —— 在没有浏览器的环境里验证 `ParticleField.astro` 的真实行为。
 *
 * 用法（两次命令，零依赖）：
 *   npm run build
 *   node scripts/particle-field-check.mjs
 *
 * 做法：把 `dist/index.html` 里**实际发布的那段内联脚本**抽出来，在 Node 里用桩
 * （window / document / canvas 2d context）跑两百多帧，断言：
 *   - 坐标没有 NaN、颜色有效、每帧绘制次数稳定、雷达循环不会死
 *   - 光标节点：鼠标激活后有连线、都在 CURSOR_DIST 内、会推开粒子、
 *     外圈仍留有连线（推开半径 < 连线半径）、指针离开会收起
 *   - 换主题重取颜色、切后台停 rAF、视口变化时粒子数与 DPR 上限正确
 *
 * 为什么需要它：本机起不了浏览器（沙箱拦进程，连 `msedge --version` 都没输出），
 * 而这个组件几乎全是运行期行为 —— `astro check` 只查类型、`npm run build` 只证明能构建，
 * 两者都证明不了"它真的会动"。另外它几次抓到的是**测试自己的问题**，
 * 也顺带留下了几条经验（见下面带 ⚠️ 的注释）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distIndex = join(here, '..', 'dist', 'index.html');

const html = readFileSync(distIndex, 'utf8');
const block = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .find((s) => s.includes('particle-field'));

if (!block) {
  console.error(`没在 ${distIndex} 里找到粒子脚本 —— 先跑一次 npm run build`);
  process.exit(1);
}

// 产物里 esbuild 压缩后的字符串用的是反引号，别按单引号去搜，会误判成"没打进去"
const extracted = join(here, '.particle-field.extracted.mjs');
writeFileSync(extracted, block);
const EXTRACT = pathToFileURL(extracted).href;

const calls = { arc: 0, stroke: 0, clearRect: 0, fill: 0, setTransform: 0 };
const problems = [];
const strokeColors = new Set();
const dotColors = new Set();
let rafQueue = [];
let frameCount = 0;

/**
 * 光标要放的位置。用来把「光标→粒子」那些线从一堆线里认出来：它们的起点必然正好是这里。
 * ⚠️ 必须跟着实际光标一起更新（用下面的 moveCursorTo）—— 坐标写死的话，
 *    一旦把光标移到别处，桩就认不出那些线，会误报成"一条都没画"（踩过一次）。
 */
const CURSOR = { x: 800, y: 450 };
/** 移动光标：更新桩里的坐标（识别连线要用）再把事件派发下去 */
const moveCursorTo = (x, y) => {
  CURSOR.x = x;
  CURSOR.y = y;
  for (const fn of pointerMoveListeners) fn({ pointerType: 'mouse', clientX: x, clientY: y });
};
let lastMove = null;
let cursorLineDists = [];
/** 每帧所有点的位置（顺序 = 粒子数组顺序），挑一颗粒子做「被推开」的精确测量 */
let arcPositions = [];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

const ctx = {
  lineWidth: 1,
  globalAlpha: 1,
  strokeStyle: '',
  fillStyle: '',
  setTransform(...a) {
    calls.setTransform += 1;
    if (!a.every(num)) problems.push('setTransform 参数非数字');
  },
  clearRect(x, y, w, h) {
    calls.clearRect += 1;
    if (![x, y, w, h].every(num)) problems.push(`clearRect NaN: ${[x, y, w, h]}`);
  },
  beginPath() {},
  moveTo(x, y) {
    if (!num(x) || !num(y)) problems.push(`moveTo NaN: ${x},${y}`);
    lastMove = x === CURSOR.x && y === CURSOR.y ? 'cursor' : null;
  },
  lineTo(x, y) {
    if (!num(x) || !num(y)) problems.push(`lineTo NaN: ${x},${y}`);
    // 起点是光标 → 这条是「光标→粒子」的线，记下它连到多远的粒子
    if (lastMove === 'cursor') cursorLineDists.push(Math.hypot(x - CURSOR.x, y - CURSOR.y));
  },
  stroke() {
    calls.stroke += 1;
    if (typeof ctx.strokeStyle !== 'string' || !ctx.strokeStyle) {
      problems.push(`strokeStyle 无效: ${String(ctx.strokeStyle)}`);
    } else {
      strokeColors.add(ctx.strokeStyle);
    }
    if (!num(ctx.globalAlpha) || ctx.globalAlpha <= 0 || ctx.globalAlpha > 1) {
      problems.push(`线的 globalAlpha 越界: ${ctx.globalAlpha}`);
    }
    if (!num(ctx.lineWidth) || ctx.lineWidth <= 0) problems.push(`lineWidth 越界: ${ctx.lineWidth}`);
  },
  arc(x, y, r, s, e) {
    calls.arc += 1;
    if (![x, y, r, s, e].every(num)) problems.push(`arc 参数 NaN: ${[x, y, r, s, e]}`);
    if (r <= 0) problems.push(`半径非正: ${r}`);
    arcPositions.push({ x, y });
  },
  fill() {
    calls.fill += 1;
    if (typeof ctx.fillStyle !== 'string' || !ctx.fillStyle) {
      problems.push(`fillStyle 无效: ${String(ctx.fillStyle)}`);
    } else {
      dotColors.add(ctx.fillStyle);
    }
  },
};

const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx };
const field = { querySelector: (s) => (s === '.particle-canvas' ? canvas : null) };

const themeListeners = [];
const visListeners = [];
const resizeListeners = [];
const pointerMoveListeners = [];
const pointerOutListeners = [];
const blurListeners = [];
const classList = {
  _dark: false,
  contains(c) {
    return c === 'dark' ? this._dark : false;
  },
};
const documentElement = { classList };

globalThis.document = {
  documentElement,
  hidden: false,
  querySelector: (s) => (s === '.particle-field' ? field : null),
  addEventListener(type, fn) {
    if (type === 'themechange') themeListeners.push(fn);
    else if (type === 'visibilitychange') visListeners.push(fn);
    else if (type === 'pointerout') pointerOutListeners.push(fn);
  },
};

globalThis.getComputedStyle = () => ({
  getPropertyValue: (token) => (classList._dark ? '#dddddd' : '#333333') + ` /* ${token} */`,
});

globalThis.window = {
  innerWidth: 1600,
  innerHeight: 900,
  devicePixelRatio: 2,
  matchMedia: () => ({ matches: false }),
  addEventListener(type, fn) {
    if (type === 'resize') resizeListeners.push(fn);
    else if (type === 'pointermove') pointerMoveListeners.push(fn);
    else if (type === 'blur') blurListeners.push(fn);
  },
  requestAnimationFrame(fn) {
    rafQueue.push(fn);
    return rafQueue.length;
  },
  cancelAnimationFrame() {
    rafQueue = [];
  },
  setTimeout,
  clearTimeout,
};

// 驱动若干帧
const step = (t) => {
  const queue = rafQueue;
  rafQueue = [];
  frameCount += 1;
  for (const fn of queue) fn(t);
};
const runFrames = (n, start, gap = 16.7) => {
  let t = start;
  for (let i = 0; i < n; i += 1) {
    t += gap;
    step(t);
  }
  return t;
};

const report = [];
const check = (label, ok, detail = '') => report.push(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`);

await import(EXTRACT);

report.push('=== 初始化 ===');
check('canvas 按 DPR 放大', canvas.width === 3200 && canvas.height === 1800, `实际 ${canvas.width}x${canvas.height}`);
check('setTransform 调用过一次', calls.setTransform === 1, `实际 ${calls.setTransform}`);
check('已排队首帧', rafQueue.length === 1, `队列 ${rafQueue.length}`);

const arcsAfterOne = calls.arc;
let t = runFrames(1, 1000);
report.push('');
report.push('=== 第 1 帧 ===');
check('clearRect 被调用', calls.clearRect === 1, `实际 ${calls.clearRect}`);
check('画了点', calls.arc > 0, `arc=${calls.arc}`);
const particleCount = calls.arc - arcsAfterOne;
check(
  '粒子数 = round(1600x900 / 6500) = 222',
  particleCount === 222,
  `实际 ${particleCount}`
);
check('画了点之后又排队下一帧', rafQueue.length === 1, `队列 ${rafQueue.length}`);

report.push('');
report.push('=== 连续 120 帧（约 2 秒）===');
const before = { arc: calls.arc, stroke: calls.stroke, clearRect: calls.clearRect };
t = runFrames(120, t);
const frames = 120;
check(
  '每帧 clearRect 一次',
  calls.clearRect - before.clearRect === frames,
  `实际 ${calls.clearRect - before.clearRect}`
);
check(
  '每帧画点数一致（粒子数稳定）',
  calls.arc - before.arc === particleCount * frames,
  `实际 ${(calls.arc - before.arc) / frames} 个/帧`
);
check('有连线被画出', calls.stroke - before.stroke > 0, `共 ${calls.stroke - before.stroke} 条`);
check(
  '每帧连线数在合理范围（= 绘制负载）',
  (calls.stroke - before.stroke) / frames > 100 && (calls.stroke - before.stroke) / frames < 2000,
  `约 ${Math.round((calls.stroke - before.stroke) / frames)} 条/帧`
);
check('循环仍在跑', rafQueue.length === 1);
check('无 NaN / 非法值', problems.length === 0, problems.slice(0, 3).join(' | '));

report.push('');
report.push('=== 颜色解析 ===');
const lightStroke = [...strokeColors].filter((c) => c.startsWith('#333333'));
check(
  '线的三种颜色都来自解析出的令牌',
  lightStroke.length === 3 && strokeColors.size === 3,
  `${strokeColors.size} 种：${[...strokeColors].map((c) => c.split(' ')[0]).join(' ')}`
);
check(
  '点的三种颜色都来自解析出的令牌',
  dotColors.size === 3 && [...dotColors].every((c) => c.startsWith('#333333')),
  `${dotColors.size} 种：${[...dotColors].map((c) => c.split(' ')[0]).join(' ')}`
);

report.push('');
report.push('=== 主题切换 ===');
classList._dark = true;
for (const fn of themeListeners) fn({ detail: { theme: 'dark' } });
const dotsBefore = calls.fill;
t = runFrames(1, t);
check('切换后重新解析了颜色', calls.fill > dotsBefore, `fill ${calls.fill}`);
const darkDots = [...dotColors].some((c) => c.startsWith('#dddddd'));
check('点色换成了暗色主题的值', darkDots, [...dotColors].join(','));

report.push('');
report.push('=== 后台标签页 ===');
document.hidden = true;
for (const fn of visListeners) fn();
check('切到后台后停掉 rAF', rafQueue.length === 0, `队列 ${rafQueue.length}`);
document.hidden = false;
for (const fn of visListeners) fn();
check('切回前台后重新开始', rafQueue.length === 1, `队列 ${rafQueue.length}`);

report.push('');
report.push('=== 光标节点 ===');

// 先量一个「没有光标时的每帧连线数」当基线
let aBase = calls.stroke;
t = runFrames(1, t);
const baseLinks = calls.stroke - aBase;

// 触摸指针不该激活（手指没有 hover）
let aTouch = calls.stroke;
cursorLineDists = [];
for (const fn of pointerMoveListeners) fn({ pointerType: 'touch', clientX: CURSOR.x, clientY: CURSOR.y });
t = runFrames(1, t);
const touchLinks = calls.stroke - aTouch;
check(
  '触摸指针不激活光标节点',
  cursorLineDists.length === 0 && Math.abs(touchLinks - baseLinks) <= 2,
  `光标线 ${cursorLineDists.length} 条，总连线 ${touchLinks} vs 基线 ${baseLinks}`
);

// 鼠标：应激活，并多出「光标→粒子」的线
let aMouse = calls.stroke;
cursorLineDists = [];
moveCursorTo(CURSOR.x, CURSOR.y);
t = runFrames(1, t);
const mouseLinks = calls.stroke - aMouse;
const firstCount = cursorLineDists.length;
check('鼠标激活后出现光标连线', firstCount > 0, `${firstCount} 条（141px 内期望约 10 颗粒子）`);
check('总连线数随之增加', mouseLinks > baseLinks, `${mouseLinks} vs 基线 ${baseLinks}`);
check(
  '光标连线都在 CURSOR_DIST 内',
  cursorLineDists.every((d) => d <= 141.001),
  `最远 ${Math.max(...cursorLineDists).toFixed(1)}px`
);

// 把光标**精确压在某颗粒子上**，直接量这颗粒子的位移 ——
// 比量「附近粒子的平均距离」稳得多（那些粒子可能都在 100px 外，推力本来就小）。
// 注意要挑一颗**离边缘足够远**的：粒子有约 28% 概率落在视口外的 wrap 余量里，
// 那片区域周围本来就没邻居，拿它做样本会连一条线都量不到（我第一次就踩了）。
arcPositions = [];
t = runFrames(1, t);
const pickIndex = arcPositions.findIndex(
  (p) => p.x > 240 && p.x < 1360 && p.y > 240 && p.y < 660
);
const target = arcPositions[pickIndex];
moveCursorTo(target.x, target.y);
t = runFrames(1, t);
t = runFrames(90, t); // 1.5 秒
arcPositions = [];
t = runFrames(1, t);
const moved = Math.hypot(arcPositions[pickIndex].x - target.x, arcPositions[pickIndex].y - target.y);
check(
  '光标压住的那颗粒子被推开',
  moved > 18,
  `1.5 秒径向位移 ${moved.toFixed(1)}px（推力 40px/s 下理论最小约 25px；纯漂移最多 22px）`
);

cursorLineDists = [];
t = runFrames(1, t);
check(
  '外圈仍有线可连（推开半径 72 < 连线半径 141）',
  cursorLineDists.length > 0 && Math.min(...cursorLineDists) > 20 && Math.max(...cursorLineDists) <= 141.001,
  `${cursorLineDists.length} 条，最近 ${Math.min(...cursorLineDists).toFixed(1)}px、最远 ${Math.max(...cursorLineDists).toFixed(1)}px`
);

// 指针离开窗口（relatedTarget 为 null）应收起光标节点
cursorLineDists = [];
for (const fn of pointerOutListeners) fn({ relatedTarget: null });
t = runFrames(1, t);
check('指针离开窗口后收起光标节点', cursorLineDists.length === 0, `还剩 ${cursorLineDists.length} 条`);

report.push('');
report.push('=== 视口放大（1600x900 -> 2400x1200）===');
window.innerWidth = 2400;
window.innerHeight = 1200;
for (const fn of resizeListeners) fn();
// resize 是 180ms 防抖，等它落地
await new Promise((r) => setTimeout(r, 320));
check('canvas 跟着放大', canvas.width === 4800 && canvas.height === 2400, `实际 ${canvas.width}x${canvas.height}`);
// 用「单帧的 arc 增量」量粒子数，跟之前跑了多少帧无关
let beforeArc = calls.arc;
t = runFrames(1, t + 400);
const newCount = calls.arc - beforeArc;
check(
  '粒子数撞上限 260',
  newCount === 260,
  `从 ${particleCount} -> ${newCount}（2400x1200 / 6500 ≈ 443，上限 260）`
);
check('放大后仍无 NaN', problems.length === 0, problems.slice(0, 3).join(' | '));

report.push('');
report.push('=== 缩到手机尺寸 + DPR 3（应被钳到 2）===');
window.innerWidth = 390;
window.innerHeight = 844;
window.devicePixelRatio = 3;
for (const fn of resizeListeners) fn();
await new Promise((r) => setTimeout(r, 320));
check('DPR 被钳到 2', canvas.width === 780, `实际 ${canvas.width}（390 x 3 应为 1170，钳到 780）`);
beforeArc = calls.arc;
t = runFrames(1, t + 700);
const mobileCount = calls.arc - beforeArc;
check(
  '粒子数 = round(390x844 / 6500) = 51',
  mobileCount === 51,
  `实际 ${mobileCount}`
);
check('缩放后仍无 NaN', problems.length === 0, problems.slice(0, 3).join(' | '));

console.log(report.join('\n'));
console.log('');
console.log(`总帧数 ${frameCount}  连线 ${calls.stroke} 条  点 ${calls.arc} 个`);
console.log(problems.length ? `问题 ${problems.length} 条` : '问题 0 条');
