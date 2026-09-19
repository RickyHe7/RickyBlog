/// <reference types="astro/client" />

interface ImportMetaEnv {
  /**
   * 站点地址**不在这里配置** —— 唯一来源是 astro.config.mjs 的 CANONICAL_SITE。
   *
   * 历史：曾经有 `SITE_URL` 覆盖链（环境变量 > .env > 配置），2026-09-19 换域名时
   * 那条遗留的 Cloudflare 变量把新域名盖掉，线上 SEO 一直指错地址而本地构建正常，
   * 排查了很久。现在代码层面已禁用它，改为下面这个必须主动设置的开关。
   */
  readonly FORCE_SITE_URL?: string;

  /** Giscus 评论：四个值齐全才会渲染评论区块 */
  readonly PUBLIC_GISCUS_REPO?: string;
  readonly PUBLIC_GISCUS_REPO_ID?: string;
  readonly PUBLIC_GISCUS_CATEGORY?: string;
  readonly PUBLIC_GISCUS_CATEGORY_ID?: string;

  /** Umami 统计：两个值齐全才会注入脚本 */
  readonly PUBLIC_UMAMI_SRC?: string;
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;

  /** Buttondown 订阅：填写用户名才显示表单 */
  readonly PUBLIC_BUTTONDOWN_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
