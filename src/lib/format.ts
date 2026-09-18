import readingTime from 'reading-time';

/** 2026-01-01 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 2026 年 1 月 1 日 */
export function formatDateLong(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/** 用于 <time datetime> 与 sitemap / RSS 的标准格式 */
export function toISODate(date: Date): string {
  return date.toISOString();
}

/**
 * 阅读时长。
 *
 * 说明：reading-time 按「词」计数，中文会被逐字计算，因此中文场景下要调高
 * wordsPerMinute，否则时长会离谱地长。中文阅读速度约 300–500 字/分钟，
 * 这里取 350 作为中英混排的折中值。
 */
export function getReadingTime(body: string | undefined): {
  minutes: number;
  label: string;
} {
  const minutes = Math.max(1, Math.ceil(readingTime(body ?? '', { wordsPerMinute: 350 }).minutes));
  return { minutes, label: `${minutes} 分钟` };
}

/** 把数组切成每页 size 条的二维数组（用于分页） */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
