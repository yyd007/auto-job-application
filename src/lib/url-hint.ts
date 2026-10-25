import { PlanError } from "./errors";

export function parseJobUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PlanError("Paste a job URL.");
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new PlanError("Paste a full http or https job URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PlanError("Only http or https links can be opened.");
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

const WIZARD_PATH = /user-info|userinfo|complete-profile|complete-your-profile/i;

export function hintForUrl(raw: string): UrlHint {
  let url: URL;
  try {
    url = parseJobUrl(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "This link could not be read.";
    return { ok: false, headline: "This link cannot be used", detail };
  }

  if (WIZARD_PATH.test(url.pathname)) {
    return {
      ok: true,
      headline: "This looks like a profile wizard, not the application",
      detail: "The link itself is a profile page. It will not be treated as the job application.",
    };
  }

  return {
    ok: true,
    headline: "Job link",
    detail:
      "Opens this link, follows a visible apply control, and reads the questions on the page. Stops at a login wall or a profile wizard. Does not submit.",
  };
}
