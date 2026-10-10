import type { en } from './en.js';

/** 英文包定义宣传文案契约，其他语言必须完整翻译全部键。 */
export type SiteMessages = { [Key in keyof typeof en]: string };
