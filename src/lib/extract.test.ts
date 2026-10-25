import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { buildPlan } from "./plan";

const root = path.join(process.cwd(), "public");
let server: Server;
let origin = "";

before(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("no");
      return;
    }
    try {
      const body = await readFile(file);
      const type = file.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
      response.writeHead(200, { "content-type": type });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("missing");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  origin = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
});

describe("playwright runner", { concurrency: 1 }, () => {
  test("follows 立即投递, proposes answers, and does not submit", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/posting.html`);
    assert.equal(plan.submitted, false);
    assert.equal(plan.mutated, false);
    assert.equal(plan.applicationReached, true);
    assert.equal(plan.stoppedBecause, "form");
    assert.equal(plan.roleInChina, true);
    assert.match(plan.finalUrl, /form\.html$/);
    assert.doesNotMatch(plan.finalUrl, /thanks\.html/);
    assert.ok(plan.hops.some((hop) => hop.action.includes("立即投递")));

    const family = plan.answers.find((answer) => answer.label === "姓氏");
    const skills = plan.answers.find((answer) => answer.label === "技能");
    const ebest = plan.answers.find((answer) => answer.label.includes("eBest"));
    const english = plan.answers.find((answer) => answer.label === "英语熟练程度");
    const salary = plan.answers.find((answer) => answer.label.includes("期望薪资"));
    const district = plan.answers.find((answer) => answer.label.startsWith("区"));
    const verified = plan.answers.find((answer) => answer.label.includes("首选电子"));

    assert.equal(family?.value, "戴");
    assert.match(skills?.value ?? "", /PMP认证/);
    assert.match(skills?.value ?? "", /Snowflake/);
    assert.match(ebest?.value ?? "", /高流失风险门店/);
    assert.equal(english?.value, "流利");
    assert.equal(salary?.status, "missing");
    assert.ok(plan.missing.some((answer) => answer.label.includes("期望薪资")));
    assert.equal(district?.status, "unmapped");
    assert.equal(verified?.status, "leave-verified");
  });

  test("follows 提交简历 on an employer posting and still does not submit", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/employer-posting.html`);
    assert.equal(plan.submitted, false);
    assert.match(plan.finalUrl, /form\.html$/);
    assert.ok(plan.hops.some((hop) => hop.action.includes("提交简历")));
    assert.equal(plan.answers.find((answer) => answer.label === "名字")?.value, "杨阳");
  });

  test("stops when 立即投递 lands on a profile wizard", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/wizard-posting.html`);
    assert.equal(plan.stoppedBecause, "wizard-diversion");
    assert.equal(plan.applicationReached, false);
    assert.equal(plan.submitted, false);
    assert.equal(plan.mutated, false);
    assert.equal(plan.answers.length, 0);
    assert.doesNotMatch(plan.finalUrl, /thanks\.html/);
    assert.match(plan.finalUrl, /user-info/);
    assert.ok(plan.seenLabels.some((label) => label.includes("微信号")));
    assert.match(plan.warnings.join(" "), /向导/);
  });

  test("stops on a login wall without typing", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/login.html`);
    assert.equal(plan.stoppedBecause, "auth-wall");
    assert.equal(plan.applicationReached, false);
    assert.equal(plan.submitted, false);
    assert.equal(plan.mutated, false);
    assert.ok(plan.needsUser.some((answer) => answer.kind === "password"));
    assert.equal(plan.needsUser.every((answer) => answer.value === ""), true);
  });

  test("reads a form that is already open and ignores 提交申请", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/form.html`);
    assert.equal(plan.hops.length, 1);
    assert.match(plan.finalUrl, /form\.html$/);
    assert.equal(plan.submitted, false);
    assert.equal(plan.answers.find((answer) => answer.label === "性别")?.value, "女");
  });
});
