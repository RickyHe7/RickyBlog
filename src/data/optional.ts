/**
 * 需要真实素材才能填的内容，统一放这里。
 *
 * 现在**全部是空的**，这是刻意的：
 * 项目、友链、装备清单都属于「只有站主本人才知道」的信息，
 * 编造出来会变成假履历，比留空糟糕得多。
 *
 * 想填充时，按下面的类型往里加数据即可，页面会自动渲染 —— 不需要改页面代码。
 */

/** 友链 */
export interface FriendLink {
  name: string;
  href: string;
  description?: string;
  /** 头像图片地址，放 public/ 下，例如 /images/links/xxx.png */
  avatar?: string;
}

/** ⬇️ 把朋友的站点加在这里，例如：
 *  { name: '某某的博客', href: 'https://example.com', description: '一句话介绍' }
 */
export const FRIEND_LINKS: FriendLink[] = [];

/**
 * 项目 / 作品集。
 *
 * 为什么用数据文件而不是 Markdown 内容集合：项目卡片只需要结构化的几个字段
 * （标题、简述、链接、技术栈），不需要长正文；真要写长篇复盘，那本来就该是一篇
 * 分类为「项目复盘」的文章。用数据文件还能避免「集合为空」时构建产生警告。
 *
 * ⚠️ 同样地，不要凭猜测填写 —— 项目名、时间线、技术栈只有本人知道。
 */
export interface Project {
  title: string;
  description: string;
  /** 线上地址 */
  link?: string;
  /** 代码仓库 */
  repo?: string;
  /** 技术栈 */
  tech?: string[];
  /** 时间范围，例如 '2025 – 至今' */
  period?: string;
  /** 状态 */
  status?: '进行中' | '已上线' | '已归档';
  /** 排序，数字小的在前 */
  order?: number;
  /**
   * 标记为示例条目。页面上会明确打出「示例条目，不是真实项目」，
   * 避免临时加的占位内容以后被当成真实履历。
   */
  sample?: boolean;
}

/** ⬇️ 例如：
 *  {
 *    title: 'xxx 工具',
 *    description: '一句话说明它解决什么问题',
 *    repo: 'https://github.com/xxx/yyy',
 *    tech: ['C#', '.NET'],
 *    period: '2025 – 至今',
 *    status: '进行中',
 *    order: 1,
 *  }
 */
export const PROJECTS: Project[] = [];

/** 工具装备 */
export interface UseItem {
  name: string;
  note?: string;
}

export interface UseGroup {
  category: string;
  items: UseItem[];
}

/** ⬇️ 例如 { category: '编辑器', items: [{ name: 'Neovim', note: '主力' }] }
 *  注意：不要凭猜测填写，用自己真正在用的。
 */
export const USES: UseGroup[] = [];

/** 近况 */
export interface NowGroup {
  title: string;
  items: string[];
}

export const NOW: {
  /** 最近一次更新时间，例如 '2026-09' */
  updated?: string;
  intro?: string;
  groups: NowGroup[];
} = {
  groups: [],
};
