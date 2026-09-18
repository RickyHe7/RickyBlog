/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_URL?: string;

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
