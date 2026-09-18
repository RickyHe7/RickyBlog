import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export interface CountedItem {
  name: string;
  count: number;
}

export interface YearGroup {
  year: number;
  posts: Post[];
}

export interface SeriesGroup {
  name: string;
  posts: Post[];
}

/**
 * ⚠️ 全站唯一的文章出口。
 *
 * 任何页面/组件要文章列表，都必须走这个函数 —— 它统一做了两件事：
 *   1. 过滤掉 draft: true 的草稿；
 *   2. 按日期倒序（新的在前）。
 *
 * 只要大家都从这里取数据，「新增一篇文章自动出现在列表/标签/归档/RSS」
 * 和「draft 全站消失」这两个行为就自然成立，不需要在每个页面各写一遍过滤逻辑。
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 首页「精选」：优先取 featured，不够就用最新的补齐 */
export function getFeaturedPosts(posts: Post[], limit = 3): Post[] {
  const featured = posts.filter((p) => p.data.featured);
  if (featured.length >= limit) return featured.slice(0, limit);
  const rest = posts.filter((p) => !p.data.featured);
  return [...featured, ...rest].slice(0, limit);
}

function countBy(posts: Post[], pick: (post: Post) => string[]): CountedItem[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const key of pick(post)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function getAllTags(posts: Post[]): CountedItem[] {
  return countBy(posts, (post) => post.data.tags);
}

export function getAllCategories(posts: Post[]): CountedItem[] {
  return countBy(posts, (post) => [post.data.category]);
}

export function getPostsByTag(posts: Post[], tag: string): Post[] {
  return posts.filter((post) => post.data.tags.includes(tag));
}

export function getPostsByCategory(posts: Post[], category: string): Post[] {
  return posts.filter((post) => post.data.category === category);
}

/** 按年分组，用于归档页 */
export function groupByYear(posts: Post[]): YearGroup[] {
  const map = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.date.getFullYear();
    const bucket = map.get(year);
    if (bucket) bucket.push(post);
    else map.set(year, [post]);
  }
  return [...map.entries()]
    .map(([year, list]) => ({ year, posts: list }))
    .sort((a, b) => b.year - a.year);
}

/** 全部系列 */
export function getAllSeries(posts: Post[]): SeriesGroup[] {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const series = post.data.series;
    if (!series) continue;
    const bucket = map.get(series);
    if (bucket) bucket.push(post);
    else map.set(series, [post]);
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, posts: sortSeries(list) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

function sortSeries(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const orderA = a.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.data.date.valueOf() - b.data.date.valueOf();
  });
}

/** 某篇文章所在系列的全部文章（含自己） */
export function getSeriesSiblings(posts: Post[], post: Post): Post[] {
  if (!post.data.series) return [];
  return sortSeries(posts.filter((p) => p.data.series === post.data.series));
}

export interface PrevNext {
  prev?: Post;
  next?: Post;
}

/**
 * 上一篇 / 下一篇。
 *
 * 语义按时间轴定义，避免歧义：
 *   上一篇 = 时间上更早的那篇
 *   下一篇 = 时间上更晚的那篇
 *
 * 如果文章属于某个系列，则优先在系列内部前后跳转（按 seriesOrder 排序）。
 */
export function getPrevNext(posts: Post[], post: Post): PrevNext {
  const siblings = getSeriesSiblings(posts, post);
  const list = siblings.length > 1 ? siblings : posts;
  const index = list.findIndex((p) => p.id === post.id);
  if (index === -1) return {};

  const inSeries = siblings.length > 1;
  if (inSeries) {
    // 系列内按 seriesOrder 升序 = 阅读顺序
    return { prev: list[index - 1], next: list[index + 1] };
  }
  // 全站列表是倒序的，所以「更早」在 index+1 方向
  return { prev: list[index + 1], next: list[index - 1] };
}
