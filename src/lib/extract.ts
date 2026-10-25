import { chromium, type Frame, type Locator, type Page } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PlanError } from "./errors";
import type { ExtractedQuestion, Extraction, Hop, StopReason } from "./types";

const APPLY_LABELS = [
  "立即投递",
  "提交简历",
  "申请该职位",
  "申请职位",
  "立即申请",
  "我要申请",
  "apply for this job",
  "apply now",
  "apply",
];

const SUBMIT_LABELS = new Set([
  "提交申请",
  "确认并提交",
  "确认提交",
  "提交",
  "发送申请",
  "保存并提交",
  "submit application",
  "submit",
  "send application",
]);

const MAX_HOPS = 3;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[›»→>]/g, "").trim().toLowerCase();
}

function isApplyLabel(value: string): boolean {
  const text = clean(value);
  return APPLY_LABELS.some((label) => text === label);
}

function isSubmitLabel(value: string): boolean {
  return SUBMIT_LABELS.has(clean(value));
}

const scrapeSource = readFileSync(fileURLToPath(new URL("./scrape-questions.js", import.meta.url)), "utf8");

async function runScrape(target: Page | Frame): Promise<ExtractedQuestion[]> {
  const expression = `(() => {\n${scrapeSource}\nreturn scrapeQuestions();\n})()`;
  return target.evaluate(expression);
}

async function readQuestions(page: Page): Promise<ExtractedQuestion[]> {
  const questions = await runScrape(page);
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      const more = await runScrape(frame);
      questions.push(...more);
    } catch {
      // Cross-origin frames are left unread.
    }
  }
  return questions;
}

async function controlText(locator: Locator): Promise<string> {
  const inner = await locator.innerText().catch(() => "");
  const aria = (await locator.getAttribute("aria-label")) || "";
  const value = (await locator.getAttribute("value")) || "";
  const title = (await locator.getAttribute("title")) || "";
  return [inner, aria, value, title].map((item) => item.trim()).find((item) => isApplyLabel(item) || isSubmitLabel(item)) || inner || aria || value || title;
}

async function findApplyControl(page: Page): Promise<{ locator: Locator; label: string } | null> {
  const locators = await page.locator("a, button, [role=button], input[type=button]").all();
  const found: { locator: Locator; label: string; rank: number }[] = [];
  for (const locator of locators) {
    if (!(await locator.isVisible().catch(() => false))) continue;
    if (await locator.isDisabled().catch(() => false)) continue;
    const raw = await controlText(locator);
    if (!raw || isSubmitLabel(raw) || !isApplyLabel(raw)) continue;
    const type = ((await locator.getAttribute("type")) || "").toLowerCase();
    const insideForm = await locator.evaluate((node) => Boolean(node.closest("form")));
    if (type === "submit" && insideForm) continue;
    const rank = APPLY_LABELS.findIndex((label) => clean(raw) === label);
    found.push({ locator, label: raw.replace(/\s+/g, " ").trim(), rank: rank < 0 ? 99 : rank });
  }
  found.sort((a, b) => a.rank - b.rank);
  return found[0] ?? null;
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => undefined);
}

async function followApply(page: Page, control: Locator): Promise<Page> {
  const context = page.context();
  const popupPromise = context.waitForEvent("page", { timeout: 1200 }).catch(() => null);
  const before = page.url();
  await control.click({ timeout: 5000 });
  const popup = await popupPromise;
  if (popup) {
    await settle(popup);
    return popup;
  }
  await page.waitForFunction(`window.location.href !== ${JSON.stringify(before)}`, null, { timeout: 8000 }).catch(() => undefined);
  await settle(page);
  return page;
}

function isWizard(url: string, title: string, heading: string): boolean {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = "";
  }
  const onWaiqi = /(^|\.)waiqi\.com$/.test(host);
  const pathHit = /user-info|userinfo/i.test(url);
  const copyHit = /完善个人信息|完善简历|神仙外企/.test(`${title} ${heading}`);
  if (onWaiqi && (pathHit || copyHit)) return true;
  return pathHit && copyHit;
}

function roleInChina(url: string, sample: string): boolean | null {
  if (/\/zh-cn(\/|$)/i.test(url) || /中国|上海|北京|深圳|广州|杭州|成都|china|shanghai|beijing|shenzhen|greater china/i.test(sample)) {
    return true;
  }
  if (/united states|\busa\b|united kingdom|london|singapore|新加坡|欧洲/i.test(sample)) return false;
  return null;
}

async function pageFlags(page: Page): Promise<{ submitted: boolean; mutated: boolean }> {
  return page.evaluate(
    "({ submitted: Boolean(window.__submitted || window.__runnerSubmitted), mutated: Boolean(window.__mutated) })",
  );
}

/**
 * Opens a job URL, follows 立即投递 or the employer apply button, and reads
 * the visible questions. It does not type and it does not submit.
 */
export async function extractForm(startUrl: string): Promise<Extraction> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (/executable|browserType\.launch/i.test(message)) {
      throw new PlanError("没有找到 Playwright Chromium。先运行 npx playwright install chromium。");
    }
    throw new PlanError("浏览器没有启动。页面没有提交。");
  });

  const hops: Hop[] = [];
  const warnings: string[] = [];
  let submitted = false;
  let mutated = false;

  try {
    const context = await browser.newContext({
      locale: "zh-CN",
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(`
      window.__runnerSubmitted = false;
      document.addEventListener("submit", function (event) {
        window.__runnerSubmitted = true;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    `);
    let page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("dialog", (dialog) => {
      void dialog.dismiss();
    });

    try {
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch {
      throw new PlanError("页面没有打开。检查链接，或稍后再试。");
    }
    await settle(page);

    let stoppedBecause: StopReason = "no-apply-control";
    let questions: ExtractedQuestion[] = [];
    let pageTitle = "";
    let heading = "";
    let sample = "";

    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      pageTitle = await page.title();
      heading = await page.locator("h1").first().innerText().catch(() => "");
      const body = await page.locator("body").innerText().catch(() => "");
      sample = `${pageTitle}\n${heading}\n${body}`.slice(0, 4000);
      questions = await readQuestions(page);
      const flags = await pageFlags(page);
      submitted = submitted || flags.submitted;
      mutated = mutated || flags.mutated;
      if (hop === 0) hops.push({ url: page.url(), action: "打开这个链接" });

      if (isWizard(page.url(), pageTitle, heading)) {
        stoppedBecause = "wizard-diversion";
        warnings.push("停住了。这是神仙外企的资料向导（/user-info 一类），不是这份职位的申请。");
        break;
      }

      const passwordVisible = questions.some((question) => question.kind === "password");
      const loginCopy = /登录|sign in|log in|apple id|密码/i.test(`${pageTitle} ${heading}`);
      if (passwordVisible && loginCopy) {
        stoppedBecause = "auth-wall";
        warnings.push("停住了。这是登录页。不会填写密码、验证码或账号。");
        break;
      }

      const apply = await findApplyControl(page);
      const fieldCount = questions.filter((question) => question.kind !== "password").length;
      if (!apply || fieldCount >= 3) {
        stoppedBecause = fieldCount > 0 ? "form" : "no-apply-control";
        if (fieldCount === 0) warnings.push("这一页没有找到申请表，也没有可跟随的「立即投递」或申请按钮。");
        break;
      }

      const action = clean(apply.label) === "立即投递"
        ? "点击「立即投递」。这一步应该离开帖子，进入雇主的申请页。"
        : `点击「${apply.label}」。`;
      const previous = page.url();
      page = await followApply(page, apply.locator);
      const flagsAfter = await pageFlags(page);
      submitted = submitted || flagsAfter.submitted;
      mutated = mutated || flagsAfter.mutated;
      hops.push({ url: page.url(), action });
      if (page.url() === previous) {
        const appeared = await readQuestions(page);
        if (appeared.length < 3) {
          warnings.push("点了申请按钮，但页面没有进入新的申请表。");
          questions = appeared;
          stoppedBecause = appeared.length > 0 ? "form" : "no-apply-control";
          break;
        }
      }
      if (hop === MAX_HOPS - 1) {
        stoppedBecause = "max-hops";
        questions = await readQuestions(page);
        warnings.push("已经跟随了申请按钮，但还没停在一张稳定的表上。没有继续点。");
      }
    }

    pageTitle = await page.title();
    const flags = await pageFlags(page);
    submitted = submitted || flags.submitted;
    mutated = mutated || flags.mutated;
    if (submitted) warnings.unshift("运行器触发了提交。这违反规则，不要使用这份结果。");
    if (mutated) warnings.unshift("页面出现了输入。运行器不应该打字。不要使用这份结果。");

    return {
      startUrl,
      finalUrl: page.url(),
      pageTitle,
      hops,
      stoppedBecause,
      warnings,
      roleInChina: roleInChina(page.url(), sample),
      questions,
      submitted,
      mutated,
    };
  } finally {
    await browser.close();
  }
}
