import { PlanError } from "./errors";

export function parseJobUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PlanError("请贴上职位链接。");
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new PlanError("请贴上完整的 http 或 https 职位链接。");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PlanError("只打开 http 或 https 链接。");
  }
  url.username = "";
  url.password = "";
  url.hash = "";
  return url;
}

export type UrlHint = {
  ok: boolean;
  headline: string;
  detail: string;
};

export function hintForUrl(raw: string): UrlHint {
  let url: URL;
  try {
    url = parseJobUrl(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "链接无法识别。";
    return { ok: false, headline: "链接还不能用", detail };
  }

  const host = url.hostname.toLowerCase();
  if (/(^|\.)waiqi\.com$/.test(host)) {
    if (/user-info|userinfo/i.test(url.pathname)) {
      return {
        ok: true,
        headline: "这是神仙外企资料向导，不是职位申请",
        detail: "链接落在 /user-info。不会把这份资料向导当成某份职位的申请表。",
      };
    }
    return {
      ok: true,
      headline: "神仙外企聚合页",
      detail:
        "会点击「立即投递」，这一步应该离开帖子去雇主的申请站。如果落到 /user-info 资料向导，就停，不当成这份申请。",
    };
  }
  if (/(^|\.)apple\.com$/.test(host)) {
    return {
      ok: true,
      headline: "Apple 招聘页",
      detail:
        "职位页上的申请按钮一般是「提交简历」。遇到登录就停。页面上已经验证的邮箱保持不动。",
    };
  }
  if (/user-info|userinfo/i.test(url.pathname)) {
    return {
      ok: true,
      headline: "这像资料向导，不是职位申请",
      detail: "链接本身落在 user-info。不会把它当成某份职位的申请表。",
    };
  }
  return {
    ok: true,
    headline: "雇主或其它招聘页",
    detail:
      "会打开链接，寻找「立即投递」或公司的申请按钮，只读取当时看得见的问题。",
  };
}
