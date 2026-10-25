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
  const pathHit = /user-info|userinfo|complete-profile|complete-your-profile/i.test(url);
  const copyHit = /完善个人信息|完善简历|complete your profile|complete your resume|profile wizard/i.test(`${title} ${heading}`);
  return pathHit || copyHit;
}

async function pageFlags(page: Page): Promise<{ submitted: boolean; mutated: boolean }> {
  return page.evaluate(
    "({ submitted: Boolean(window.__submitted || window.__runnerSubmitted), mutated: Boolean(window.__mutated) })",
  );
}

/**
 * Opens a job URL, follows a visible apply control, and reads the visible
 * questions. It does not type and it does not submit.
 */
function browserLocale(preferred: string): string {
  const value = preferred.trim();
  return /^[a-zA-Z]{2,3}([_-][a-zA-Z0-9]{2,8})*$/.test(value) ? value : "en-US";
}

export async function extractForm(startUrl: string, preferredLocale = ""): Promise<Extraction> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (/executable|browserType\.launch/i.test(message)) {
      throw new PlanError("Playwright Chromium is not installed. Run npx playwright install chromium.");
    }
    throw new PlanError("The browser did not start. Nothing was submitted.");
  });

  const hops: Hop[] = [];
  const warnings: string[] = [];
  let submitted = false;
  let mutated = false;

  try {
    const context = await browser.newContext({
      locale: browserLocale(preferredLocale),
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
      throw new PlanError("The page did not open. Check the link and try again.");
    }
    await settle(page);

    let stoppedBecause: StopReason = "no-apply-control";
    let questions: ExtractedQuestion[] = [];
    let pageTitle = "";
    let heading = "";

    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      pageTitle = await page.title();
      heading = await page.locator("h1").first().innerText().catch(() => "");
      questions = await readQuestions(page);
      const flags = await pageFlags(page);
      submitted = submitted || flags.submitted;
      mutated = mutated || flags.mutated;
      if (hop === 0) hops.push({ url: page.url(), action: "Opened this link" });

      if (isWizard(page.url(), pageTitle, heading)) {
        stoppedBecause = "wizard-diversion";
        warnings.push("Stopped. This page is a profile wizard, not the job application.");
        break;
      }

      const passwordVisible = questions.some((question) => question.kind === "password");
      if (passwordVisible) {
        stoppedBecause = "auth-wall";
        warnings.push("Stopped. This is a login page. Passwords and codes are not filled in.");
        break;
      }

      const apply = await findApplyControl(page);
      const fieldCount = questions.filter((question) => question.kind !== "password").length;
      if (!apply || fieldCount >= 3) {
        stoppedBecause = fieldCount > 0 ? "form" : "no-apply-control";
        if (fieldCount === 0) warnings.push("No application form and no apply control on this page.");
        break;
      }

      const action = `Followed “${apply.label}”.`;
      const previous = page.url();
      page = await followApply(page, apply.locator);
      const flagsAfter = await pageFlags(page);
      submitted = submitted || flagsAfter.submitted;
      mutated = mutated || flagsAfter.mutated;
      hops.push({ url: page.url(), action });
      if (page.url() === previous) {
        const appeared = await readQuestions(page);
        if (appeared.length < 3) {
          warnings.push("The apply control did not open a new form.");
          questions = appeared;
          stoppedBecause = appeared.length > 0 ? "form" : "no-apply-control";
          break;
        }
      }
      if (hop === MAX_HOPS - 1) {
        stoppedBecause = "max-hops";
        questions = await readQuestions(page);
        warnings.push("Followed apply controls several times without reaching a stable form. Stopped.");
      }
    }

    pageTitle = await page.title();
    const flags = await pageFlags(page);
    submitted = submitted || flags.submitted;
    mutated = mutated || flags.mutated;
    if (submitted) warnings.unshift("A submit event fired. Do not use this result.");
    if (mutated) warnings.unshift("The page received input. The runner does not type. Do not use this result.");

    return {
      startUrl,
      finalUrl: page.url(),
      pageTitle,
      hops,
      stoppedBecause,
      warnings,
      questions,
      submitted,
      mutated,
    };
  } finally {
    await browser.close();
  }
}
