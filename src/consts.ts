/**
 * 全站配置的唯一数据源。
 * 改站名、导航、社交链接，只改这个文件。
 *
 * ⚠️ 关于社交链接：以下链接由 Ricky 本人提供，不要自行增补。
 *    没有的账号（例如 X / Twitter）就保持缺失，不要编造。
 */

export const SITE = {
  name: "Ricky's Blog",
  tagline: '艰难依然坚持',
  /** 用于 SEO description 与首页介绍 */
  description:
    '小技巧、读书笔记与生活记录。写下踩过的坑和想明白的事，记录成长。',
  author: '贺瑞奇',
  authorEn: 'Ricky',
  email: 'ricky7.he@qq.com',
  locale: 'zh-CN',
  /** 首页「关于」区块的自我介绍（来自需求文档，简短克制） */
  intro: '社畜。写 .NET 和 C++，做机器上的小工具，喜欢把重复劳动交出去。',
  /** 标题后缀模板 */
  titleSuffix: "Ricky's Blog",
} as const;

export const NAV = [
  { label: '首页', href: '/' },
  { label: '文章', href: '/posts' },
  { label: '分类', href: '/categories' },
  { label: '标签', href: '/tags' },
  { label: '归档', href: '/archives' },
  { label: '关于', href: '/about' },
] as const;

/** 次要入口，收进「更多」菜单与页脚 */
export const NAV_MORE = [
  { label: '项目', href: '/projects' },
  { label: '友链', href: '/links' },
  { label: '工具装备', href: '/uses' },
  { label: '近况', href: '/now' },
  { label: '订阅', href: '/newsletter' },
] as const;

/** 社交链接（均由 Ricky 提供；缺失的项直接不出现） */
export const SOCIALS = [
  {
    label: 'GitHub',
    href: 'https://github.com/RickyHe7',
    icon: 'github',
  },
  {
    label: '哔哩哔哩',
    href: 'https://space.bilibili.com/40134904',
    icon: 'bilibili',
  },
  {
    label: '邮箱',
    href: 'mailto:ricky7.he@qq.com',
    icon: 'mail',
  },
] as const;

/** 每页文章数 */
export const POSTS_PER_PAGE = 8;

/** 页脚声明 */
export const FOOTER_NOTE = '本站内容为个人记录，转载请注明出处。';
